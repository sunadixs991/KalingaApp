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
  SafeAreaView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserInfo } from "../services/getinfo";
import { useNavigation } from "@react-navigation/native";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [userInfo, setUserInfo] = useState(null);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Profile Picture */}
          <View style={styles.profileSection}>
            <Image
              source={require("../assets/Kalinga_logo.png")}
              style={styles.avatar}
            />
            <Text style={styles.name}>
              {userInfo
                ? `${userInfo.firstName?.trim() || "Citizen"} ${userInfo.lastName?.trim() || ""}`
                : "Citizen"}
            </Text>
            <Text style={styles.email}>{userInfo?.email || "No Email"}</Text>
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
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="person-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Account Information</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="lock-closed-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="notifications-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="settings-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
              <Icon name="construct-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate("AnalyticsScreen")}
            >
              <Icon name="analytics-outline" size={22} color="#555" />
              <Text style={styles.settingText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingItem}>
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
      </ScrollView>
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
    marginTop: 3,
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
});
