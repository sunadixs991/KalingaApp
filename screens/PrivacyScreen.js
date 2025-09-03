import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";

export default function PrivacyScreen({ navigation }) {
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.header}>Privacy</Text>
          {/* Empty view for alignment */}
          <View style={{ width: 28 }} />
        </View>

        {/* Change Password */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => setChangePasswordVisible(true)}
        >
          <Icon name="lock-closed-outline" size={22} color="#555" />
          <Text style={styles.itemText}>Change Password</Text>
        </TouchableOpacity>

        {/* Login Activity */}
        <TouchableOpacity style={styles.item}>
          <Icon name="time-outline" size={22} color="#555" />
          <Text style={styles.itemText}>Login Activity</Text>
        </TouchableOpacity>
        <Text style={styles.infoText}>
          Recent login activity will be shown here.
        </Text>

        {/* Privacy Policy Link */}
        <TouchableOpacity
          style={styles.item}
          onPress={() =>
            Linking.openURL("https://your-privacy-policy-link.com")
          }
        >
          <Icon name="document-text-outline" size={22} color="#555" />
          <Text style={styles.itemText}>Privacy Policy</Text>
        </TouchableOpacity>

        {/* Change Password Modal */}
        <Modal
          visible={changePasswordVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setChangePasswordVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>Change Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry
              />

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: "#ccc" }]}
                  onPress={() => setChangePasswordVisible(false)}
                >
                  <Text style={[styles.cancelButtonText, { color: "#333" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setChangePasswordVisible(false)}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  itemText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  infoText: {
    fontSize: 13,
    color: "#888",
    marginBottom: 18,
    marginLeft: 34,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    elevation: 5,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
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
    justifyContent: "space-between",
    marginTop: 15,
  },
  saveButton: {
    backgroundColor: "#e75e33",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  cancelButton: {
    paddingHorizontal: 35,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "bold",
    fontSize: 15,
  },
});
