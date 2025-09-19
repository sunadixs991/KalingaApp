import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import * as Location from "expo-location"; // Add this import

export default function EvacuationCenters() {
  const navigation = useNavigation();
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [centerModalVisible, setCenterModalVisible] = useState(false);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (currentLocation) fetchCenters();
  }, [currentLocation]);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentLocation(null);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
    } catch (e) {
      setCurrentLocation(null);
    }
  };

  function getDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula
    function toRad(x) {
      return (x * Math.PI) / 180;
    }
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const fetchCenters = async () => {
    setLoading(true);
    try {
      // Only fetch evacuation centers with category "Evacuation Center"
      const q = query(
        collection(db, "evacuation_pins"),
        where("category", "==", "Evacuation Center")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((docu) => {
        const data = docu.data();
        let distance = null;
        if (
          currentLocation &&
          data.latitude &&
          data.longitude
        ) {
          distance = getDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            data.latitude,
            data.longitude
          );
        }
        return {
          id: docu.id,
          name: data.facilityName || data.description || "Evacuation Center", // <-- updated
          address: data.barangay
            ? `${data.barangay}${data.purok ? ", Purok " + data.purok : ""}${data.sitio ? ", Sitio " + data.sitio : ""}`
            : "Unknown Address", // <-- updated to include Sitio
          capacity: data.capacity ? `${data.capacity} people` : "N/A",
          status: data.status || "Open",
          distance: distance !== null ? `${distance.toFixed(2)} km` : "N/A",
          latitude: data.latitude,
          longitude: data.longitude,
          purok: data.purok || "",   // <-- added for modal
          sitio: data.sitio || "",   // <-- added for modal
        };
      });
      setCenters(list);
    } catch (error) {
      setCenters([]);
    }
    setLoading(false);
  };

  const handleCenterPress = (center) => {
    setSelectedCenter(center);
    setCenterModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Evacuation Centers</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1976D2"
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={centers}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleCenterPress(item)}>
                <View style={styles.cardRow}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardText}>📍 {item.address}</Text>
                    <Text style={styles.cardText}>👥 {item.capacity}</Text>
                    <Text
                      style={[
                        styles.cardText,
                        {
                          color:
                            item.status === "Full" ? "#e75e33" : "#49A5A2",
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                    <Text style={styles.cardText}>
                      <Icon name="walk-outline" size={16} color="#1976D2" /> {item.distance}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        <Text style={styles.info}>
          Stay updated on evacuation center availability and capacity.
        </Text>
      </View>

      {/* Modal for selected center */}
      <Modal
        visible={centerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCenterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              onPress={() => setCenterModalVisible(false)}
              style={styles.closeIcon}
            >
              <Icon name="close" size={22} color="#666" />
            </TouchableOpacity>
            {selectedCenter && (
              <>
                <Text style={styles.modalTitle}>{selectedCenter.name}</Text>
                <Text style={styles.modalDescription}>{selectedCenter.address}</Text>
                {/* Show Purok and Sitio if available */}
                {selectedCenter.purok ? (
                  <Text style={styles.modalCategory}>Purok: {selectedCenter.purok}</Text>
                ) : null}
                {selectedCenter.sitio ? (
                  <Text style={styles.modalCategory}>Sitio: {selectedCenter.sitio}</Text>
                ) : null}
                <Text style={styles.modalCategory}>{selectedCenter.capacity}</Text>
                <Text style={styles.modalMeta}>{selectedCenter.status}</Text>
                <Text style={styles.modalDistance}>
                  <Icon name="walk-outline" size={16} color="#1976D2" /> {selectedCenter.distance}
                </Text>
                <TouchableOpacity
                  style={styles.viewMapButton}
                  onPress={() => {
                    setCenterModalVisible(false);
                    navigation.navigate("MainTabs", {
                      screen: "Map",
                      params: {
                        focusPin: {
                          latitude: selectedCenter.latitude,
                          longitude: selectedCenter.longitude,
                          id: selectedCenter.id,
                        },
                      },
                    });
                  }}
                >
                  <Icon name="eye-outline" size={20} color="#fff" style={styles.viewMapIcon} />
                  <Text style={styles.viewMapText}>View on Map</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  info: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#e3f6f5",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  closeIcon: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: "#333",
    marginBottom: 12,
  },
  modalCategory: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1976D2",
    marginBottom: 8,
  },
  modalMeta: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  modalDistance: {
    fontSize: 14,
    color: "#333",
    marginBottom: 16,
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1976D2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  viewMapIcon: {
    marginRight: 8,
  },
  viewMapText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
});
