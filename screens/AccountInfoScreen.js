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
  const { onUpdate } = route.params || {};

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
      } catch (e) {}
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
      } catch (e) {}
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

        if (onUpdate) onUpdate(editInfo);

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
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F6F8", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#2AA39A" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F6F8" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            {isEditing ? "Edit Account Details" : "Account Information"}
          </Text>

          <View style={{ width: 26 }} />
        </View>

        {/* FORM CARD */}
        <View style={styles.card}>
          {/* FIRST NAME */}
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={editInfo.firstName}
            editable={isEditing}
            onChangeText={(t) => setEditInfo({ ...editInfo, firstName: t })}
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={editInfo.lastName}
            editable={isEditing}
            onChangeText={(t) => setEditInfo({ ...editInfo, lastName: t })}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={editInfo.email}
            editable={isEditing}
            onChangeText={(t) => setEditInfo({ ...editInfo, email: t })}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={editInfo.phone}
            editable={isEditing}
            onChangeText={(t) => setEditInfo({ ...editInfo, phone: t })}
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY"
            value={editInfo.dob}
            editable={isEditing}
            onChangeText={(t) => setEditInfo({ ...editInfo, dob: t })}
          />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={editInfo.gender}
              onValueChange={(v) => setEditInfo({ ...editInfo, gender: v })}
              enabled={isEditing}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          {/* STATUS */}
          <Text style={styles.label}>Civil Status</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={editInfo.status}
              onValueChange={(v) => setEditInfo({ ...editInfo, status: v })}
              enabled={isEditing}
            >
              <Picker.Item label="Select Status" value="" />
              <Picker.Item label="Single" value="Single" />
              <Picker.Item label="Married" value="Married" />
              <Picker.Item label="Divorced" value="Divorced" />
              <Picker.Item label="Widowed" value="Widowed" />
            </Picker>
          </View>

          {/* BARANGAY */}
          <Text style={styles.label}>Barangay</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={editInfo.barangay}
              onValueChange={(v) =>
                setEditInfo({ ...editInfo, barangay: v, purok: "" })
              }
              enabled={isEditing}
            >
              <Picker.Item label="Select Barangay" value="" />
              {barangayList.map((b, idx) => (
                <Picker.Item key={idx} label={b} value={b} />
              ))}
            </Picker>
          </View>

          {/* PUROK */}
          <Text style={styles.label}>Purok</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={editInfo.purok}
              onValueChange={(v) => setEditInfo({ ...editInfo, purok: v })}
              enabled={isEditing && !!editInfo.barangay}
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
          </View>
        </View>

        {/* BUTTONS */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing((prev) => !prev)}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity 
              style={[styles.saveButton, uploading && { opacity: 0.6 }]} 
              onPress={handleSaveEdit}
              disabled={uploading}
            >
              <Text style={styles.saveButtonText}>
                {uploading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
  },

  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
    marginTop: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },

  pickerBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    marginBottom: 6,
  },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
    gap: 10,
  },

  editButton: {
    backgroundColor: "#D1D5DB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  editButtonText: {
    fontWeight: "700",
    color: "#333",
  },

  saveButton: {
    backgroundColor: "#2AA39A",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});
