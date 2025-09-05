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

  // Temporary (UI only)
  const [hasProfilePicture, setHasProfilePicture] = useState(false);

  // Admin check logic (same as FoodDistribution.js)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
    }
  }, [userInfo]);

  useEffect(() => {
    async function fetchProfile() {
      const username = await AsyncStorage.getItem("user");
      if (username) {
        const info = await getUserInfo(username);
        setUserInfo(info);
      }
    }
    fetchProfile();
  }, []);

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
      // Cancel: reset fields and disable editing
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

  const handleSaveEdit = () => {
    // TODO: Save updated info to your backend or AsyncStorage
    // For now, just close modal
    setEditModalVisible(false);
    // Optionally, update userInfo state here
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#e75e33" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Profile Picture */}
          <View style={styles.profileSection}>
            <TouchableOpacity onPress={() => setImageModalVisible(true)}>
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
              onPress={() => setEditModalVisible(true)}
            >
              <Icon name="person-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Account Information</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("PrivacyScreen")}
            >
              <Icon name="lock-closed-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Privacy</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.settingItem}>
              <Icon name="notifications-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Notifications</Text>
            </TouchableOpacity> */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("SettingsScreen")}
            >
              <Icon name="settings-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Settings</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.settingItem}>
              <Icon name="construct-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Report</Text>
            </TouchableOpacity> */}
            {/* <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("AnalyticsScreen")}
            >
              <Icon name="analytics-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Analytics</Text>
            </TouchableOpacity> */}
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="information-circle-outline" size={22} color="#555" />
              <Text style={styles.settingText}>About us</Text>
            </TouchableOpacity>
            {/* Admin Utilities - only visible for admin */}
            {isLoggedIn && isAdmin && (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => navigation.navigate("AdminUtils")}
              >
                <Icon name="shield-checkmark-outline" size={22} color="#e75e33" />
                <Text style={[styles.settingText, { color: "#e75e33", fontWeight: "bold" }]}>
                  Admin Utilities
                </Text>
              </TouchableOpacity>
            )}
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
        {/* Modal */}
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
              {hasProfilePicture ? (
                <>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionText}>
                      Update Profile Picture
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={[styles.actionText, { color: "red" }]}>
                      Remove Profile Picture
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionText}>Set Profile Picture</Text>
                </TouchableOpacity>
              )}
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
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  {isEditing
                    ? "Edit Account Information"
                    : "Account Information"}
                </Text>
                <TouchableOpacity onPress={handleModalClose}>
                  <Icon
                    name="close"
                    size={24}
                    color="#333"
                    style={{
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
              <TextInput
                style={styles.input}
                placeholder="Status"
                value={editInfo.status}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, status: text })
                }
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="Province"
                value={editInfo.province}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, province: text })
                }
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="City"
                value={editInfo.city}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, city: text })
                }
                editable={isEditing}
              />
              <TextInput
                style={styles.input}
                placeholder="Barangay"
                value={editInfo.barangay}
                onChangeText={(text) =>
                  setEditInfo({ ...editInfo, barangay: text })
                }
                editable={isEditing}
              />

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
    borderWidth: 1,
    marginBottom: 10,
  },
  container: {
    padding: 20,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 30,
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
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: {
    color: "#e75e33",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: "#e75e33",
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
    backgroundColor: "#dfdfdf",
    padding: 20,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    elevation: 5,
  },
  actionButton: {
    padding: 15,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
  },
  actionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
});
