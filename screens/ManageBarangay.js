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
  ScrollView,
} from "react-native";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

export default function ManageBarangay() {
  const [barangays, setBarangays] = useState([]);
  const [newBarangayName, setNewBarangayName] = useState("");
  const [selectedBarangayId, setSelectedBarangayId] = useState(null);
  const [newPurokName, setNewPurokName] = useState("");
  const [puroks, setPuroks] = useState([]);
  const [showPurokModal, setShowPurokModal] = useState(false);

  // Fetch barangays from Firestore
  useEffect(() => {
    fetchBarangays();
  }, []);

  const fetchBarangays = async () => {
    const querySnapshot = await getDocs(collection(db, "barangays"));
    const fetched = [];
    querySnapshot.forEach((doc) => {
      fetched.push({ id: doc.id, ...doc.data() });
    });
    setBarangays(fetched);
  };

  // Add a new barangay
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

  // Delete a barangay
  const handleDeleteBarangay = async (id) => {
    await deleteDoc(doc(db, "barangays", id));
    setSelectedBarangayId(null);
    setPuroks([]);
    setShowPurokModal(false);
    fetchBarangays();
  };

  // Fetch puroks for selected barangay
  const fetchPuroks = async (barangayId) => {
    const purokRef = collection(db, "barangays", barangayId, "puroks");
    const querySnapshot = await getDocs(purokRef);
    const fetched = [];
    querySnapshot.forEach((doc) => {
      fetched.push({ id: doc.id, ...doc.data() });
    });
    setPuroks(fetched);
  };

  // Select a barangay to manage puroks
  const handleSelectBarangay = (id) => {
    setSelectedBarangayId(id);
    setNewPurokName("");
    fetchPuroks(id);
    setShowPurokModal(true);
  };

  // Add a purok to selected barangay
  const handleAddPurok = async () => {
    if (!newPurokName.trim()) {
      Alert.alert("Missing Info", "Please enter purok name.");
      return;
    }
    const purokRef = collection(db, "barangays", selectedBarangayId, "puroks");
    await addDoc(purokRef, {
      name: newPurokName.trim(),
    });
    setNewPurokName("");
    fetchPuroks(selectedBarangayId);
  };

  // Delete a purok from selected barangay
  const handleDeletePurok = async (purokId) => {
    const purokDocRef = doc(db, "barangays", selectedBarangayId, "puroks", purokId);
    await deleteDoc(purokDocRef);
    fetchPuroks(selectedBarangayId);
  };

  // Close purok modal
  const closePurokModal = () => {
    setShowPurokModal(false);
    setSelectedBarangayId(null);
    setPuroks([]);
    setNewPurokName("");
  };

  const selectedBarangay = barangays.find((b) => b.id === selectedBarangayId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Barangays & Puroks</Text>
      
      {/* Add Barangay */}
      <View style={styles.addContainer}>
        <TextInput
          placeholder="Barangay Name"
          value={newBarangayName}
          onChangeText={setNewBarangayName}
          style={styles.input}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddBarangay}>
          <Text style={styles.addButtonText}>Add Barangay</Text>
        </TouchableOpacity>
      </View>

      {/* Barangay List */}
      <FlatList
        data={barangays}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.barangayRow}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => handleSelectBarangay(item.id)}
            >
              <Text style={styles.barangayName}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteBarangay(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        style={{ marginTop: 16 }}
      />

      {/* Purok Modal */}
      <Modal
        visible={showPurokModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closePurokModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedBarangay && (
              <>
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

                {/* Add Purok Section */}
                <View style={styles.addContainer}>
                  <TextInput
                    placeholder="Purok Name"
                    value={newPurokName}
                    onChangeText={setNewPurokName}
                    style={styles.input}
                  />
                  <TouchableOpacity style={styles.addButton} onPress={handleAddPurok}>
                    <Text style={styles.addButtonText}>Add Purok</Text>
                  </TouchableOpacity>
                </View>

                {/* Purok List stays always visible in modal */}
                <View style={styles.purokListContainer}>
                  <FlatList
                    data={puroks}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.purokRow}>
                        <Text style={styles.purokName}>{item.name}</Text>
                        <TouchableOpacity onPress={() => handleDeletePurok(item.id)}>
                          <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>No puroks added yet</Text>
                    }
                    showsVerticalScrollIndicator={true}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#e75e33",
    alignSelf: "center",
  },
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
    backgroundColor: "#e75e33",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: { color: "#fff", fontWeight: "bold" },
  barangayRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  barangayName: { flex: 1, fontWeight: "bold", color: "#333", fontSize: 16 },
  deleteText: { color: "red", fontWeight: "bold", marginLeft: 12 },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#e75e33",
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e75e33",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  purokListContainer: {
    flex: 1,
    minHeight: 200,
    maxHeight: 300,
  },
  purokScrollView: {
    flex: 1,
  },
  purokRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  purokName: { 
    flex: 1, 
    color: "#333", 
    fontWeight: "500",
    fontSize: 14,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
    marginTop: 20,
  },
});