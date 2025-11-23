import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { Picker } from "@react-native-picker/picker";

export default function ManageFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    fetchAllFeedbacks();
  }, []);

  const fetchAllFeedbacks = async () => {
    setLoading(true);
    try {
      const feedbacksSnap = await getDocs(collection(db, "feedback"));
      const feedbackList = feedbacksSnap.docs.map((docu) => ({
        id: docu.id,
        ...docu.data(),
      }));
      setFeedbacks(feedbackList);
    } catch (error) {
      console.log("Failed to fetch feedbacks:", error);
      Alert.alert("Error", "Failed to fetch feedbacks.");
    }
    setLoading(false);
  };

  const getFilteredFeedbacks = () => {
    if (filter === "5 Stars") {
      return [...feedbacks].filter((f) => f.rating === 5);
    }
    if (filter === "4 Stars") {
      return [...feedbacks].filter((f) => f.rating === 4);
    }
    if (filter === "3 Stars") {
      return [...feedbacks].filter((f) => f.rating === 3);
    }
    if (filter === "2 Stars") {
      return [...feedbacks].filter((f) => f.rating === 2);
    }
    if (filter === "1 Star") {
      return [...feedbacks].filter((f) => f.rating === 1);
    }
    if (filter === "Newest") {
      return [...feedbacks].sort((a, b) => {
        const aDate = a.createdAt?.seconds || 0;
        const bDate = b.createdAt?.seconds || 0;
        return bDate - aDate;
      });
    }
    return [...feedbacks];
  };

  const handleDeleteFeedback = (feedbackId) => {
    Alert.alert(
      "Delete Feedback",
      "Are you sure you want to delete this feedback?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "feedback", feedbackId));
              setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackId));
              Alert.alert("Success", "Feedback deleted successfully!");
            } catch (e) {
              Alert.alert("Error", "Failed to delete feedback.");
            }
          },
        },
      ]
    );
  };

  const renderStars = (rating) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#FFD700" : "#ccc"}
            style={{ marginRight: 2 }}
          />
        ))}
      </View>
    );
  };

  const renderRightActions = (onDelete) => (
    <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
      <Icon name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const renderFeedbackItem = ({ item }) => (
    <Swipeable
      renderRightActions={() =>
        renderRightActions(() => handleDeleteFeedback(item.id))
      }
    >
      <TouchableOpacity
        onPress={() => {
          setSelectedFeedback(item);
          setDetailsModalVisible(true);
        }}
      >
        <View style={styles.feedbackCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.feedbackUsername}>{item.username}</Text>
            <View style={{ marginVertical: 6 }}>
              {renderStars(item.rating)}
            </View>
            <Text style={styles.feedbackText} numberOfLines={2}>
              {item.feedback || "No feedback text"}
            </Text>
            <Text style={styles.feedbackDate}>
              {item.createdAt
                ? new Date(item.createdAt.seconds * 1000).toLocaleString()
                : "No date"}
            </Text>
          </View>
          <Icon name="chevron-forward" size={24} color="#ccc" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const displayData = getFilteredFeedbacks();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#EC6135" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Manage Feedback</Text>
        <View style={styles.backButton} />
      </View>

      {/* Dropdown Filter */}
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Filter by:</Text>
        <Picker
          selectedValue={filter}
          style={styles.picker}
          onValueChange={(value) => setFilter(value)}
          mode="dropdown"
        >
          <Picker.Item label="All" value="All" />
          <Picker.Item label="Newest" value="Newest" />
          <Picker.Item label="5 Stars" value="5 Stars" />
          <Picker.Item label="4 Stars" value="4 Stars" />
          <Picker.Item label="3 Stars" value="3 Stars" />
          <Picker.Item label="2 Stars" value="2 Stars" />
          <Picker.Item label="1 Star" value="1 Star" />
        </Picker>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{feedbacks.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Avg Rating</Text>
          <Text style={styles.statValue}>
            {feedbacks.length > 0
              ? (
                  feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
                  feedbacks.length
                ).toFixed(1)
              : "0"}
          </Text>
        </View>
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#EC6135" />
        ) : displayData.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            No feedbacks found.
          </Text>
        ) : (
          <FlatList
            data={displayData}
            keyExtractor={(item) => item.id}
            renderItem={renderFeedbackItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      {/* Feedback Details Modal */}
      <Modal visible={detailsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Feedback Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedFeedback && (
              <View style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Username</Text>
                  <Text style={styles.detailValue}>
                    {selectedFeedback.username}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Rating</Text>
                  <View style={{ marginTop: 8 }}>
                    {renderStars(selectedFeedback.rating)}
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Feedback</Text>
                  <Text style={styles.detailFeedbackText}>
                    {selectedFeedback.feedback || "No feedback text"}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {selectedFeedback.createdAt
                      ? new Date(
                          selectedFeedback.createdAt.seconds * 1000
                        ).toLocaleString()
                      : "No date"}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EC6135",
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
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  filterLabel: {
    fontSize: 15,
    color: "#333",
    marginRight: 10,
    fontWeight: "bold",
  },
  picker: {
    flex: 1,
    height: 54,
    backgroundColor: "#fff",
    color: "#333",
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
  statLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#EC6135",
  },
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  feedbackCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feedbackUsername: { fontSize: 16, fontWeight: "bold", color: "#333" },
  starsContainer: {
    flexDirection: "row",
  },
  feedbackText: { fontSize: 13, color: "#555", marginTop: 6 },
  feedbackDate: { fontSize: 11, color: "#aaa", marginTop: 6 },
  deleteButton: {
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    borderRadius: 8,
    marginBottom: 12,
    marginLeft: 10,
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
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "bold",
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 14,
    color: "#333",
  },
  detailFeedbackText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  closeBtn: {
    backgroundColor: "#EC6135",
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