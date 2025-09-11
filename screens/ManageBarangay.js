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
} from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

export default function ManageBarangay() {
  const navigation = useNavigation();

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
    querySnapshot.forEach((docSnap) => {
      fetched.push({ id: docSnap.id, ...docSnap.data() });
    });

    // sort alphabetically by name
    fetched.sort((a, b) => a.name.localeCompare(b.name));

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
    querySnapshot.forEach((docSnap) => {
      fetched.push({ id: docSnap.id, ...docSnap.data() });
    });
    
    // sort alphabetically by name
    fetched.sort((a, b) => a.name.localeCompare(b.name));

    setPuroks(fetched);
  };

  // Select a barangay to manage puroks
  const handleSelectBarangay = (id) => {
    setSelectedBarangayId(id);
    setNewPurokName("");
    fetchPuroks(id);
    setShowPurokModal(true);
  };

  // Add a purok
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

  // Delete a purok
  const handleDeletePurok = async (purokId) => {
    const purokDocRef = doc(
      db,
      "barangays",
      selectedBarangayId,
      "puroks",
      purokId
    );
    await deleteDoc(purokDocRef);
    fetchPuroks(selectedBarangayId);
  };

  const closePurokModal = () => {
    setShowPurokModal(false);
    setSelectedBarangayId(null);
    setPuroks([]);
    setNewPurokName("");
  };

  const selectedBarangay = barangays.find((b) => b.id === selectedBarangayId);

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
            <View style={styles.barangayRow}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => handleSelectBarangay(item.id)}
              >
                <Text style={styles.barangayName}>{item.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteBarangay(item.id)}>
                <Icon name="trash-outline" size={20} color="#ff4444" />
              </TouchableOpacity>
            </View>
          )}
          style={{ marginTop: 16 }}
        />
      </View>

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
                <ScrollView
                  contentContainerStyle={{ paddingBottom: 20 }}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Add Purok */}
                  <View style={styles.addContainer}>
                    <TextInput
                      placeholder="Purok Name"
                      value={newPurokName}
                      onChangeText={setNewPurokName}
                      style={styles.input}
                    />
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={handleAddPurok}
                    >
                      <Text style={styles.addButtonText}>Add Purok</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Purok List */}
                  {puroks.length > 0 ? (
                    puroks.map((item) => (
                      <View key={item.id} style={styles.purokRow}>
                        <Text style={styles.purokName}>{item.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleDeletePurok(item.id)}
                        >
                          <Icon
                            name="trash-outline"
                            size={20}
                            color="#ff4444"
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
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 5,
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

  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  barangayName: { flex: 1, fontWeight: "bold", color: "#333", fontSize: 16 },
  deleteText: { color: "red", fontWeight: "bold", marginLeft: 12 },

  // Modal
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
    borderRadius: 10,
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

  purokListContainer: { flex: 1, minHeight: 200, maxHeight: 300 },
  purokRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  purokName: { flex: 1, color: "#333", fontWeight: "500", fontSize: 14 },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
    marginTop: 20,
  },
});
