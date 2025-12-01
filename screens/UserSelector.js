import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserSelector() {
  const navigation = useNavigation();

  const goToRoot = (name, params) => {
    const parent = navigation.getParent();
    if (parent && typeof parent.navigate === "function") parent.navigate(name, params);
    else navigation.navigate(name, params);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2d98da" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Users</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageCSWDAdmins")}
        >
          <Icon name="person-outline" size={28} color="#e67e22" style={styles.icon} />
          <Text style={styles.optionText}>CSWD Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageDRRMAdmins")}
        >
          <Icon name="shield-outline" size={28} color="#c0392b" style={styles.icon} />
          <Text style={styles.optionText}>DRRM Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => goToRoot("ManagePurokLeaders")}
        >
          <Icon name="people-circle-outline" size={28} color="#49A5A2" style={styles.icon} />
          <Text style={styles.optionText}>Purok Leaders</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("ManageUsers")}
        >
          <Icon name="people-outline" size={28} color="#2d98da" style={styles.icon} />
          <Text style={styles.optionText}>Citizens</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: "#2d98da",
    paddingVertical: 10,
    paddingHorizontal: 15,
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
    marginBottom: 18,
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