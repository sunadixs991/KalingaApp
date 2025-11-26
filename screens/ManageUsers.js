import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { TextInput } from "react-native";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigation = useNavigation();

  const goToRoot = (name, params) => {
    const parent = navigation.getParent();
    if (parent && typeof parent.navigate === "function") parent.navigate(name, params);
    else navigation.navigate(name, params);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setUsers(list);
        setFilteredUsers(list);
      } catch (error) {
        console.log("Failed to fetch users:", error);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter(
          u =>
            (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
            (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase()))
        )
      );
    }
  }, [search, users]);

  const handleShowDetails = (user) => {
    setSelectedUser(user);
    setDetailsModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#2d98da" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Citizens</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.container}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#555" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#e75e33" />
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              let bgColor = "#d4edda"; // green for 0 or undefined
              if (item.strike === 1) bgColor = "#fff9b4"; // orange for 1
              if (item.strike === 2) bgColor = "#ffe5b4"; // yellow for 2
              if (item.strike >= 3) bgColor = "#f8d7da"; // red for 3 or more
      return (
                <TouchableOpacity
                  style={[styles.userCard, { backgroundColor: bgColor }]}
                  onPress={() => handleShowDetails(item)}
                >
                  <Text style={styles.userName}>
                    {item.firstName} {item.lastName}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Account Details</Text>
            {selectedUser && (
              <View>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Full Name: </Text>
                  {selectedUser.firstName} {selectedUser.lastName}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Username: </Text>
                  {selectedUser.username}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Email: </Text>
                  {selectedUser.email}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Barangay: </Text>
                  {selectedUser.barangay}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Purok: </Text>
                  {selectedUser.purok || "N/A"}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>User Type: </Text>
                  {selectedUser.userType}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Strike: </Text>
                  {selectedUser.strike !== undefined ? selectedUser.strike : "0"}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Status: </Text>
                  {selectedUser.accountStatus}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Gender: </Text>
                  {selectedUser.gender}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Date of Birth: </Text>
                  {selectedUser.dob}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Phone: </Text>
                  {selectedUser.phone}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>Province: </Text>
                  {selectedUser.province}
                </Text>
                <Text style={styles.detailText}>
                  <Text style={styles.detailLabel}>City: </Text>
                  {selectedUser.city}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            {selectedUser?.userType === "Purok Leader" && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setDetailsModalVisible(false);
                  goToRoot("ManagePurokLeaders", { userId: selectedUser.id });
                }}
              >
                <Text style={styles.editButtonText}>Edit in Purok Leaders</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      <View style={styles.manageButtonsRow}>
        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => goToRoot("ManageLGUAdmins")}
        >
          <Text style={styles.manageButtonText}>LGU Admins</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => goToRoot("ManagePurokLeaders")}
        >
          <Text style={styles.manageButtonText}>Purok Leaders</Text>
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
    backgroundColor: "#fff",
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
    color: "#000",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
  },
  userCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  detailText: {
    fontSize: 15,
    color: "#333",
    marginBottom: 6,
  },
  detailLabel: {
    fontWeight: "bold",
    color: "#e75e33",
  },
  closeButton: {
    backgroundColor: "#e75e33",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 18,
    alignSelf: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  manageButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  manageButton: {
    backgroundColor: "#007bff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    elevation: 3,
  },
  manageButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  editButton: {
    backgroundColor: "#ffc107",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: "center",
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});