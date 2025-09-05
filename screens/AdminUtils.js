import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function AdminUtils() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Utilities</Text>
      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate("ManageContact")}
      >
        <Icon name="call-outline" size={28} color="#e75e33" style={styles.icon} />
        <Text style={styles.optionText}>Manage Contacts</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate("ManageBarangay")}
      >
        <Icon name="business-outline" size={28} color="#49A5A2" style={styles.icon} />
        <Text style={styles.optionText}>Manage Barangay</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate("ManageSchedule")}
      >
        <Icon name="calendar-outline" size={28} color="#007AFF" style={styles.icon} />
        <Text style={styles.optionText}>Manage Schedule</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.option}
        onPress={() => navigation.navigate("AnalyticsScreen")}
      >
        <Icon name="stats-chart-outline" size={28} color="#8e44ad" style={styles.icon} />
        <Text style={styles.optionText}>Analytics</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
    color: "#e75e33",
    alignSelf: "center",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
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