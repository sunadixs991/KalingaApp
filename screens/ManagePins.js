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
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { Picker } from "@react-native-picker/picker";
import MapPinModal from "../components/MapPinModal";

export default function ManagePins() {
  const [pins, setPins] = useState([]);
  const [requestPins, setRequestPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // 0 = pins, 1 = request_pins
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [filter, setFilter] = useState("All");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMedia, setEditMedia] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchAllPins();
  }, []);

  const fetchAllPins = async () => {
    setLoading(true);
    try {
      // Fetch regular pins
      const pinsSnap = await getDocs(collection(db, "pins"));
      const pinsList = pinsSnap.docs.map((docu) => ({
        id: docu.id,
        type: "pin",
        ...docu.data(),
      }));
      setPins(pinsList);

      // Fetch request pins
      const reqPinsSnap = await getDocs(collection(db, "request_pins"));
      const reqPinsList = reqPinsSnap.docs.map((docu) => ({
        id: docu.id,
        type: "request_pin",
        ...docu.data(),
      }));
      setRequestPins(reqPinsList);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch pins.");
    }
    setLoading(false);
  };

  const getFilteredPins = () => {
    const dataSource = activeTab === 0 ? pins : requestPins;
    if (filter === "Most Relevant") {
      return [...dataSource].sort(
        (a, b) => (b.upvotes || 0) - (a.upvotes || 0)
      );
    }
    if (filter === "Newest") {
      return [...dataSource].sort((a, b) => {
        const aDate = a.createdAt?.seconds || 0;
        const bDate = b.createdAt?.seconds || 0;
        return bDate - aDate;
      });
    }
    return [...dataSource].sort(
      (a, b) => (b.downvotes || 0) - (a.downvotes || 0)
    );
  };

  const handleEdit = (pin) => {
    setSelectedPin(pin);
    setEditCategory(pin.category || pin.supplyType || "");
    setEditDescription(pin.description || "");
    setEditMedia(pin.media || []);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPin) return;
    try {
      const collectionName =
        selectedPin.type === "request_pin" ? "request_pins" : "pins";
      await updateDoc(doc(db, collectionName, selectedPin.id), {
        category: editCategory,
        supplyType: editCategory,
        description: editDescription,
        media: editMedia,
      });
      setEditModalVisible(false);
      setSelectedPin(null);
      setEditMedia([]);
      fetchAllPins();
      Alert.alert("Success", "Pin updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update pin.");
    }
  };

  const handleDeletePin = (pinId, pinType) => {
    Alert.alert("Delete Pin", "Are you sure you want to delete this pin?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const collectionName =
              pinType === "request_pin" ? "request_pins" : "pins";
            await deleteDoc(doc(db, collectionName, pinId));
            if (pinType === "request_pin") {
              setRequestPins((prev) => prev.filter((p) => p.id !== pinId));
            } else {
              setPins((prev) => prev.filter((p) => p.id !== pinId));
            }
          } catch (e) {
            Alert.alert("Error", "Failed to delete pin.");
          }
        },
      },
    ]);
  };

  const handlePinPress = (item) => {
    setSelectedMedia(item.media || []);
    setMediaModalVisible(true);
  };

  const renderLeftActions = (onEdit) => (
    <TouchableOpacity style={styles.editButton} onPress={onEdit}>
      <Icon name="pencil" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const renderRightActions = (onDelete) => (
    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
      <Icon name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const renderPinItem = ({ item }) => (
    <Swipeable
      renderLeftActions={() => renderLeftActions(() => handleEdit(item))}
      renderRightActions={() =>
        renderRightActions(() => handleDeletePin(item.id, item.type))
      }
    >
      <TouchableOpacity onPress={() => handlePinPress(item)}>
        <View style={styles.pinCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pinTitle}>{item.description}</Text>
            <Text style={styles.pinDetail}>
              Category: {item.category || item.supplyType || "Unknown"}
            </Text>
            <Text style={styles.pinDetail}>Upvotes: {item.upvotes || 0}</Text>
            <Text style={styles.pinDetail}>
              Downvotes: {item.downvotes || 0}
            </Text>
            <Text style={styles.pinDetail}>
              Barangay: {item.barangay || "N/A"}
            </Text>
            {item.numberOfPeople && (
              <Text style={styles.pinDetail}>
                People: {item.numberOfPeople}
              </Text>
            )}
            {item.urgency && (
              <Text style={styles.pinDetail}>Urgency: {item.urgency}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const displayData = getFilteredPins();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#EC6135" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Pins</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text
            style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}
          >
            Pins ({pins.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.tabActive]}
          onPress={() => setActiveTab(1)}
        >
          <Text
            style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}
          >
            Requests ({requestPins.length})
          </Text>
        </TouchableOpacity>
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
        ) : displayData.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            No {activeTab === 0 ? "pins" : "requests"} found.
          </Text>
        ) : (
          <FlatList
            data={displayData}
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
            {selectedMedia && selectedMedia.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#888" }}>
                No media available.
              </Text>
            ) : selectedMedia && selectedMedia.length > 0 ? (
              <FlatList
                data={selectedMedia}
                keyExtractor={(item, idx) =>
                  item?.url || item?.uri || `media-${idx}`
                }
                renderItem={({ item }) => {
                  const mediaUrl = item?.url || item?.uri;
                  return mediaUrl ? (
                    <Image
                      source={{ uri: mediaUrl }}
                      style={styles.mediaImage}
                      resizeMode="contain"
                      onError={(error) =>
                        console.log("Image load error:", error)
                      }
                    />
                  ) : (
                    <View
                      style={{
                        width: 220,
                        height: 220,
                        backgroundColor: "#eee",
                        borderRadius: 10,
                      }}
                    />
                  );
                }}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ alignItems: "center" }}
              />
            ) : (
              <Text style={{ textAlign: "center", color: "#888" }}>
                No media data.
              </Text>
            )}
            <TouchableOpacity
              style={styles.showMessagesBtn}
              onPress={() => {
                setMediaModalVisible(false);
                navigation.navigate("PinMessages", {
                  pinId: pins.find((p) => p.media === selectedMedia)?.id,
                });
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

      {/* Edit Pin Modal */}
      <MapPinModal
        visible={editModalVisible}
        description={editDescription}
        onChangeDescription={setEditDescription}
        selectedCategory={editCategory}
        onCategoryChange={setEditCategory}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedPin(null);
        }}
        onSave={handleSaveEdit}
        media={editMedia}
        setMedia={setEditMedia}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
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
    color: "#000",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#EC6135",
  },
  tabText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#EC6135",
    fontWeight: "bold",
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
    height: 54,
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
  editButton: {
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    borderRadius: 8,
    marginBottom: 12,
    marginRight: 10,
  },
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
