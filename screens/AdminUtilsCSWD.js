import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminUtilsCSWD() {
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
        <Text style={styles.topBarTitle}>LGU Admin Utilities</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Contact Details */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageContact")}
        >
          <Icon name="call-outline" size={28} color="#e75e33" style={styles.icon} />
          <Text style={styles.optionText}>Contact Details</Text>
        </TouchableOpacity>

        {/* Food Distribution Schedules */}
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageSchedule")}
        >
          <Icon name="calendar-outline" size={28} color="#007AFF" style={styles.icon} />
          <Text style={styles.optionText}>Food Distribution Schedules</Text>
        </TouchableOpacity>

        {/* Purok Leaders */}
        {/* <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManagePurokLeaders")}
        >
          <Icon name="people-circle-outline" size={28} color="#49A5A2" style={styles.icon} />
          <Text style={styles.optionText}>Purok Leaders</Text>
        </TouchableOpacity> */}
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