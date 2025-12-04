// screens/ContactScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
} from "firebase/firestore";
import { Provider } from "react-native-paper";
import { Swipeable } from "react-native-gesture-handler";

export default function ManageContact({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingNumber, setEditingNumber] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");

  // Fetch contacts from Firestore
  useEffect(() => {
    async function fetchContacts() {
      setContactsLoading(true);
      const querySnapshot = await getDocs(collection(db, "contacts"));
      const fetched = [];
      querySnapshot.forEach((docu) => {
        fetched.push({ id: docu.id, ...docu.data() });
      });

      // Sort alphabetically by name
      fetched.sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
      });

      setContacts(fetched);
      setContactsLoading(false);
    }
    fetchContacts();
  }, []);

  const handleEdit = (id, number) => {
    setEditingId(id);
    setEditingNumber(number);
  };

  const handleSave = async (id) => {
    try {
      await updateDoc(doc(db, "contacts", id), { number: editingNumber });
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, number: editingNumber } : c))
      );
      setEditingId(null);
      setEditingNumber("");
    } catch (e) {
      Alert.alert("Error", "Failed to update contact.");
    }
  };

  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Contact",
      "Are you sure you want to delete this contact?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "contacts", id));
              setContacts((prev) => prev.filter((c) => c.id !== id));
            } catch (e) {
              Alert.alert("Error", "Failed to delete contact.");
            }
          },
        },
      ]
    );
  };

  const handleAddContact = async () => {
    if (!newName.trim() || !newNumber.trim()) {
      Alert.alert("Missing Info", "Please enter both name and number.");
      return;
    }
    try {
      const docRef = await addDoc(collection(db, "contacts"), {
        name: newName.trim(),
        number: newNumber.trim(),
      });
      setContacts((prev) => [
        ...prev,
        { id: docRef.id, name: newName.trim(), number: newNumber.trim() },
      ]);
      setAdding(false);
      setNewName("");
      setNewNumber("");
    } catch (e) {
      Alert.alert("Error", "Failed to add contact.");
    }
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
      renderLeftActions={() =>
        renderLeftActions(() => handleEdit(item.id, item.number))
      }
      renderRightActions={() => renderRightActions(() => handleDelete(item.id))}
    >
      <View style={styles.contactRowWrapper}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            /* pressing the row could open details in future */
          }}
        >
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              {editingId === item.id ? (
                <TextInput
                  value={editingNumber}
                  onChangeText={setEditingNumber}
                  style={[styles.contactNumber, { borderBottomWidth: 1 }]}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.contactNumber}>{item.number}</Text>
              )}
            </View>

            {editingId === item.id ? (
              <View style={{ flexDirection: "row" }}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingId(null);
                    setEditingNumber("");
                  }}
                  style={styles.iconButton}
                >
                  <Icon name="close-outline" size={28} color="red" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSave(item.id)}
                  style={styles.iconButton}
                >
                  <Icon name="checkmark-outline" size={28} color="green" />
                </TouchableOpacity>
              </View>
            ) : (
              // Empty view to keep row spacing consistent
              <View style={{ width: 40 }} />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Swipeable>
  );

  return (
    <Provider>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.topBarTitle}>Manage Contacts</Text>

          {/* Empty View for alignment */}
          <View style={styles.backButton} />
        </View>

        {/* Contact List */}
        {contactsLoading ? (
          <ActivityIndicator
            size="large"
            color="#e75e33"
            style={{ marginTop: 30 }}
          />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ ...styles.listContent, paddingBottom: 120 }}
            renderItem={renderPinItem}
          />
        )}

        {/* Floating Add Button */}
        <>
          <TouchableOpacity style={styles.fab} onPress={() => setAdding(true)}>
            <Icon name="add" size={30} color="#fff" />
          </TouchableOpacity>

          {/* Add Contact Modal */}
          <Modal visible={adding} transparent animationType="slide">
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Contact</Text>
                <TextInput
                  placeholder="Contact Name"
                  value={newName}
                  onChangeText={setNewName}
                  style={styles.addContactInput}
                />
                <TextInput
                  placeholder="Phone Number"
                  value={newNumber}
                  onChangeText={setNewNumber}
                  style={styles.addContactInput}
                  keyboardType="phone-pad"
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setAdding(false);
                      setNewName("");
                      setNewNumber("");
                    }}
                    style={styles.modalButtonCancel}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddContact}
                    style={styles.modalButtonSave}
                  >
                    <Text style={styles.modalButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      </SafeAreaView>
    </Provider>
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
    paddingVertical: hp("1.2%"),
    paddingHorizontal: wp("4%"),
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
  listContent: {
    paddingHorizontal: wp("4.5%"),
    paddingVertical: hp("2%"),
  },
  contactRowWrapper: {
    marginBottom: hp("1.5%"),
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: wp("4%"),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    justifyContent: "space-between",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    color: "#333",
  },
  contactNumber: {
    fontSize: wp("4%"),
    color: "#666",
    marginTop: 2,
  },
  iconButton: {
    marginLeft: wp("3%"),
  },
  fab: {
    position: "absolute",
    bottom: "6%",
    right: 20,
    backgroundColor: "#49A5A2",
    width: 55,
    height: 55,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "90%",
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  addContactInput: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  modalButtonSave: {
    backgroundColor: "#49A5A2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonCancel: {
    backgroundColor: "#999",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },

  // Swipe action buttons
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
