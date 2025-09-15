import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  StatusBar,
  ScrollView,
} from "react-native";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { Swipeable } from "react-native-gesture-handler";

export default function ManageBarangay() {
  const navigation = useNavigation();

  const [barangays, setBarangays] = useState([]);
  const [newBarangayName, setNewBarangayName] = useState("");
  const [selectedBarangayId, setSelectedBarangayId] = useState(null);

  const [newPurokName, setNewPurokName] = useState("");
  const [editingPurokId, setEditingPurokId] = useState(null);

  const [puroks, setPuroks] = useState([]);
  const [showPurokModal, setShowPurokModal] = useState(false);

  const [showOptions, setShowOptions] = useState(false);
  const [selectedPurok, setSelectedPurok] = useState(null);

  // Fetch barangays
  useEffect(() => {
    fetchBarangays();
  }, []);

  const fetchBarangays = async () => {
    const querySnapshot = await getDocs(collection(db, "barangays"));
    const fetched = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    fetched.sort((a, b) => a.name.localeCompare(b.name));
    setBarangays(fetched);
  };

  // Add barangay
  const handleAddBarangay = async () => {
    if (!newBarangayName.trim()) {
      Alert.alert("Missing Info", "Please enter barangay name.");
      return;
    }
    await addDoc(collection(db, "barangays"), {
      name: newBarangayName.trim(),
    });
    setNewBarangayName("");
    fetchBarangays();
  };

  // Delete barangay
  const handleDeleteBarangay = async (id) => {
    await deleteDoc(doc(db, "barangays", id));
    setSelectedBarangayId(null);
    setPuroks([]);
    setShowPurokModal(false);
    fetchBarangays();
  };

  // Fetch puroks
  const fetchPuroks = async (barangayId) => {
    const purokRef = collection(db, "barangays", barangayId, "puroks");
    const querySnapshot = await getDocs(purokRef);
    const fetched = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    fetched.sort((a, b) => a.name.localeCompare(b.name));
    setPuroks(fetched);
  };

  // Select barangay
  const handleSelectBarangay = (id) => {
    setSelectedBarangayId(id);
    setNewPurokName("");
    setEditingPurokId(null);
    fetchPuroks(id);
    setShowPurokModal(true);
  };

  // Save (add/update) purok
  const handleSavePurok = async () => {
    if (!newPurokName.trim()) {
      Alert.alert("Missing Info", "Please enter purok name.");
      return;
    }
    const purokRef = collection(db, "barangays", selectedBarangayId, "puroks");

    if (editingPurokId) {
      const ref = doc(
        db,
        "barangays",
        selectedBarangayId,
        "puroks",
        editingPurokId
      );
      await updateDoc(ref, { name: newPurokName.trim() });
      setEditingPurokId(null);
    } else {
      await addDoc(purokRef, { name: newPurokName.trim() });
    }

    setNewPurokName("");
    fetchPuroks(selectedBarangayId);
  };

  // Delete purok
  const handleDeletePurok = async (purokId) => {
    const ref = doc(db, "barangays", selectedBarangayId, "puroks", purokId);
    await deleteDoc(ref);
    fetchPuroks(selectedBarangayId);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingPurokId(null);
    setNewPurokName("");
  };

  const closePurokModal = () => {
    setShowPurokModal(false);
    setSelectedBarangayId(null);
    setPuroks([]);
    setNewPurokName("");
    setEditingPurokId(null);
  };

  const selectedBarangay = barangays.find((b) => b.id === selectedBarangayId);

  // Right swipe delete for barangay
  const renderRightActions = (onDelete) => (
    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
      <Icon name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  // Open options menu for purok
  const openOptions = (purok) => {
    setSelectedPurok(purok);
    setShowOptions(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Barangays</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <View style={styles.container}>
        {/* Add Barangay */}
        <View style={styles.addContainer}>
          <TextInput
            placeholder="Barangay Name"
            value={newBarangayName}
            onChangeText={setNewBarangayName}
            style={styles.input}
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddBarangay}
          >
            <Text style={styles.addButtonText}>Add Barangay</Text>
          </TouchableOpacity>
        </View>

        {/* Barangay List */}
        <FlatList
          data={barangays}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() =>
                renderRightActions(() => handleDeleteBarangay(item.id))
              }
            >
              <TouchableOpacity
                style={styles.barangayRow}
                onPress={() => handleSelectBarangay(item.id)}
              >
                <Text style={styles.barangayName}>{item.name}</Text>
              </TouchableOpacity>
            </Swipeable>
          )}
          style={{ marginTop: 16 }}
        />
      </View>

      {/* Purok Modal */}
      <Modal visible={showPurokModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedBarangay && (
              <>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Puroks in {selectedBarangay.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={closePurokModal}
                  >
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>

                {/* Scrollable Content */}
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                  {/* Add / Update Purok */}
                  <View style={styles.addContainer}>
                    <TextInput
                      placeholder="Purok Name"
                      value={newPurokName}
                      onChangeText={setNewPurokName}
                      style={styles.input}
                    />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleSavePurok}
                      >
                        <Text style={styles.addButtonText}>
                          {editingPurokId ? "Update Purok" : "Add Purok"}
                        </Text>
                      </TouchableOpacity>
                      {editingPurokId && (
                        <TouchableOpacity
                          style={[
                            styles.addButton,
                            { backgroundColor: "#aaa" },
                          ]}
                          onPress={handleCancelEdit}
                        >
                          <Text style={styles.addButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Purok List */}
                  {puroks.length > 0 ? (
                    puroks.map((item) => (
                      <View key={item.id} style={styles.purokRow}>
                        <Text style={styles.purokName}>{item.name}</Text>
                        <TouchableOpacity onPress={() => openOptions(item)}>
                          <Icon
                            name="ellipsis-vertical"
                            size={20}
                            color="#333"
                          />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No puroks added yet</Text>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Options Modal for Purok */}
      <Modal transparent animationType="fade" visible={showOptions}>
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPressOut={() => setShowOptions(false)}
        >
          <View style={styles.optionsMenu}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setNewPurokName(selectedPurok?.name || "");
                setEditingPurokId(selectedPurok?.id || null);
                setShowOptions(false);
              }}
            >
              <Text style={styles.optionText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() =>
                Alert.alert(
                  "Delete Purok",
                  `Do you want to delete ${selectedPurok?.name}?`,
                  [
                    {
                      text: "Delete",
                      onPress: () => handleDeletePurok(selectedPurok.id),
                      style: "destructive",
                    },
                    { text: "Cancel", style: "cancel" },
                  ]
                )
              }
            >
              <Text style={[styles.optionText, { color: "red" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    elevation: 5,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: { fontSize: 18, fontWeight: "bold", color: "#000" },
  container: { flex: 1, padding: 20 },
  addContainer: { marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: "#f7f7f7",
  },
  addButton: {
    backgroundColor: "#49A5A2",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  barangayRow: {
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  barangayName: { fontWeight: "bold", color: "#333", fontSize: 16 },
  deleteButton: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    borderRadius: 8,
    marginBottom: 8,
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#e75e33", flex: 1 },
  closeButton: {
    width: 30,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  closeButtonText: {
    color: "#333",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  purokRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  purokName: { flex: 1, fontSize: 14, color: "#333" },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
    marginTop: 20,
  },
  optionsOverlay: {
    flex: 1,
    justifyContent: "center",
    // paddingRight: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  optionsMenu: {
    backgroundColor: "#fff",
    borderRadius: 8,
    width: 200,
    paddingVertical: 10,
  },
  optionItem: { padding: 12 },
  optionText: { fontSize: 16, color: "#333" },
});
