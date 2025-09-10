import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useTheme } from "../context/ThemeContext";

export default function SettingsScreen({ navigation }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const { isDarkMode, toggleDarkMode } = useTheme(); // ✅ still functional globally

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.header}>Settings</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Notifications */}
        <View style={styles.itemRow}>
          <Icon name="notifications-outline" size={22} color="#555" />
          <Text style={styles.itemText}>Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor={notificationsEnabled ? "#49A5A2" : "#ccc"}
          />
        </View>

        {/* App Preferences */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>App Preferences</Text>
        </View>
        {/* <View style={styles.itemRow}>
          <Icon name="moon-outline" size={22} color="#555" />
          <Text style={styles.itemText}>Dark Mode</Text>
          <Switch
            value={isDarkMode} // ✅ still controls global dark mode
            onValueChange={toggleDarkMode} // ✅ toggles dark mode for other screens
            thumbColor={isDarkMode ? "#49A5A2" : "#ccc"}
          />
        </View> */}

        <View style={styles.itemRow}>
          <Icon name="location-outline" size={22} color="#555" />
          <Text style={styles.itemText}>Location Services</Text>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            thumbColor={locationEnabled ? "#49A5A2" : "#ccc"}
          />
        </View>

        {/* General Settings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>General</Text>
        </View>
        <TouchableOpacity style={styles.generalItem}>
          <Icon name="language-outline" size={22} color="#555" />
          <Text style={styles.generalText}>Language</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.generalItem}>
          <Icon name="help-circle-outline" size={22} color="#555" />
          <Text style={styles.generalText}>Help & Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    justifyContent: "space-between",
  },
  itemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
  sectionHeader: {
    marginTop: 28,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#e75e33",
  },
  generalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  generalText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333",
  },
});
