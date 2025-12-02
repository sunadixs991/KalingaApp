import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Linking,
  ScrollView,
  Alert,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PrivacyScreen({ navigation }) {
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Login Activity State
  const [loginActivityVisible, setLoginActivityVisible] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);

  // password validation + visibility toggles
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false,
    special: false,
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const checks = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      digit: /\d/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
    setPasswordChecks(checks);
  }, [newPassword]);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (!Object.values(passwordChecks).every(Boolean)) {
      Alert.alert(
        "Error",
        "New password does not meet requirements. See the checklist below."
      );
      return;
    }

    setLoading(true);
    try {
      // Get the stored user identifier from AsyncStorage
      let userIdentifier = await AsyncStorage.getItem("user");

      // Try other possible keys if "user" doesn't exist
      if (!userIdentifier) {
        const possibleKeys = [
          "username",
          "userEmail",
          "currentUser",
          "loggedInUser",
        ];
        for (const key of possibleKeys) {
          userIdentifier = await AsyncStorage.getItem(key);
          if (userIdentifier) break;
        }
      }

      if (!userIdentifier) {
        Alert.alert(
          "Error",
          "No user is currently logged in. Please log in again."
        );
        setLoading(false);
        return;
      }

      // Parse if stored as JSON
      let cleanIdentifier = userIdentifier;
      try {
        const parsed = JSON.parse(userIdentifier);
        if (typeof parsed === "object" && parsed !== null) {
          cleanIdentifier =
            parsed.username || parsed.email || parsed.id || userIdentifier;
        }
      } catch (e) {
        // It's a plain string, use as is
      }

      cleanIdentifier = cleanIdentifier.toString().trim();
      console.log("Looking for user with identifier:", cleanIdentifier);

      // Query Firestore to find user document by username or email
      let userDoc = null;
      let userDocId = null;

      // Try direct document access first
      const directDocRef = doc(db, "users", cleanIdentifier);
      const directDocSnap = await getDoc(directDocRef);
      if (directDocSnap.exists()) {
        userDoc = directDocSnap;
        userDocId = cleanIdentifier;
        console.log("Found user by direct document ID");
      } else {
        // Try querying by username
        const usernameQuery = query(
          collection(db, "users"),
          where("username", "==", cleanIdentifier)
        );
        const usernameSnap = await getDocs(usernameQuery);
        if (!usernameSnap.empty) {
          userDoc = usernameSnap.docs[0];
          userDocId = userDoc.id;
          console.log("Found user by username field");
        } else {
          // Try querying by email
          const emailQuery = query(
            collection(db, "users"),
            where("email", "==", cleanIdentifier)
          );
          const emailSnap = await getDocs(emailQuery);
          if (!emailSnap.empty) {
            userDoc = emailSnap.docs[0];
            userDocId = userDoc.id;
            console.log("Found user by email field");
          }
        }
      }

      if (!userDoc) {
        Alert.alert(
          "Error",
          `User not found. Searched for: ${cleanIdentifier}\n\nMake sure you're logged in with the correct account.`
        );
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      console.log("Found user data with fields:", Object.keys(userData));

      // Verify current password
      if (userData.password !== currentPassword) {
        Alert.alert("Error", "Current password is incorrect.");
        setLoading(false);
        return;
      }

      // Update password in Firestore using the actual document ID
      const userRef = doc(db, "users", userDocId);
      await updateDoc(userRef, { password: newPassword });

      Alert.alert("Success", "Password updated successfully!");
      setChangePasswordVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.log("Error updating password:", error);
      Alert.alert("Error", `Failed to update password: ${error.message}`);
    }
    setLoading(false);
  };

  const fetchLoginHistory = async () => {
    setLoginLoading(true);
    try {
      let userIdentifier = await AsyncStorage.getItem("user");
      if (!userIdentifier) {
        const possibleKeys = [
          "username",
          "userEmail",
          "currentUser",
          "loggedInUser",
        ];
        for (const key of possibleKeys) {
          userIdentifier = await AsyncStorage.getItem(key);
          if (userIdentifier) break;
        }
      }
      if (!userIdentifier) {
        setLoginHistory([]);
        setLoginLoading(false);
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

      // Query login_activity for this user, order by timestamp desc, limit 20
      const q = query(
        collection(db, "login_activity"),
        where("username", "==", cleanIdentifier)
      );
      const snap = await getDocs(q);
      const history = [];
      snap.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : null,
        });
      });
      console.log("Fetched login history:", history);
      setLoginHistory(history);
    } catch (error) {
      setLoginHistory([]);
    }
    setLoginLoading(false);
  };

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
        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            setLoginActivityVisible(true);
            fetchLoginHistory();
          }}
        >
          <Icon name="time-outline" size={22} color="#555" />
          <Text style={styles.itemText}>Login Activity</Text>
        </TouchableOpacity>
        <Text style={styles.infoText}>
          Recent login activity will be shown here.
        </Text>

        {/* Privacy Policy */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => navigation.navigate("PrivacyPolicy")}
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

              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Current Password"
                  placeholderTextColor="#999"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  importantForAutofill="yes"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={{ marginLeft: 8 }}
                >
                  <Icon
                    name={showCurrentPassword ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="New Password"
                  placeholderTextColor="#999"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  textContentType="newPassword"
                  importantForAutofill="yes"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={{ marginLeft: 8 }}
                >
                  <Icon
                    name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#999"
                  value={confirmNewPassword}
                  onChangeText={setConfirmNewPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  textContentType="password"
                  importantForAutofill="yes"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ marginLeft: 8 }}
                >
                  <Icon
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.requirementsSmall}>
                <Text
                  style={
                    passwordChecks.length
                      ? styles.okText
                      : styles.failText
                  }
                >
                  • Minimum 8 characters
                </Text>
                <Text
                  style={
                    passwordChecks.uppercase
                      ? styles.okText
                      : styles.failText
                  }
                >
                  • At least one uppercase letter
                </Text>
                <Text
                  style={
                    passwordChecks.lowercase
                      ? styles.okText
                      : styles.failText
                  }
                >
                  • At least one lowercase letter
                </Text>
                <Text style={passwordChecks.digit ? styles.okText : styles.failText}>
                  • At least one digit
                </Text>
                <Text style={passwordChecks.special ? styles.okText : styles.failText}>
                  • At least one special character (e.g. !@#$%)
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: "#ccc" }]}
                  onPress={() => setChangePasswordVisible(false)}
                  disabled={loading}
                >
                  <Text style={[styles.cancelButtonText, { color: "#333" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? "Saving..." : "Save"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Login Activity Modal */}
        <Modal
          visible={loginActivityVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setLoginActivityVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: 400 }]}>
              <Text style={styles.modalHeader}>Recent Login Activity</Text>
              {loginLoading ? (
                <Text style={{ textAlign: "center", marginTop: 20 }}>
                  Loading...
                </Text>
              ) : loginHistory.length === 0 ? (
                <Text
                  style={{ textAlign: "center", marginTop: 20, color: "#888" }}
                >
                  No login history found.
                </Text>
              ) : (
                <FlatList
                  data={loginHistory}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) => (
                    <View style={styles.loginRow}>
                      <Icon
                        name="time-outline"
                        size={20}
                        color="#e75e33"
                        style={{ marginRight: 10 }}
                      />
                      <Text style={styles.loginText}>
                        {item.timestamp
                          ? item.timestamp.toLocaleString()
                          : "Unknown time"}
                      </Text>
                    </View>
                  )}
                  style={{ marginTop: 10 }}
                />
              )}
              <TouchableOpacity
                style={[styles.saveButton, { marginTop: 18 }]}
                onPress={() => setLoginActivityVisible(false)}
              >
                <Text style={styles.saveButtonText}>Close</Text>
              </TouchableOpacity>
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
    color: "#333", // ensure typed text is visible
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  requirementsSmall: {
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  saveButton: {
    backgroundColor: "#49A5A2",
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
  loginRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  loginText: {
    fontSize: 15,
    color: "#333",
  },
  okText: { color: "green", fontSize: 14 },
  failText: { color: "red", fontSize: 14 },
});
