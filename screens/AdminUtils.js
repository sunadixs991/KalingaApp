import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminUtils() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Admin Utilities</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Options Section */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageContact")}
        >
          <Icon name="call-outline" size={28} color="#e75e33" style={styles.icon} />
          <Text style={styles.optionText}>Contact Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageBarangay")}
        >
          <Icon name="business-outline" size={28} color="#49A5A2" style={styles.icon} />
          <Text style={styles.optionText}>Barangay Management</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageSchedule")}
        >
          <Icon name="calendar-outline" size={28} color="#007AFF" style={styles.icon} />
          <Text style={styles.optionText}>Food Distribution Schedules</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("AnalyticsScreen")}
        >
          <Icon name="stats-chart-outline" size={28} color="#8e44ad" style={styles.icon} />
          <Text style={styles.optionText}>Analytics</Text>
        </TouchableOpacity>

        {/* UPDATED: Users Option */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("UserSelector")}
        >
          <Icon name="people-outline" size={28} color="#2d98da" style={styles.icon} />
          <Text style={styles.optionText}>User Account Management</Text>
        </TouchableOpacity>

        {/* NEW: Users Activity */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ActivitySelector")}
        >
          <Icon name="pulse-outline" size={28} color="#e67e22" style={styles.icon} />
          <Text style={styles.optionText}>Activity</Text>
        </TouchableOpacity>

        {/* NEW: Manage Category */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageCategory")}
        >
          <Icon name="pricetags-outline" size={28} color="#16a085" style={styles.icon} />
          <Text style={styles.optionText}>Category Details</Text>
        </TouchableOpacity>

        {/* NEW: Manage Evacuation Pins */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageEvacuationPins")}
        >
          <Icon name="home-outline" size={28} color="#1976D2" style={styles.icon} />
          <Text style={styles.optionText}>Pinned Facilities</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManagePins")}
        >
          <Icon name="pin-outline" size={28} color="#EC6135" style={styles.icon} />
          <Text style={styles.optionText}>User Pin Management</Text>
        </TouchableOpacity>

        {/* NEW: Deleted Pins */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("DeletedPins")}
        >
          <Icon name="trash-outline" size={28} color="#888" style={styles.icon} />
          <Text style={styles.optionText}>Deleted Pins</Text>
        </TouchableOpacity>

        {/* NEW: Manage Feedbacks */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageFeedback")}
        >
          <Icon
            name="chatbox-ellipses-outline"
            size={28}
            color="#FF9800"
            style={styles.icon}
          />
          <Text style={styles.optionText}>Feedbacks</Text>
        </TouchableOpacity>

        {/* NEW: Security Logs */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("SecurityLogs")}
        >
          <Icon name="shield-outline" size={28} color="#d9534f" style={styles.icon} />
          <Text style={styles.optionText}>Security Logs</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#e75e33",
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  container: {
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "flex-start",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  icon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "500",
  },
});
