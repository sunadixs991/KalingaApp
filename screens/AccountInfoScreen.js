import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

export default function AccountInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const userInfo = route.params?.userInfo || {};

  const [isEditing, setIsEditing] = useState(false);
  const [editInfo, setEditInfo] = useState({
    firstName: userInfo.firstName || "",
    lastName: userInfo.lastName || "",
    username: userInfo.username || "",
    email: userInfo.email || "",
    phone: userInfo.phone || "",
    dob: userInfo.dob || "",
    gender: userInfo.gender || "",
    status: userInfo.status || "",
    province: userInfo.province || "",
    city: userInfo.city || "",
    barangay: userInfo.barangay || "",
  });

  const handleEditToggle = () => {
    if (isEditing) {
      setEditInfo({
        firstName: userInfo.firstName || "",
        lastName: userInfo.lastName || "",
        username: userInfo.username || "",
        email: userInfo.email || "",
        phone: userInfo.phone || "",
        dob: userInfo.dob || "",
        gender: userInfo.gender || "",
        status: userInfo.status || "",
        province: userInfo.province || "",
        city: userInfo.city || "",
        barangay: userInfo.barangay || "",
      });
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    Alert.alert("Success", "Account information updated!");
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#e75e33" />
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Account Information</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          value={editInfo.firstName}
          onChangeText={(text) => setEditInfo({ ...editInfo, firstName: text })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          value={editInfo.lastName}
          onChangeText={(text) => setEditInfo({ ...editInfo, lastName: text })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={editInfo.email}
          onChangeText={(text) => setEditInfo({ ...editInfo, email: text })}
          keyboardType="email-address"
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone"
          value={editInfo.phone}
          onChangeText={(text) => setEditInfo({ ...editInfo, phone: text })}
          keyboardType="phone-pad"
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Gender"
          value={editInfo.gender}
          onChangeText={(text) => setEditInfo({ ...editInfo, gender: text })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Birthdate (YYYY-MM-DD)"
          value={editInfo.dob}
          onChangeText={(text) => setEditInfo({ ...editInfo, dob: text })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Status"
          value={editInfo.status}
          onChangeText={(text) => setEditInfo({ ...editInfo, status: text })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Province"
          value={editInfo.province}
          onChangeText={(text) => setEditInfo({ ...editInfo, province: text })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="City"
          value={editInfo.city}
          onChangeText={(text) => setEditInfo({ ...editInfo, city: text })}
          editable={isEditing}
        />
        <TextInput
          style={styles.input}
          placeholder="Barangay"
          value={editInfo.barangay}
          onChangeText={(text) => setEditInfo({ ...editInfo, barangay: text })}
          editable={isEditing}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleEditToggle}>
            <Text style={styles.cancelButtonText}>
              {isEditing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
          {isEditing && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "space-between",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
  },
  scrollContent: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 18,
  },
  cancelButton: {
    marginRight: 10,
    backgroundColor: "#ccc",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: "#e75e33",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
