import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Modal,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

export default function DeletedPins() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchPins();
  }, []);

  const fetchPins = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "deleted_pins"));
      let list = snap.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      setPins(list);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch deleted pins.");
    }
    setLoading(false);
  };

  const handlePinPress = (item) => {
    setSelectedMedia(item.media || []);
    setMediaModalVisible(true);
  };

  const renderPinItem = ({ item }) => (
    <TouchableOpacity onPress={() => handlePinPress(item)}>
      <View style={styles.pinCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pinTitle}>{item.description}</Text>
          <Text style={styles.pinDetail}>
            Category: {item.category || "Unknown"}
          </Text>
          <Text style={styles.pinDetail}>
            Upvotes: {item.upvotes || 0}
          </Text>
          <Text style={styles.pinDetail}>
            Downvotes: {item.downvotes || 0}
          </Text>
          <Text style={styles.pinDetail}>
            Barangay: {item.barangay || "N/A"}
          </Text>
          <Text style={styles.pinDetail}>
            Deleted At: {item.deletedAt ? item.deletedAt : "N/A"}
          </Text>
          {/* Show Messages Button */}
          <TouchableOpacity
            style={styles.showMessagesBtn}
            onPress={() => navigation.navigate("PinMessages", { pinId: item.id })}
          >
            <Icon name="chatbubble-ellipses-outline" size={18} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.showMessagesText}>Show Messages</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#888" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Deleted Pins</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#888" />
        ) : pins.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            No deleted pins found.
          </Text>
        ) : (
          <FlatList
            data={pins}
            keyExtractor={(item) => item.id}
            renderItem={renderPinItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Media Modal */}
      <Modal visible={mediaModalVisible} transparent animationType="slide">
        <View style={styles.mediaModalOverlay}>
          <View style={styles.mediaModalContent}>
            <Text style={styles.mediaModalTitle}>Pin Media</Text>
            {selectedMedia.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#888" }}>
                No media available.
              </Text>
            ) : (
              <FlatList
                data={selectedMedia}
                keyExtractor={(item, idx) => idx.toString()}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item.url }}
                    style={styles.mediaImage}
                    resizeMode="contain"
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ alignItems: "center" }}
              />
            )}
            <TouchableOpacity
              style={styles.closeMediaBtn}
              onPress={() => setMediaModalVisible(false)}
            >
              <Text style={styles.closeMediaText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#888",
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  pinCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    borderColor: "#888",
  },
  pinTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  pinDetail: { fontSize: 13, color: "#555", marginTop: 2 },
  mediaModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    alignItems: "center",
  },
  mediaModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  mediaImage: {
    width: 220,
    height: 220,
    marginHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  closeMediaBtn: {
    marginTop: 18,
    backgroundColor: "#888",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  closeMediaText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  showMessagesBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f6f5",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#888",
  },
  showMessagesText: {
    color: "#888",
    fontWeight: "bold",
    fontSize: 14,
  },
});