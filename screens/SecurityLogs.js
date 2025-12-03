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
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

export default function SecurityLogs() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("All");
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [searchUsername, setSearchUsername] = useState("");

  useEffect(() => {
    fetchSecurityLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filter, searchUsername]);

  const fetchSecurityLogs = async () => {
    setLoading(true);
    try {
      // Fetch login activity
      const loginActivityRef = collection(db, "login_activity");
      const q = query(loginActivityRef, orderBy("timestamp", "desc"));
      const querySnapshot = await getDocs(q);

      const logList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "login",
        ...doc.data(),
      }));

      // Fetch security events
      const securityEventsRef = collection(db, "security_events");
      const secQ = query(securityEventsRef, orderBy("timestamp", "desc"));
      const secSnapshot = await getDocs(secQ);

      const securityEventsList = secSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "security_event",
        ...doc.data(),
      }));

      // Fetch security alerts
      const securityAlertsRef = collection(db, "security_alerts");
      const alertQ = query(securityAlertsRef, orderBy("timestamp", "desc"));
      const alertSnapshot = await getDocs(alertQ);

      const securityAlertsList = alertSnapshot.docs.map((doc) => ({
        id: doc.id,
        type: "security_alert",
        ...doc.data(),
      }));

      // Combine all logs and sort by timestamp
      const allLogs = [...logList, ...securityEventsList, ...securityAlertsList].sort(
        (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
      );

      setLogs(allLogs);
      setFilteredLogs(allLogs);
    } catch (error) {
      console.log("Failed to fetch security logs:", error);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSecurityLogs();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by type
    if (filter !== "All") {
      if (filter === "Successful Logins") {
        filtered = filtered.filter((log) => log.type === "login" && log.success === true);
      } else if (filter === "Failed Logins") {
        filtered = filtered.filter((log) => log.type === "login" && log.success === false);
      } else if (filter === "Security Events") {
        filtered = filtered.filter((log) => log.type === "security_event");
      } else if (filter === "Security Alerts") {
        filtered = filtered.filter((log) => log.type === "security_alert");
      }
    }

    // Filter by username
    if (searchUsername.trim() !== "") {
      filtered = filtered.filter((log) =>
        (log.username || "").toLowerCase().includes(searchUsername.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  };

  const getStatusColor = (log) => {
    if (log.type === "security_alert") return "#ff4444";
    if (log.type === "security_event") return "#ff9800";
    if (log.type === "login" && log.success) return "#4CAF50";
    if (log.type === "login" && !log.success) return "#ff6b6b";
    return "#999";
  };

  const getStatusIcon = (log) => {
    if (log.type === "security_alert") return "shield-alert";
    if (log.type === "security_event") return "alert-circle";
    if (log.type === "login" && log.success) return "checkmark-circle";
    if (log.type === "login" && !log.success) return "close-circle";
    return "help-circle";
  };

  const getStatusLabel = (log) => {
    if (log.type === "security_alert") return "🔒 Security Alert";
    if (log.type === "security_event") return "⚠️ Security Event";
    if (log.type === "login" && log.success) return "✅ Successful Login";
    if (log.type === "login" && !log.success) return "❌ Failed Login";
    return "❓ Unknown";
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return "N/A";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  const renderLogItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.logCard, { borderLeftColor: getStatusColor(item) }]}
      onPress={() => {
        setSelectedLog(item);
        setDetailsModalVisible(true);
      }}
    >
      <View style={styles.logHeader}>
        <Icon
          name={getStatusIcon(item)}
          size={24}
          color={getStatusColor(item)}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.logStatus}>{getStatusLabel(item)}</Text>
          <Text style={styles.logUsername}>{item.username || "Unknown"}</Text>
        </View>
        <Icon name="chevron-forward" size={20} color="#ccc" />
      </View>
      <View style={styles.logFooter}>
        <Text style={styles.logDate}>{formatDate(item.timestamp)}</Text>
        {item.userType && (
          <Text style={styles.logUserType}>{item.userType}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

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
        <Text style={styles.topBarTitle}>Security Logs</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#555" style={{ marginRight: 8 }} />
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchLabel}>Search by username:</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={searchUsername}
              onChangeText={setSearchUsername}
              placeholder="Type username..."
              placeholderTextColor="#999"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchUsername ? (
              <TouchableOpacity onPress={() => setSearchUsername("")} style={styles.clearButton}>
                <Icon name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {/* Filter Dropdown */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by:</Text>
        <Picker
          selectedValue={filter}
          style={styles.picker}
          onValueChange={(value) => setFilter(value)}
          mode="dropdown"
        >
          <Picker.Item label="All Logs" value="All" />
          <Picker.Item label="✅ Successful Logins" value="Successful Logins" />
          <Picker.Item label="❌ Failed Logins" value="Failed Logins" />
          <Picker.Item label="⚠️ Security Events" value="Security Events" />
          <Picker.Item label="🔒 Security Alerts" value="Security Alerts" />
        </Picker>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Logs</Text>
          <Text style={styles.statValue}>{filteredLogs.length}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Successful</Text>
          <Text style={[styles.statValue, { color: "#4CAF50" }]}>
            {logs.filter((l) => l.type === "login" && l.success).length}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Failed</Text>
          <Text style={[styles.statValue, { color: "#ff6b6b" }]}>
            {logs.filter((l) => l.type === "login" && !l.success).length}
          </Text>
        </View>
      </View>

      {/* Logs List */}
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#e75e33" />
        ) : filteredLogs.length === 0 ? (
          <Text style={styles.emptyText}>No security logs found.</Text>
        ) : (
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            renderItem={renderLogItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>

      {/* Details Modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedLog && (
              <ScrollView style={styles.modalBody}>
                {/* Status */}
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <Icon
                      name={getStatusIcon(selectedLog)}
                      size={24}
                      color={getStatusColor(selectedLog)}
                    />
                    <Text style={styles.detailLabel}>Status</Text>
                  </View>
                  <Text style={styles.detailValue}>{getStatusLabel(selectedLog)}</Text>
                </View>

                {/* Username */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>👤 Username</Text>
                  <Text style={styles.detailValue}>{selectedLog.username || "N/A"}</Text>
                </View>

                {/* User Type */}
                {selectedLog.userType && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>👨‍💼 User Type</Text>
                    <Text style={styles.detailValue}>{selectedLog.userType}</Text>
                  </View>
                )}

                {/* Timestamp */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>📅 Timestamp</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedLog.timestamp)}</Text>
                </View>

                {/* Device/Platform */}
                {selectedLog.deviceInfo && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>📱 Device</Text>
                    <Text style={styles.detailValue}>{selectedLog.deviceInfo}</Text>
                  </View>
                )}

                {selectedLog.platform && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>💻 Platform</Text>
                    <Text style={styles.detailValue}>{selectedLog.platform}</Text>
                  </View>
                )}

                {/* Success Status */}
                {selectedLog.success !== undefined && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>✔️ Success</Text>
                    <Text style={[styles.detailValue, { color: selectedLog.success ? "#4CAF50" : "#ff6b6b" }]}>
                      {selectedLog.success ? "Yes" : "No"}
                    </Text>
                  </View>
                )}

                {/* Event Type */}
                {selectedLog.eventType && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>🔔 Event Type</Text>
                    <Text style={styles.detailValue}>{selectedLog.eventType}</Text>
                  </View>
                )}

                {/* Details */}
                {selectedLog.details && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ℹ️ Details</Text>
                    <Text style={styles.detailValue}>{selectedLog.details}</Text>
                  </View>
                )}

                {/* Reason */}
                {selectedLog.reason && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>⚠️ Reason</Text>
                    <Text style={styles.detailValue}>{selectedLog.reason}</Text>
                  </View>
                )}

                {/* IP Address */}
                {selectedLog.ipAddress && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>🌐 IP Address</Text>
                    <Text style={styles.detailValue}>{selectedLog.ipAddress}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#eee",
    color: "#333",
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
  refreshButton: {
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
    flex: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  clearButton: {
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterLabel: {
    fontSize: 14,
    color: "#333",
    marginRight: 10,
    fontWeight: "bold",
  },
  picker: {
    flex: 1,
    height: 40,
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#ddd",
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#e75e33",
  },
  container: { flex: 1, backgroundColor: "#fff", padding: 12 },
  logCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 2,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logStatus: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  logUsername: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  logFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  logDate: {
    fontSize: 11,
    color: "#aaa",
  },
  logUserType: {
    fontSize: 10,
    backgroundColor: "#e75e33",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    color: "#888",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  modalBody: {
    paddingBottom: 20,
  },
  detailSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "bold",
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  closeBtn: {
    backgroundColor: "#e75e33",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});