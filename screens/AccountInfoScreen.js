import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";

export default function AccountInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editInfo, setEditInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    status: "",
    barangay: "",
    purok: "",
  });

  const [barangayList, setBarangayList] = useState([]);
  const [purokList, setPurokList] = useState([]);

  // Fetch user data whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      let userIdentifier = await AsyncStorage.getItem("user");

      if (!userIdentifier) {
        Alert.alert("Error", "User not found");
        setLoading(false);
        return;
      }

      let cleanIdentifier = userIdentifier;
      try {
        const parsed = JSON.parse(userIdentifier);
        if (typeof parsed === "object" && parsed !== null) {
          cleanIdentifier =
            parsed.username || parsed.email || parsed.id || userIdentifier;
        }
      } catch (e) { }
      cleanIdentifier = cleanIdentifier.toString().trim();

      const userQuery = query(
        collection(db, "users"),
        where("username", "==", cleanIdentifier)
      );
      const userSnap = await getDocs(userQuery);

      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        setEditInfo({
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          email: userData.email || "",
          phone: userData.phone || "",
          dob: userData.dob || "",
          gender: userData.gender || "",
          status: userData.status || "",
          barangay: userData.barangay || "",
          purok: userData.purok || "",
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const snap = await getDocs(collection(db, "barangays"));
        const list = snap.docs.map((doc) => doc.data().name).sort();
        setBarangayList(list);
      } catch (err) {
        console.log("Failed to fetch barangays:", err);
      }
    };
    fetchBarangays();
  }, []);

  useEffect(() => {
    const fetchPuroks = async () => {
      if (!editInfo.barangay) {
        setPurokList([]);
        return;
      }
      try {
        const q = query(
          collection(db, "barangays"),
          where("name", "==", editInfo.barangay)
        );
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docRef = snap.docs[0].ref;
          const purokSnap = await getDocs(collection(docRef, "puroks"));
          const list = purokSnap.docs.map((d) => d.data().name).sort();
          setPurokList(list);

          setEditInfo((prev) => ({
            ...prev,
            purok: list.includes(prev.purok) ? prev.purok : "",
          }));
        }
      } catch (err) {
        console.log("Failed to fetch puroks:", err);
      }
    };
    fetchPuroks();
  }, [editInfo.barangay]);

  const handleSaveEdit = async () => {
    try {
      setUploading(true);

      let userIdentifier = await AsyncStorage.getItem("user");
      if (!userIdentifier) return;

      let cleanIdentifier = userIdentifier;
      try {
        const parsed = JSON.parse(userIdentifier);
        if (typeof parsed === "object" && parsed !== null) {
          cleanIdentifier =
            parsed.username || parsed.email || parsed.id || userIdentifier;
        }
      } catch (e) { }
      cleanIdentifier = cleanIdentifier.toString().trim();

      const userQuery = query(
        collection(db, "users"),
        where("username", "==", cleanIdentifier)
      );
      const userSnap = await getDocs(userQuery);

      if (!userSnap.empty) {
        const userDocId = userSnap.docs[0].id;

        await updateDoc(doc(db, "users", userDocId), {
          firstName: editInfo.firstName,
          lastName: editInfo.lastName,
          email: editInfo.email,
          phone: editInfo.phone,
          dob: editInfo.dob,
          gender: editInfo.gender,
          status: editInfo.status,
          barangay: editInfo.barangay,
          purok: editInfo.purok,
        });

        setIsEditing(false);
        Alert.alert("Success", "Account information updated!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update account information.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2AA39A" />
        <Text style={styles.loadingText}>Loading your information...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Account Information</Text>
            <Text style={styles.headerSubtitle}>
              {isEditing ? "Update your details" : "Manage your profile"}
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* INFO SECTIONS */}
        <View style={styles.sectionContainer}>
          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="person-outline" size={20} color="#2AA39A" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>
            
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    placeholder="Enter first name"
                    placeholderTextColor="#9CA3AF"
                    value={editInfo.firstName}
                    editable={isEditing}
                    onChangeText={(t) => setEditInfo({ ...editInfo, firstName: t })}
                  />
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    placeholder="Enter last name"
                    placeholderTextColor="#9CA3AF"
                    value={editInfo.lastName}
                    editable={isEditing}
                    onChangeText={(t) => setEditInfo({ ...editInfo, lastName: t })}
                  />
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#9CA3AF"
                  value={editInfo.dob}
                  editable={isEditing}
                  onChangeText={(t) => setEditInfo({ ...editInfo, dob: t })}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Gender</Text>
                  <View style={[styles.pickerContainer, !isEditing && styles.inputDisabled]}>
                    {!isEditing && editInfo.gender && (
                      <Text style={styles.pickerDisplayText}>{editInfo.gender}</Text>
                    )}
                    {!isEditing && !editInfo.gender && (
                      <Text style={styles.pickerPlaceholder}>Select Gender</Text>
                    )}
                    {isEditing && (
                      <Picker
                        selectedValue={editInfo.gender}
                        onValueChange={(v) => setEditInfo({ ...editInfo, gender: v })}
                        enabled={true}
                        mode="dropdown"
                      >
                        <Picker.Item label="Select Gender" value="" />
                        <Picker.Item label="Male" value="Male" />
                        <Picker.Item label="Female" value="Female" />
                        <Picker.Item label="Other" value="Other" />
                      </Picker>
                    )}
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Civil Status</Text>
                  <View style={[styles.pickerContainer, !isEditing && styles.inputDisabled]}>
                    {!isEditing && editInfo.status && (
                      <Text style={styles.pickerDisplayText}>{editInfo.status}</Text>
                    )}
                    {!isEditing && !editInfo.status && (
                      <Text style={styles.pickerPlaceholder}>Select Status</Text>
                    )}
                    {isEditing && (
                      <Picker
                        selectedValue={editInfo.status}
                        onValueChange={(v) => setEditInfo({ ...editInfo, status: v })}
                        enabled={true}
                        mode="dropdown"
                      >
                        <Picker.Item label="Select Status" value="" />
                        <Picker.Item label="Single" value="Single" />
                        <Picker.Item label="Married" value="Married" />
                        <Picker.Item label="Divorced" value="Divorced" />
                        <Picker.Item label="Widowed" value="Widowed" />
                      </Picker>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="mail-outline" size={20} color="#2AA39A" />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            
            <View style={styles.card}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                  value={editInfo.email}
                  editable={isEditing}
                  keyboardType="email-address"
                  onChangeText={(t) => setEditInfo({ ...editInfo, email: t })}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  placeholder="Enter phone number"
                  placeholderTextColor="#9CA3AF"
                  value={editInfo.phone}
                  editable={isEditing}
                  keyboardType="phone-pad"
                  onChangeText={(t) => setEditInfo({ ...editInfo, phone: t })}
                />
              </View>
            </View>
          </View>

          {/* Address Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="location-outline" size={20} color="#2AA39A" />
              <Text style={styles.sectionTitle}>Address Information</Text>
            </View>
            
            <View style={styles.card}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Barangay</Text>
                <View style={[styles.pickerContainer, !isEditing && styles.inputDisabled]}>
                  {!isEditing && editInfo.barangay && (
                    <Text style={styles.pickerDisplayText}>{editInfo.barangay}</Text>
                  )}
                  {!isEditing && !editInfo.barangay && (
                    <Text style={styles.pickerPlaceholder}>Select Barangay</Text>
                  )}
                  {isEditing && (
                    <Picker
                      selectedValue={editInfo.barangay}
                      onValueChange={(v) =>
                        setEditInfo({ ...editInfo, barangay: v, purok: "" })
                      }
                      enabled={true}
                      mode="dropdown"
                    >
                      <Picker.Item label="Select Barangay" value="" />
                      {barangayList.map((b, idx) => (
                        <Picker.Item key={idx} label={b} value={b} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Purok</Text>
                <View style={[styles.pickerContainer, !isEditing && styles.inputDisabled]}>
                  {!isEditing && editInfo.purok && (
                    <Text style={styles.pickerDisplayText}>{editInfo.purok}</Text>
                  )}
                  {!isEditing && !editInfo.purok && (
                    <Text style={styles.pickerPlaceholder}>
                      {editInfo.barangay ? "Select Purok" : "Select Barangay first"}
                    </Text>
                  )}
                  {isEditing && (
                    <Picker
                      selectedValue={editInfo.purok}
                      onValueChange={(v) => setEditInfo({ ...editInfo, purok: v })}
                      enabled={!!editInfo.barangay}
                      mode="dropdown"
                    >
                      <Picker.Item
                        label={
                          editInfo.barangay ? "Select Purok" : "Select Barangay first"
                        }
                        value=""
                      />
                      {purokList.map((p, idx) => (
                        <Picker.Item key={idx} label={p} value={p} />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionContainer}>
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Icon name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Information</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editingButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsEditing(false);
                  loadUserData();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },

  // Sections
  sectionContainer: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },

  // Card
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 16,
  },

  // Fields
  row: {
    flexDirection: "row",
    gap: 12,
  },
  fieldContainer: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#111827",
  },
  inputDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#F3F4F6",
    color: "#6B7280",
  },

  // Picker
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    minHeight: 52,
    justifyContent: "center",
    overflow: "hidden",
  },
  pickerDisplayText: {
    fontSize: 15,
    color: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontWeight: "500",
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: "#9CA3AF",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  // Action Buttons
  actionContainer: {
    marginTop: 32,
  },
  editButton: {
    backgroundColor: "#2AA39A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#2AA39A",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  editingButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2AA39A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#2AA39A",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});