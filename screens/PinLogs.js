import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import MapPinModal from "../components/MapPinModal";

export default function PinLogs() {
  const [pins, setPins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMedia, setEditMedia] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchPins();
  }, []);

  const fetchPins = async () => {
    setLoading(true);
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (!userStr) {
        setPins([]);
        setLoading(false);
        return;
      }
      const pinsQuery = query(
        collection(db, "pins"),
        where("userId", "==", userStr)
      );
      const snap = await getDocs(pinsQuery);
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPins(list);
    } catch (error) {
      console.log("Failed to fetch pins:", error);
    }
    setLoading(false);
  };

  // Open modal for editing
  const handleEdit = (pin) => {
    setSelectedPin(pin);
    setEditCategory(pin.category || "");
    setEditDescription(pin.description || "");
    setEditMedia(pin.media || []);
    setEditModalVisible(true);
  };

  // Save edited pin
  const handleSaveEdit = async () => {
    if (!selectedPin) return;
    try {
      await updateDoc(doc(db, "pins", selectedPin.id), {
        category: editCategory,
        description: editDescription,
        media: editMedia,
      });
      setEditModalVisible(false);
      setSelectedPin(null);
      fetchPins();
      Alert.alert("Success", "Pin updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update pin.");
    }
  };

  // Delete pin
  const handleDelete = async (pinId) => {
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
              fetchPins();
              Alert.alert("Success", "Pin deleted successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to delete pin.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Pin Logs</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#e75e33" />
        ) : pins.length === 0 ? (
          <Text style={styles.noPins}>No pins found.</Text>
        ) : (
          <FlatList
            data={pins}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.pinCard}>
                <Text style={styles.pinTitle}>{item.title || "Pin"}</Text>
                <Text style={styles.pinDesc}>
                  <Text style={{ fontWeight: "bold" }}>Category: </Text>
                  {item.category || "N/A"}
                </Text>
                <Text style={styles.pinDesc}>
                  <Text style={{ fontWeight: "bold" }}>Description: </Text>
                  {item.description || ""}
                </Text>
                <Text style={styles.pinDate}>
                  {item.createdAt
                    ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                    : ""}
                </Text>
                <View style={styles.actionRow}>
                  {/* <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleEdit(item)}
                  >
                    <Icon name="create-outline" size={20} color="#007AFF" />
                  </TouchableOpacity> */}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Icon name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
      {/* Edit Pin Modal */}
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
    backgroundColor: "#e75e33",
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
});