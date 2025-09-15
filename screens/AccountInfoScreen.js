import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
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
import { getUserInfo } from "../services/getinfo";

export default function AccountInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userInfo, onUpdate } = route.params;
  const [uploading, setUploading] = useState(false);

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
  const [isEditing, setIsEditing] = useState(false);
  const [barangayList, setBarangayList] = useState([]);
  const [purokList, setPurokList] = useState([]);

  useEffect(() => {
    if (userInfo) {
      setEditInfo({
        firstName: userInfo.firstName || "",
        lastName: userInfo.lastName || "",
        email: userInfo.email || "",
        phone: userInfo.phone || "",
        dob: userInfo.dob || "",
        gender: userInfo.gender || "",
        status: userInfo.status || "",
        barangay: userInfo.barangay || "",
        purok: userInfo.purok || "",
      });
    }
  }, [userInfo]);

  // Fetch Barangays
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

  // Fetch Puroks when Barangay changes
  useEffect(() => {
    const fetchPuroks = async () => {
      if (!editInfo.barangay) {
        setPurokList([]);
        setEditInfo((prev) => ({ ...prev, purok: "" }));
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
      setUploading(true); // optional for loader
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

        // Manually update userInfo state immediately
        if (onUpdate) {
          onUpdate(editInfo); // <-- this updates Profile screen immediately
        }
        setIsEditing(false);
        Alert.alert("Success", "Account information updated!");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to update account information.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} color="#e75e33" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", flex: 1 }}>
            {isEditing ? "Edit Account Information" : "Account Information"}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={editInfo.firstName}
          onChangeText={(t) => setEditInfo({ ...editInfo, firstName: t })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={editInfo.lastName}
          onChangeText={(t) => setEditInfo({ ...editInfo, lastName: t })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={editInfo.email}
          onChangeText={(t) => setEditInfo({ ...editInfo, email: t })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          value={editInfo.phone}
          onChangeText={(t) => setEditInfo({ ...editInfo, phone: t })}
          editable={isEditing}
        />

        {/* Status Picker */}
        <View style={styles.input}>
          <Picker
            selectedValue={editInfo.status}
            onValueChange={(v) => setEditInfo({ ...editInfo, status: v })}
            enabled={isEditing}
          >
            <Picker.Item label="Select Status" value="" />
            <Picker.Item label="Single" value="Single" />
            <Picker.Item label="Married" value="Married" />
          </Picker>
        </View>

        {/* Barangay Picker */}
        <View style={styles.input}>
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

        {/* Purok Picker */}
        <View style={styles.input}>
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

        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setIsEditing((prev) => !prev)}
          >
            <Text style={styles.cancelButtonText}>
              {isEditing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>

          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveEdit}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  cancelButton: {
    marginRight: 10,
    backgroundColor: "#ccc",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#49A5A2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
