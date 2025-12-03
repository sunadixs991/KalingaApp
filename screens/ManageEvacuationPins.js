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
import { Picker } from "@react-native-picker/picker";
import { Swipeable } from "react-native-gesture-handler";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import EvacuationPinModal from "../components/EvacuationPinModal";
import MedicalPinModal from "../components/MedicalPinModal";
import { useNavigation } from "@react-navigation/native";

export default function ManageEvacuationPins() {
  const [evacuationPins, setEvacuationPins] = useState([]);
  const [medicalPins, setMedicalPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [filter, setFilter] = useState("All");
  const [selectedPin, setSelectedPin] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Evacuation pin edit states
  const [editFacilityName, setEditFacilityName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editPurok, setEditPurok] = useState("");
  const [editSitio, setEditSitio] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMedia, setEditMedia] = useState([]);
  
  // Medical pin edit states
  const [editMedicalFacilityName, setEditMedicalFacilityName] = useState("");
  const [editOpenTime, setEditOpenTime] = useState("");
  const [editMedicalDescription, setEditMedicalDescription] = useState("");

  const navigation = useNavigation();

  useEffect(() => {
    fetchAllPins();
  }, []);

  const fetchAllPins = async () => {
    setLoading(true);
    try {
      // Fetch evacuation pins
      const evacuSnap = await getDocs(collection(db, "evacuation_pins"));
      const evacuList = evacuSnap.docs.map((docu) => ({
        id: docu.id,
        type: "evacuation",
        ...docu.data(),
      }));
      setEvacuationPins(evacuList);

      // Fetch medical pins
      const medicalSnap = await getDocs(collection(db, "medical_pins"));
      const medicalList = medicalSnap.docs.map((docu) => ({
        id: docu.id,
        type: "medical",
        ...docu.data(),
      }));
      setMedicalPins(medicalList);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch pins.");
    }
    setLoading(false);
  };

  const getFilteredPins = () => {
    const dataSource = activeTab === 0 ? evacuationPins : medicalPins;
    if (filter === "Most Relevant") {
      return [...dataSource].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    }
    if (filter === "Newest") {
      return [...dataSource].sort((a, b) => {
        const aDate = a.createdAt?.seconds || 0;
        const bDate = b.createdAt?.seconds || 0;
        return bDate - aDate;
      });
    }
    return [...dataSource].sort((a, b) => (b.downvotes || 0) - (a.downvotes || 0));
  };

  const handleDeletePin = (pinId, pinType) => {
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
              const collectionName = pinType === "medical" ? "medical_pins" : "evacuation_pins";
              await deleteDoc(doc(db, collectionName, pinId));
              if (pinType === "medical") {
                setMedicalPins((prev) => prev.filter((p) => p.id !== pinId));
              } else {
                setEvacuationPins((prev) => prev.filter((p) => p.id !== pinId));
              }
            } catch (e) {
              Alert.alert("Error", "Failed to delete pin.");
            }
          },
        },
      ]
    );
  };

  const handlePinPress = (item) => {
    console.log("Selected media:", item.media);
    setSelectedMedia(item.media || []);
    setMediaModalVisible(true);
  };

  const handleEdit = (pin) => {
    setSelectedPin(pin);
    setEditMedia(pin.media || []);
    
    if (pin.type === "evacuation") {
      setEditFacilityName(pin.facilityName || "");
      setEditCapacity(pin.capacity?.toString() || "");
      setEditPurok(pin.purok || "");
      setEditSitio(pin.sitio || "");
      setEditDescription(pin.description || "");
    } else {
      setEditMedicalFacilityName(pin.facilityName || pin.description || "");
      setEditOpenTime(pin.openTime || "");
      setEditMedicalDescription(pin.description || "");
    }
    
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPin) return;
    try {
      const collectionName = selectedPin.type === "medical" ? "medical_pins" : "evacuation_pins";
      
      if (selectedPin.type === "evacuation") {
        await updateDoc(doc(db, collectionName, selectedPin.id), {
          facilityName: editFacilityName,
          capacity: Number(editCapacity),
          purok: editPurok,
          sitio: editSitio,
          description: editDescription,
          media: editMedia,
        });
      } else {
        await updateDoc(doc(db, collectionName, selectedPin.id), {
          facilityName: editMedicalFacilityName,
          openTime: editOpenTime,
          description: editMedicalDescription,
          media: editMedia,
        });
      }
      
      setEditModalVisible(false);
      setSelectedPin(null);
      setEditMedia([]); // Clear edit media
      fetchAllPins();
      Alert.alert("Success", "Pin updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update pin.");
      console.error("Update error:", error);
    }
  };

  const renderRightActions = (onDelete) => (
    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
      <Icon name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const renderPinItem = ({ item }) => (
    <Swipeable
      renderLeftActions={() => (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEdit(item)}
        >
          <Icon name="pencil" size={22} color="#fff" />
        </TouchableOpacity>
      )}
      renderRightActions={() =>
        renderRightActions(() => handleDeletePin(item.id, item.type))
      }
    >
      <TouchableOpacity onPress={() => handlePinPress(item)}>
        <View style={styles.pinCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pinTitle}>{item.description}</Text>
            <Text style={styles.pinDetail}>
              Category: {item.category || "Unknown"}
            </Text>
            {/* <Text style={styles.pinDetail}>
              Upvotes: {item.upvotes || 0}
            </Text>
            <Text style={styles.pinDetail}>
              Downvotes: {item.downvotes || 0}
            </Text> */}
            <Text style={styles.pinDetail}>
              Barangay: {item.barangay || "N/A"}
            </Text>
            {item.type === "medical" && (
              <>
                {/* <Text style={styles.pinDetail}>
                  Specialty: {item.specialty || "N/A"}
                </Text>
                <Text style={styles.pinDetail}>
                  Availability: {item.availability || "N/A"}
                </Text> */}
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const displayData = getFilteredPins();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1976D2" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Facilities</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
            Evacuation ({evacuationPins.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.tabActive]}
          onPress={() => setActiveTab(1)}
        >
          <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
            Medical ({medicalPins.length})
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
            No {activeTab === 0 ? "evacuation" : "medical"} pins found.
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
                keyExtractor={(item, idx) => (item?.url || item?.uri || `media-${idx}`)}
                renderItem={({ item }) => {
                  const mediaUrl = item?.url || item?.uri;
                  console.log("Rendering media item:", item, "URL:", mediaUrl);
                  return (
                    <View style={styles.mediaContainer}>
                      {mediaUrl ? (
                        <Image
                          source={{ uri: mediaUrl }}
                          style={styles.mediaImage}
                          resizeMode="contain"
                          onError={(error) => console.log("Image load error:", error)}
                        />
                      ) : (
                        <Text style={{ color: "#888" }}>Invalid media URL</Text>
                      )}
                    </View>
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
              style={styles.closeMediaBtn}
              onPress={() => setMediaModalVisible(false)}
            >
              <Text style={styles.closeMediaText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Pin Modal */}
     {selectedPin?.type === "evacuation" ? (
       <EvacuationPinModal
         key={`evacuation-${selectedPin?.id}`}
         visible={editModalVisible}
         description={editDescription}
         onChangeDescription={setEditDescription}
         facilityName={editFacilityName}
         onChangeFacilityName={setEditFacilityName}
         capacity={editCapacity}
         onChangeCapacity={setEditCapacity}
         purok={editPurok}
         onChangePurok={setEditPurok}
         sitio={editSitio}
         onChangeSitio={setEditSitio}
         onCancel={() => {
           setEditModalVisible(false);
           setSelectedPin(null);
         }}
         onSave={handleSaveEdit}
         media={editMedia}
         setMedia={setEditMedia}
       />
     ) : (
       <MedicalPinModal
         key={`medical-${selectedPin?.id}`}
         visible={editModalVisible}
         description={editMedicalDescription}
         onChangeDescription={setEditMedicalDescription}
         facilityName={editMedicalFacilityName}
         onChangeFacilityName={setEditMedicalFacilityName}
         openTime={editOpenTime}
         onChangeOpenTime={setEditOpenTime}
         onCancel={() => {
           setEditModalVisible(false);
           setSelectedPin(null);
         }}
         onSave={handleSaveEdit}
         media={editMedia}
         setMedia={setEditMedia}
       />
     )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffff",
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
  mediaContainer: {
    alignItems: "center",
    justifyContent: "center",
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
  editButton: {
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    borderRadius: 8,
    marginBottom: 12,
    marginRight: 10,
  },
});