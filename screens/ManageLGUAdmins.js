import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, TextInput, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

export default function ManageLGUAdmins() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userType, setUserType] = useState("user");
  const navigation = useNavigation();

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
            (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase())) ||
            (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
            (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
            (u.barangay && u.barangay.toLowerCase().includes(search.toLowerCase())) ||
            (u.purok && u.purok.toLowerCase().includes(search.toLowerCase()))
        )
      );
    }
  }, [search, users]);

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserType(user.userType || "user");
    setEditModalVisible(true);
  };

  const handleSaveUserType = async () => {  
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, "users", selectedUser.id), { userType });
      setUsers(prev =>
        prev.map(u => (u.id === selectedUser.id ? { ...u, userType } : u))
      );
      setEditModalVisible(false);
    } catch (error) {
      console.log("Failed to update user type:", error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage LGU Admins</Text>
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
             let bgColor = "#f7f7f7"; // default
             if (item.userType === "LGU Admin") bgColor = "#d4edda"; // green for LGU Admin

              return (
                <TouchableOpacity
                  style={[styles.userCard, { backgroundColor: bgColor }]}
                  onPress={() => handleEditUser(item)}
                >
                  <Text style={styles.userName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  <Text style={styles.userInfo}>
                    Barangay: {item.barangay || "N/A"}
                  </Text>
                  <Text style={styles.userInfo}>
                   Division: {item.division || "N/A"}
                  </Text>
                  <Text style={styles.userInfo}>
                    User Type: {item.userType || "user"}  
                  </Text>
                  <Text style={styles.editText}>Tap to edit</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User Type</Text>
            <Text style={styles.modalLabel}>
              {selectedUser?.firstName} {selectedUser?.lastName}
            </Text>
            <View style={styles.userTypeOptions}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === "user" && styles.userTypeSelected,
                ]}
                onPress={() => setUserType("user")}
              >
                <Text style={styles.userTypeText}>User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === "LGU Admin" && styles.userTypeSelected,
                ]}
                onPress={() => setUserType("LGU Admin")}
              >
                <Text style={styles.userTypeText}>LGU Admin</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveUserType}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
  },
  userInfo: {
    fontSize: 15,
    color: "#555",
    marginTop: 2,
  },
  editText: {
    fontSize: 13,
    color: "#e75e33",
    marginTop: 8,
    fontStyle: "italic",
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
    color: "#e75e33",
    marginBottom: 12,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 18,
    textAlign: "center",
  },
  userTypeOptions: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 18,
  },
  userTypeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    marginHorizontal: 8,
  },
  userTypeSelected: {
    backgroundColor: "#e75e33",
  },
  userTypeText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "bold",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#49A5A2",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  cancelButton: {
    backgroundColor: "#ccc",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 15,
  },
});