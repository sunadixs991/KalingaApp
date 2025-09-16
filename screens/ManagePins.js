import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";

// Add Picker import
import { Picker } from "@react-native-picker/picker";

export default function ManagePins() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [filter, setFilter] = useState("All");
  const navigation = useNavigation();

  useEffect(() => {
    fetchPins();
  }, []);

  const fetchPins = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "pins"));
      let list = snap.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      setPins(list);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch pins.");
    }
    setLoading(false);
  };

  const getFilteredPins = () => {
    if (filter === "Most Relevant") {
      return [...pins].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }
    if (filter === "Newest") {
      return [...pins].sort((a, b) => {
        const aDate = a.createdAt?.seconds || 0;
        const bDate = b.createdAt?.seconds || 0;
        return bDate - aDate;
      });
    }
    // Default: All, sorted by downvotes
    return [...pins].sort((a, b) => (b.downvotes || 0) - (a.downvotes || 0));
  };

  const handleDeletePin = (pinId) => {
    Alert.alert(
      "Delete Pin",
      "Are you sure you want to delete this pin?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "pins", pinId));
              setPins((prev) => prev.filter((p) => p.id !== pinId));
            } catch (e) {
              Alert.alert("Error", "Failed to delete pin.");
            }
          },
        },
      ]
    );
  };

  const handlePinPress = (item) => {
    setSelectedMedia(item.media || []);
    setMediaModalVisible(true);
  };

  // Right swipe delete for pin (same style as ManageBarangay)
  const renderRightActions = (onDelete) => (
    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
      <Icon name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const renderPinItem = ({ item }) => (
    <Swipeable
      renderRightActions={() =>
        renderRightActions(() => handleDeletePin(item.id))
      }
    >
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
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#EC6135" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Pins</Text>
        <View style={styles.backButton} />
      </View>

      {/* Dropdown Filter */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Sort by:</Text>
        <Picker
          selectedValue={filter}
          style={styles.picker}
          onValueChange={(value) => setFilter(value)}
          mode="dropdown"
        >
          <Picker.Item label="All" value="All" />
          <Picker.Item label="Most Relevant" value="Most Relevant" />
          <Picker.Item label="Newest" value="Newest" />
        </Picker>
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#EC6135" />
        ) : getFilteredPins().length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            No pins found.
          </Text>
        ) : (
          <FlatList
            data={getFilteredPins()}
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
              style={styles.showMessagesBtn}
              onPress={() => {
                setMediaModalVisible(false);
       navigation.navigate("PinMessages", { pinId: pins.find(p => p.media === selectedMedia)?.id });
              }}
            >
              <Text style={styles.showMessagesText}>Show Messages</Text>
            </TouchableOpacity>
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
    backgroundColor: "#EC6135",
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterLabel: {
    fontSize: 15,
    color: "#333",
    marginRight: 10,
    fontWeight: "bold",
  },
  picker: {
    flex: 1,
    height: 54, // Increased height for better visibility
    backgroundColor: "#fff",
    color: "#333",
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
  },
  pinTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  pinDetail: { fontSize: 13, color: "#555", marginTop: 2 },
  deleteButton: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    borderRadius: 8,
    marginBottom: 12,
    marginLeft: 10,
  },
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
    backgroundColor: "#EC6135",
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
    marginTop: 10,
    backgroundColor: "#49A5A2",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  showMessagesText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});