import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, Alert, SegmentedControlIOS, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import MapPinModal from "../components/MapPinModal";
import ProvideSupplyModal from "../components/ProvideSupplyModal";
import { Swipeable } from "react-native-gesture-handler";

export default function PinLogs() {
  const [pins, setPins] = useState([]);
  const [requestPins, setRequestPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNumberOfPeople, setEditNumberOfPeople] = useState("");
  const [editUrgency, setEditUrgency] = useState("");
  const [editMedia, setEditMedia] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchAllPins();
  }, []);

  const fetchAllPins = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) {
        setPins([]);
        setRequestPins([]);
        setLoading(false);
        return;
      }

      // Fetch regular pins
      const pinsQuery = query(
        collection(db, "pins"),
        where("userId", "==", userStr)
      );
      const pinsSnap = await getDocs(pinsQuery);
      const pinsList = [];
      pinsSnap.forEach(doc => {
        pinsList.push({ id: doc.id, type: "pin", ...doc.data() });
      });
      setPins(pinsList);

      // Fetch request pins
      const reqPinsQuery = query(
        collection(db, "request_pins"),
        where("userId", "==", userStr)
      );
      const reqPinsSnap = await getDocs(reqPinsQuery);
      const reqPinsList = [];
      reqPinsSnap.forEach(doc => {
        reqPinsList.push({ id: doc.id, type: "request_pin", ...doc.data() });
      });
      setRequestPins(reqPinsList);
    } catch (error) {
      console.log("Failed to fetch pins:", error);
    }
    setLoading(false);
  };

  // Open modal for editing
  const handleEdit = (pin) => {
    console.log("Editing pin:", pin);
    setSelectedPin(pin);
    
    if (pin.type === "request_pin") {
      setEditCategory(pin.supplyType || "");
      setEditDescription(pin.description || "");
      setEditNumberOfPeople(pin.numberOfPeople?.toString() || "");
      setEditUrgency(pin.urgency || "");
    } else {
      setEditCategory(pin.category || "");
      setEditDescription(pin.description || "");
    }
    
    setEditMedia(pin.media || []);
    setEditModalVisible(true);
  };

  // Save edited pin
  const handleSaveEdit = async (payload) => {
    if (!selectedPin) return;
    try {
      const collectionName = selectedPin.type === "request_pin" ? "request_pins" : "pins";
      
      const updateData = {
        description: payload.description || editDescription,
        media: payload.media || editMedia,
      };

      if (selectedPin.type === "request_pin") {
        updateData.supplyType = payload.supplyType || editCategory;
        updateData.numberOfPeople = payload.numberOfPeople || Number(editNumberOfPeople) || 0;
        updateData.urgency = payload.urgency || editUrgency;
        updateData.contact = payload.contact || selectedPin?.contact || "";
      } else {
        updateData.category = editCategory;
      }

      console.log("Saving with data:", updateData);
      await updateDoc(doc(db, collectionName, selectedPin.id), updateData);
      setEditModalVisible(false);
      setSelectedPin(null);
      setEditMedia([]);
      fetchAllPins();
      Alert.alert("Success", "Pin updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update pin: " + error.message);
    }
  };

  // Delete pin
  const handleDelete = async (pinId, pinType) => {
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
              const collectionName = pinType === "request_pin" ? "request_pins" : "pins";
              await deleteDoc(doc(db, collectionName, pinId));
              fetchAllPins();
              Alert.alert("Success", "Pin deleted successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to delete pin.");
            }
          },
        },
      ]
    );
  };

  const renderPinItem = ({ item }) => {
    const renderLeftActions = () => (
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleEdit(item)}
      >
        <Icon name="pencil" size={22} color="#fff" />
      </TouchableOpacity>
    );

    const renderRightActions = () => (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.type)}
      >
        <Icon name="trash-outline" size={22} color="#fff" />
      </TouchableOpacity>
    );

    return (
      <Swipeable 
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
      >
        <View style={styles.pinCard}>
          <Text style={styles.pinTitle}>
            {item.title || item.supplyType || "Pin"}
          </Text>
          <Text style={styles.pinDesc}>
            <Text style={{ fontWeight: "bold" }}>Category: </Text>
            {item.category || item.supplyType || "N/A"}
          </Text>
          <Text style={styles.pinDesc}>
            <Text style={{ fontWeight: "bold" }}>Description: </Text>
            {item.description || ""}
          </Text>
          {item.numberOfPeople && (
            <Text style={styles.pinDesc}>
              <Text style={{ fontWeight: "bold" }}>People: </Text>
              {item.numberOfPeople}
            </Text>
          )}
          {item.urgency && (
            <Text style={styles.pinDesc}>
              <Text style={{ fontWeight: "bold" }}>Urgency: </Text>
              {item.urgency}
            </Text>
          )}
          <Text style={styles.pinDate}>
            {item.createdAt
              ? new Date(item.createdAt.seconds * 1000).toLocaleString()
              : ""}
          </Text>
        </View>
      </Swipeable>
    );
  };

  const displayData = activeTab === 0 ? pins : requestPins;
  const isEmptyMessage = activeTab === 0 ? "No pins found." : "No supply requests found.";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Pin Logs</Text>
        <View style={styles.backButton} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 0 && styles.tabActive]}
          onPress={() => setActiveTab(0)}
        >
          <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
            My Pins ({pins.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 1 && styles.tabActive]}
          onPress={() => setActiveTab(1)}
        >
          <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
            Supply Requests ({requestPins.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#e75e33" />
        ) : displayData.length === 0 ? (
          <Text style={styles.noPins}>{isEmptyMessage}</Text>
        ) : (
          <FlatList
            data={displayData}
            keyExtractor={item => item.id}
            renderItem={renderPinItem}
          />
        )}
      </View>

      {/* Edit Pin Modal - Dynamic based on type */}
      {selectedPin?.type === "request_pin" ? (
        <ProvideSupplyModal
          visible={editModalVisible}
          supplyType={editCategory}
          numberOfPeople={editNumberOfPeople}
          urgency={editUrgency}
          contact={selectedPin?.contact || ""}
          description={editDescription}
          notes={editDescription}
          media={editMedia}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedPin(null);
          }}
          onSubmit={handleSaveEdit}
        />
      ) : (
        <MapPinModal
          visible={editModalVisible}
          description={editDescription}
          onChangeDescription={setEditDescription}
          onCancel={() => {
            setEditModalVisible(false);
            setSelectedPin(null);
          }}
          onSave={handleSaveEdit}
          selectedCategory={editCategory}
          onCategoryChange={setEditCategory}
          media={editMedia}
          setMedia={setEditMedia}
        />
      )}
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
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
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
    borderBottomColor: "#e75e33",
  },
  tabText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#e75e33",
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  pinCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  pinTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  pinDesc: {
    fontSize: 15,
    color: "#555",
    marginTop: 4,
    marginBottom: 2,
  },
  pinDate: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  noPins: {
    textAlign: "center",
    color: "#888",
    fontSize: 16,
    marginTop: 40,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  actionBtn: {
    marginLeft: 16,
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