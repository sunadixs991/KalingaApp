import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserInfo } from "../services/getinfo";
import { useNavigation } from "@react-navigation/native";
import womanProfile from "../assets/woman.png";
import boyProfile from "../assets/boy.png";
import userProfile from "../assets/user.png";
import { useTheme } from "../context/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../services/supabaseClient";
import { db } from "../firebase";

import {
  query,
  collection,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { Picker } from "@react-native-picker/picker"; // Add this import if not present

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editInfo, setEditInfo] = useState({
    firstName: userInfo?.firstName || "",
    lastName: userInfo?.lastName || "",
    username: userInfo?.username || "",
    email: userInfo?.email || "",
    phone: userInfo?.phone || "",
    dob: userInfo?.dob || "",
    gender: userInfo?.gender || "",
    status: userInfo?.status || "",
    province: userInfo?.province || "",
    city: userInfo?.city || "",
    barangay: userInfo?.barangay || "",
  });

  const [profilePicUrl, setProfilePicUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [barangayList, setBarangayList] = useState([]);
  const [purokList, setPurokList] = useState([]);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem("userInfo");
      const userStr = await AsyncStorage.getItem("user");
      if (userInfoStr && userStr) {
        const parsedInfo = JSON.parse(userInfoStr);
        setIsLoggedIn(true);
        setIsAdmin(parsedInfo.isAdmin === true);
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    } catch (error) {
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (userInfo) {
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
      if (userInfo.profilePicUrl) setProfilePicUrl(userInfo.profilePicUrl);
    }
  }, [userInfo]);

  useEffect(() => {
    async function fetchProfile() {
      const username = await AsyncStorage.getItem("user");
      if (username) {
        const info = await getUserInfo(username);
        setUserInfo(info);
        if (info?.profilePicUrl) setProfilePicUrl(info.profilePicUrl);
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    // Fetch barangay list from Firestore
    const fetchBarangays = async () => {
      try {
        const snap = await getDocs(collection(db, "barangays"));
        const list = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.name) list.push(data.name);
        });
        setBarangayList(list);
      } catch (error) {
        console.log("Failed to fetch barangays:", error);
      }
    };
    fetchBarangays();
  }, []);

  useEffect(() => {
    // Fetch purok list when barangay changes
    const fetchPuroks = async () => {
      if (!editInfo.barangay) {
        setPurokList([]);
        setEditInfo((prev) => ({ ...prev, purok: "" }));
        return;
      }
      try {
        const barangayQuery = query(
          collection(db, "barangays"),
          where("name", "==", editInfo.barangay)
        );
        const barangaySnap = await getDocs(barangayQuery);
        if (!barangaySnap.empty) {
          const barangayDoc = barangaySnap.docs[0];
          const puroksSnap = await getDocs(
            collection(barangayDoc.ref, "puroks")
          );
          const list = [];
          puroksSnap.forEach((doc) => {
            const data = doc.data();
            if (data.name) list.push(data.name);
          });
          setPurokList(list);
        } else {
          setPurokList([]);
        }
        setEditInfo((prev) => ({ ...prev, purok: "" }));
      } catch (error) {
        console.log("Failed to fetch puroks:", error);
        setPurokList([]);
        setEditInfo((prev) => ({ ...prev, purok: "" }));
      }
    };
    fetchPuroks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editInfo.barangay]);

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("user");
          navigation.reset({
            index: 0,
            routes: [{ name: "Splash" }],
          });
        },
      },
    ]);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditInfo({
        firstName: userInfo?.firstName || "",
        lastName: userInfo?.lastName || "",
        username: userInfo?.username || "",
        email: userInfo?.email || "",
        phone: userInfo?.phone || "",
        dob: userInfo?.dob || "",
        gender: userInfo?.gender || "",
        status: userInfo?.status || "",
        province: userInfo?.province || "",
        city: userInfo?.city || "",
        barangay: userInfo?.barangay || "",
      });
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleModalClose = () => {
    setEditModalVisible(false);
    setIsEditing(false);
    setEditInfo({
      firstName: userInfo?.firstName || "",
      lastName: userInfo?.lastName || "",
      username: userInfo?.username || "",
      email: userInfo?.email || "",
      phone: userInfo?.phone || "",
      dob: userInfo?.dob || "",
      gender: userInfo?.gender || "",
      status: userInfo?.status || "",
      province: userInfo?.province || "",
      city: userInfo?.city || "",
      barangay: userInfo?.barangay || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      setEditModalVisible(false);
      setIsEditing(false);

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
          purok: editInfo.purok, // <-- Save purok
        });
        const info = await getUserInfo(cleanIdentifier);
        setUserInfo(info);
        Alert.alert("Success", "Account information updated!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update account information.");
    }
  };

  // --- FIXED Profile Picture Logic with expo-image-picker ---
  const handleSetProfilePicture = async () => {
    Alert.alert(
      "Select Photo",
      "Choose how you want to select your profile picture",
      [
        {
          text: "Camera",
          onPress: () => pickFromCamera(),
        },
        {
          text: "Gallery",
          onPress: () => pickFromGallery(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow camera access.");
        return;
      }

      setUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfilePicture(result.assets[0]);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
    setUploading(false);
  };

  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos."
        );
        return;
      }

      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "Images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfilePicture(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
      Alert.alert("Error", "Failed to open gallery. Please try again.");
    }
    setUploading(false);
  };

  const uploadProfilePicture = async (asset) => {
    try {
      // Upload to Supabase Storage
      const fileExt = asset.uri.split(".").pop();
      const fileName = `profile_${Date.now()}.${fileExt}`;

      // Fetch the image as blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from("profile-pictures")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL - FIXED: Use getPublicUrl correctly
      const { data: urlData } = supabase.storage
        .from("profile-pictures")
        .getPublicUrl(fileName);

      const publicURL = urlData.publicUrl; // Fixed property name

      setProfilePicUrl(publicURL);

      // Save URL to Firestore user profile
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

      // Query Firestore for user document
      const userQuery = query(
        collection(db, "users"),
        where("username", "==", cleanIdentifier)
      );
      const userSnap = await getDocs(userQuery);
      if (!userSnap.empty) {
        const userDocId = userSnap.docs[0].id;
        await updateDoc(doc(db, "users", userDocId), {
          profilePicUrl: publicURL,
        });
        setUserInfo((prev) => ({ ...prev, profilePicUrl: publicURL }));
      }

      setImageModalVisible(false);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", error.message || "Failed to set profile picture.");
    }
  };

  const removeProfilePicture = async () => {
    try {
      setProfilePicUrl(null);

      // Update Firestore to remove profile picture URL
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
        await updateDoc(doc(db, "users", userDocId), { profilePicUrl: null });
        setUserInfo((prev) => ({ ...prev, profilePicUrl: null }));
      }

      setImageModalVisible(false);
      Alert.alert("Success", "Profile picture removed!");
    } catch (error) {
      console.error("Remove error:", error);
      Alert.alert("Error", "Failed to remove profile picture.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#e75e33" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Profile Picture */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={() => setImageModalVisible(true)}>
              {profilePicUrl ? (
                <Image
                  source={{ uri: profilePicUrl }}
                  style={styles.profileImage}
                />
              ) : (
                <Image
                  source={
                    userInfo
                      ? userInfo.gender === "Female"
                        ? womanProfile
                        : userInfo.gender === "Male"
                          ? boyProfile
                          : userProfile
                      : userProfile
                  }
                  style={styles.profileImage}
                />
              )}
              {/* Camera Icon Overlay */}
              <View style={styles.cameraIconWrapper}>
                <Icon name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.name}>
              {userInfo
                ? `${String(userInfo.firstName || "Citizen")} ${String(userInfo.lastName || "")}`
                : "Citizen"}
            </Text>
            <Text style={styles.email}>{userInfo?.email || ""}</Text>
            {!userInfo && (
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => navigation.navigate("LoginScreen")}
              >
                <Icon name="person-outline" size={18} color="#e75e33" />
                <Text style={styles.signInText}>Sign in</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Settings Options */}
          <View style={styles.settingsList}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() =>
                navigation.navigate("AccountInfoScreen", {
                  userInfo: userInfo,
                  onUpdate: (updatedInfo) => setUserInfo(updatedInfo), // callback to update Profile screen
                })
              }
            >
              <Icon name="person-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Account Information</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("PinLogs")}
            >
              <Icon name="location-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Pin Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("PrivacyScreen")}
            >
              <Icon name="lock-closed-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("SettingsScreen")}
            >
              <Icon name="settings-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Settings</Text>
            </TouchableOpacity>
            {/* Admin Utilities - only visible for admin */}
            {isLoggedIn && isAdmin && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate("AdminUtils")}
              >
                <Icon
                  name="shield-checkmark-outline"
                  size={22}
                  color="#e75e33"
                />
                <Text
                  style={[
                    styles.settingText,
                    { color: "#e75e33", fontWeight: "bold" },
                  ]}
                >
                  Utilities
                </Text>
              </TouchableOpacity>
            )}
              <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("AboutUs")}
            >
              <Icon name="information-circle-outline" size={22} color="#555" />
              <Text style={styles.settingText}>About us</Text>
            </TouchableOpacity>
          </View>

          {/* Log Out */}
          {userInfo && (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <Icon name="log-out-outline" size={20} color="#e75e33" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* IMPROVED Modal for Profile Picture Actions */}
        <Modal
          visible={imageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setImageModalVisible(false)}
          >
            <View style={styles.actionSheet}>
              <Text style={styles.actionSheetTitle}>Profile Picture</Text>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleSetProfilePicture}
                disabled={uploading}
              >
                <Icon
                  name="camera-outline"
                  size={21}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.actionText}>
                  {uploading
                    ? "Uploading..."
                    : profilePicUrl
                      ? "Update Profile Picture"
                      : "Set Profile Picture"}
                </Text>
                {uploading && (
                  <ActivityIndicator
                    size="small"
                    color="#e75e33"
                    style={{ marginLeft: 10 }}
                  />
                )}
              </TouchableOpacity>

              {profilePicUrl && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={removeProfilePicture}
                >
                  <Icon
                    name="trash-outline"
                    size={20}
                    color="red"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.actionText, { color: "red" }]}>
                    Remove Profile Picture
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.cancelActionButton]}
                onPress={() => setImageModalVisible(false)}
              >
                <Text style={[styles.actionText, { color: "#666" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </ScrollView>

      {/* Edit Account Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleModalClose}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.3)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "85%",
              maxHeight: "70%",
              elevation: 5,
            }}
          >
            <ScrollView showsVerticalScrollIndicator={true}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", color: "#e75e33" }}
                >
                  {isEditing
                    ? "Edit Account Information"
                    : "Account Information"}
                </Text>
                <TouchableOpacity onPress={handleModalClose}>
                  <Icon
                    name="close"
                    size={20}
                    color="#333"
                    style={{
                      padding: 4,
                      backgroundColor: "#fff",
                      borderRadius: 6,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 3,
                      marginRight: 5,
                    }}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={editInfo.firstName}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, firstName: text })
                }
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={editInfo.lastName}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, lastName: text })
                }
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={editInfo.email}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, email: text })
                }
                keyboardType="email-address"
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone"
                value={editInfo.phone}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, phone: text })
                }
                keyboardType="phone-pad"
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="Gender"
                value={editInfo.gender}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, gender: text })
                }
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="Birthdate (YYYY-MM-DD)"
                value={editInfo.dob}
                onChangeText={(text) => setEditInfo({ ...editInfo, dob: text })}
                editable={isEditing}
              />
              {/* Status Dropdown */}
              <View style={styles.input}>
                <Text style={{ marginBottom: 5, color: "#333" }}>Status</Text>
                <Picker
                  selectedValue={editInfo.status}
                  onValueChange={(itemValue) =>
                    setEditInfo({ ...editInfo, status: itemValue })
                  }
                  enabled={isEditing}
                >
                  <Picker.Item label="Select Status" value="" />
                  <Picker.Item label="Single" value="Single" />
                  <Picker.Item label="Married" value="Married" />
                </Picker>
              </View>
              {/* Remove Province and City fields */}
              {/* Barangay Picker */}
              <View style={styles.input}>
                <Text style={{ marginBottom: 5, color: "#333" }}>Barangay</Text>
                <Picker
                  selectedValue={editInfo.barangay}
                  onValueChange={(itemValue) => {
                    setEditInfo((prev) => ({
                      ...prev,
                      barangay: itemValue,
                      purok: "", // Reset purok when barangay changes
                    }));
                  }}
                  enabled={isEditing}
                >
                  <Picker.Item label="Select Barangay" value="" />
                  {barangayList.map((name, idx) => (
                    <Picker.Item key={idx} label={name} value={name} />
                  ))}
                </Picker>
              </View>
              {/* Purok Picker */}
              <View style={styles.input}>
                <Text style={{ marginBottom: 5, color: "#333" }}>Purok</Text>
                <Picker
                  selectedValue={editInfo.purok || ""}
                  onValueChange={(itemValue) =>
                    setEditInfo((prev) => ({
                      ...prev,
                      purok: itemValue,
                    }))
                  }
                  enabled={isEditing && !!editInfo.barangay}
                >
                  <Picker.Item
                    label={
                      editInfo.barangay
                        ? "Select Purok"
                        : "Select Barangay first"
                    }
                    value=""
                  />
                  {purokList.map((name, idx) => (
                    <Picker.Item key={idx} label={name} value={name} />
                  ))}
                </Picker>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 18,
                }}
              >
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleEditToggle}
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
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  scrollContainer: {
    paddingBottom: 25,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: "#d9d9d9",
    marginBottom: 10,
    elevation: 4,
  },
  cameraIconWrapper: {
    position: "absolute",
    bottom: 8,
    right: 3,
    backgroundColor: "#49A5A2",
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: "#d9d9d9",
    elevation: 3,
  },
  container: {
    padding: 20,
  },
  profileSection: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#ccc",
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  email: {
    fontSize: 14,
    color: "#777",
    marginBottom: 10,
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCBE38",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  signInText: {
    marginLeft: 8,
    fontWeight: "bold",
    fontSize: 16,
  },
  settingsList: {
    marginBottom: 40,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  settingText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
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
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fff5f0",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
  },
  logoutText: {
    color: "#e75e33",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#49A5A2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  cancelButton: {
    marginRight: 10,
    backgroundColor: "#ccc",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: "#ffff",
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    elevation: 5,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#49A5A2",
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
  },
  cancelActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    marginBottom: 10,
    elevation: 2,
  },
  actionText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
