// screens/ContactScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  FlatList,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
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

export default function ContactScreen() {
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingNumber, setEditingNumber] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Admin check logic (same as FoodDistribution.js)
  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      const user = await AsyncStorage.getItem("user");

      if (userInfo && user) {
        const parsedInfo = JSON.parse(userInfo);
        setIsLoggedIn(true);
        setIsAdmin(parsedInfo.isAdmin === true); // Strict boolean check
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  };

  // Fetch contacts from Firestore
  useEffect(() => {
    async function fetchContacts() {
      setContactsLoading(true);
      const querySnapshot = await getDocs(collection(db, "contacts"));
      const fetched = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setContacts(fetched);
      setContactsLoading(false);
    }
    fetchContacts();
  }, []);

  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleSMS = (number) => {
    Linking.openURL(`sms:${number}`);
  };

  const handleEdit = (id, number) => {
    setEditingId(id);
    setEditingNumber(number);
  };

  const handleSave = async (id) => {
    try {
      await updateDoc(doc(db, "contacts", id), { number: editingNumber });
      setContacts((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, number: editingNumber } : c
        )
      );
      setEditingId(null);
      setEditingNumber("");
    } catch (e) {
      Alert.alert("Error", "Failed to update contact.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "contacts", id));
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      Alert.alert("Error", "Failed to delete contact.");
    }
  };

  // Add contact function
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />

      {/* Top Bar - Stays Fixed */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Emergency Contacts</Text>
      </View>

      {/* Admin-only Add Contact UI */}
      {isLoggedIn && isAdmin && (
        <View style={styles.addContactContainer}>
          {adding ? (
            <View style={styles.addContactForm}>
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
              <View style={{ flexDirection: "row", marginTop: 8 }}>
                <TouchableOpacity
                  onPress={handleAddContact}
                  style={[styles.iconButton, { marginRight: 12 }]}
                >
                  <Icon name="checkmark-outline" size={28} color="green" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setAdding(false);
                    setNewName("");
                    setNewNumber("");
                  }}
                  style={styles.iconButton}
                >
                  <Icon name="close-outline" size={28} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setAdding(true)}
              style={styles.addContactButton}
            >
              <Icon name="add-circle-outline" size={28} color="#007AFF" />
              <Text style={{ marginLeft: 8, fontSize: 16, color: "#007AFF" }}>
                Add Contact
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {contactsLoading ? (
        <ActivityIndicator size="large" color="#e75e33" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.contactRow}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                {isLoggedIn && isAdmin && editingId === item.id ? (
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
              <View style={styles.iconRow}>
                <TouchableOpacity
                  onPress={() => handleSMS(item.number)}
                  style={styles.iconButton}
                  disabled={isLoggedIn && isAdmin && editingId === item.id}
                >
                  <Icon
                    name="chatbubble-ellipses-outline"
                    size={28}
                    color="#49A5A2"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleCall(item.number)}
                  style={styles.iconButton}
                  disabled={isLoggedIn && isAdmin && editingId === item.id}
                >
                  <Icon name="call-outline" size={28} color="#e75e33" />
                </TouchableOpacity>
                {isLoggedIn && isAdmin && (
                  <>
                    {editingId === item.id ? (
                      <>
                        <TouchableOpacity
                          onPress={() => handleSave(item.id)}
                          style={styles.iconButton}
                        >
                          <Icon name="checkmark-outline" size={28} color="green" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingId(null);
                            setEditingNumber("");
                          }}
                          style={styles.iconButton}
                        >
                          <Icon name="close-outline" size={28} color="red" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => handleEdit(item.id, item.number)}
                          style={styles.iconButton}
                        >
                          <Icon name="create-outline" size={28} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(item.id)}
                          style={styles.iconButton}
                        >
                          <Icon name="trash-outline" size={28} color="#e75e33" />
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}
              </View>
            </View>
          )}
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
    width: "100%",
    backgroundColor: "#e75e33",
    paddingVertical: hp("1.5%"),
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    zIndex: 10,
  },
  topBarTitle: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: wp("4.5%"),
    paddingVertical: hp("2%"), 
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("2%"),
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: wp("4%"),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
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
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: wp("4%"),
  },
  addContactContainer: {
    paddingHorizontal: wp("4.5%"),
    paddingTop: hp("2%"),
    paddingBottom: hp("1%"),
    backgroundColor: "#fff",
  },
  addContactButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f2f6ff",
    marginBottom: 8,
    elevation: 1,
  },
  addContactForm: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  addContactInput: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
});
