import React, { useEffect, useState } from "react";
import { Modal } from "react-native";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import * as Location from "expo-location";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

// Import functions individually to test
import { fetchNearbyPins } from "../services/PinService";

// Simple PinCard component defined inline to avoid import issues
const SimplePinCard = ({ pin, onPress }) => (
  <TouchableOpacity
    style={{
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
      elevation: 3,
    }}
    onPress={() => onPress && onPress(pin)}
  >
    <Text style={{ fontWeight: "bold", marginBottom: 8, fontSize: 15, color: '#e75e33'}}>{pin.category}</Text>
    <Text style={{ marginBottom: 8 }}>{pin.description}</Text>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontWeight: "bold", marginBottom: 8}}>Posted by: {pin.userFirstName}</Text>
      <Text style={{color: '#49A5A2'}}>{pin.formattedDistance}</Text>
    </View>
    <Text style={{ fontWeight: "bold" }}>
      👍{pin.upvotes || 0} 👎{pin.downvotes || 0}
    </Text>
  </TouchableOpacity>
);

export default function HomeScreen({ route, navigation }) {
  const username = route?.params?.username;
  const [userInfo, setUserInfo] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [nearbyPins, setNearbyPins] = useState([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);

  // Test the import
  // useEffect(() => {
  //   console.log("fetchNearbyPins function:", fetchNearbyPins);
  //   console.log("typeof fetchNearbyPins:", typeof fetchNearbyPins);
  // }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUserInfo(querySnapshot.docs[0].data());
        }
      } catch (error) {
        // console.error("Error fetching user info:", error);
      }
    };

    if (username) {
      fetchUserInfo();
    }
  }, [username]);

  // Fetch device location and place name
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location Permission",
            "Location permission is required to show nearby resources."
          );
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);

        // Reverse geocode to get place name
        let places = await Location.reverseGeocodeAsync(loc.coords);
        if (places && places.length > 0) {
          const place = places[0];
          setPlaceName(
            [
              place.street,
              place.district,
              place.city,
              place.subregion,
              place.country,
            ]
              .filter(Boolean)
              .join(", ")
          );
        }
      } catch (error) {
        // console.error("Error getting location:", error);
        Alert.alert("Error", "Failed to get your location. Please try again.");
      }
    })();
  }, []);

  // Fetch nearby pins when location is available
  useEffect(() => {
    if (currentLocation) {
      fetchNearbyPinsData();
    }
  }, [currentLocation]);

  const fetchNearbyPinsData = async () => {
    if (!currentLocation) return;

    setLoadingPins(true);
    try {
      // console.log("About to call fetchNearbyPins...");
      const pins = await fetchNearbyPins(currentLocation, 50, 10); // 50km radius, max 10 pins
      // console.log("fetchNearbyPins returned:", pins);
      setNearbyPins(pins);
    } catch (error) {
      // console.error("Error fetching nearby pins:", error);
      Alert.alert(
        "Error",
        "Failed to load nearby resources. Please try again."
      );
    } finally {
      setLoadingPins(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNearbyPinsData();
    setRefreshing(false);
  };

  const handlePinPress = (pin) => {
    setSelectedPin(pin);
    setPinModalVisible(true);
  };

  const renderNearbyResources = () => {
    if (loadingPins) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e75e33" />
          <Text style={styles.loadingText}>Finding nearby resources...</Text>
        </View>
      );
    }

    if (!currentLocation) {
      return (
        <View style={styles.noLocationContainer}>
          <Icon name="location-outline" size={48} color="#ccc" />
          <Text style={styles.noLocationText}>Location access required</Text>
          <Text style={styles.noLocationSubtext}>
            Please enable location to see nearby resources
          </Text>
        </View>
      );
    }

    if (nearbyPins.length === 0) {
      return (
        <View style={styles.noPinsContainer}>
          <Icon name="map-outline" size={48} color="#ccc" />
          <Text style={styles.noPinsText}>No nearby resources found</Text>
          <Text style={styles.noPinsSubtext}>
            Be the first to add a resource in your area!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.pinsContainer}>
        {nearbyPins.map((pin) => (
          <SimplePinCard key={pin.id} pin={pin} onPress={handlePinPress} />
        ))}

        {nearbyPins.length >= 10 && (
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => navigation.navigate("Map")}
          >
            <Text style={styles.viewMoreText}>View all on map</Text>
            <Icon name="chevron-forward" size={16} color="#e75e33" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={16} color="#fff" />
            <Text style={styles.locationText}>
              {placeName ? placeName : "Getting your location..."}
            </Text>
          </View>
          <TouchableOpacity>
            <Icon name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#e75e33"]}
              tintColor="#e75e33"
            />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeContainer}>
            <View style={styles.profilePlaceholder} />
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {userInfo && userInfo.firstName
                  ? userInfo.firstName
                  : "Citizen"}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.searchIcon}>
              <Icon name="search" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("FoodDistribution")}
              >
                <Image
                  source={require("../assets/Kalinga_logo.png")}
                  style={styles.cardImage}
                />
                <Text style={styles.cardText}>Food Distribution Schedules</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.card}
                onPress={() =>navigation.navigate("MedicalSupport")}
              >
                <Image
                  source={require("../assets/Kalinga_logo.png")}
                  style={styles.cardImage}
                />
                <Text style={styles.cardText}>Medical Support Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate("EvacuationCenters")}
              >
                <View style={[styles.cardImage, styles.placeholder]} />
                <Text style={styles.cardText}>Evacuation Centers</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nearby Resources */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Resources</Text>
              {nearbyPins.length > 0 && (
                <TouchableOpacity
                  onPress={handleRefresh}
                  disabled={loadingPins}
                >
                  <Icon
                    name="refresh"
                    size={20}
                    color={loadingPins ? "#ccc" : "#e75e33"}
                  />
                </TouchableOpacity>
              )}
            </View>
            {renderNearbyResources()}
            {selectedPin && (
              <Modal
                visible={pinModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPinModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    {/* Close Button */}
                    <TouchableOpacity
                      onPress={() => setPinModalVisible(false)}
                      style={styles.closeIcon}
                    >
                      <Icon name="close" size={30} color="#666" />
                    </TouchableOpacity>

                    {/* Content */}
                    <Text style={styles.modalTitle}>
                      {selectedPin.userFirstName}
                    </Text>
                    <Text style={styles.modalDescription}>
                      {selectedPin.description}
                    </Text>
                    <Text style={styles.modalCategory}>
                       {selectedPin.category}
                    </Text>
                    <Text style={styles.modalDistance}>
                      Distance: {selectedPin.formattedDistance}
                    </Text>
                    <Text style={styles.modalMeta}>
                      👍{selectedPin.upvotes || 0} 👎
                      {selectedPin.downvotes || 0}
                    </Text>

                    {/* View on Map Button */}
                    <TouchableOpacity
                      onPress={() => {
                        setPinModalVisible(false);
                        navigation.navigate("Map", {
                          focusPin: {
                            latitude: selectedPin.latitude,
                            longitude: selectedPin.longitude,
                            id: selectedPin.id,
                          },
                        });
                      }}
                      style={styles.viewMapButton}
                    >
                      <Icon
                        name="eye-outline"
                        size={20}
                        color="#fff"
                        style={styles.viewMapIcon}
                      />
                      <Text style={styles.viewMapText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    height: hp("100%"),
    width: wp("100%"),
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#e75e33",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: wp("4%"),
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    color: "#fff",
    marginLeft: 4,
    fontWeight: "bold",
    fontSize: wp("3.5%"),
    flexShrink: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: wp("4%"),
    paddingBottom: hp("0.5%"),
  },
  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  profilePlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: "#ccc",
    borderRadius: 10,
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: "#333",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: hp("2%"),
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
  },
  searchIcon: {
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginLeft: 4,
  },
  section: {
    marginBottom: hp("3%"),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  card: {
    width: wp("44%"),
    height: wp("44%"),
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: wp("5%"),
    alignItems: "center",
    elevation: 3,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: 15,
    marginBottom: 7,
  },
  cardText: {
    fontSize: 13,
    textAlign: "center",
  },
  placeholder: {
    backgroundColor: "#e1e1e1",
  },
  // Nearby Resources Styles
  pinsContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("4%"),
  },
  loadingText: {
    marginTop: hp("1%"),
    fontSize: wp("3.5%"),
    color: "#666",
  },
  noLocationContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("4%"),
  },
  noLocationText: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#666",
    marginTop: hp("1%"),
  },
  noLocationSubtext: {
    fontSize: wp("3.2%"),
    color: "#999",
    textAlign: "center",
    marginTop: hp("0.5%"),
  },
  noPinsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("4%"),
  },
  noPinsText: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#666",
    marginTop: hp("1%"),
  },
  noPinsSubtext: {
    fontSize: wp("3.2%"),
    color: "#999",
    textAlign: "center",
    marginTop: hp("0.5%"),
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("1.5%"),
    marginTop: hp("1%"),
  },
  viewMoreText: {
    fontSize: wp("3.5%"),
    color: "#e75e33",
    fontWeight: "600",
    marginRight: wp("1%"),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
    position: "relative",
  },
  closeIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
  },
  modalCategory: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    color: '#EC6135',
    fontWeight: '600',
    backgroundColor: '#FFF3F0',
    paddingVertical: 7,
    borderRadius: 12,
  },
  modalDescription: {
    marginBottom: 12,
    color: "#333",
  },
  modalMeta: {
    marginBottom: 4,
    color: "#555",
    fontSize: 16,
    paddingLeft: 8,
    fontWeight: "bold",
    alignSelf: "center",
  },
  modalDistance: {
    fontSize: 14,
    color: "#49A5A2",
    marginBottom: 12,
    fontWeight: 600,
    paddingLeft: 8,
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#e75e33",
  },
  viewMapIcon: {
    marginRight: 6,
  },
  viewMapText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
