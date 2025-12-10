import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";

// exported helper to save feedback (can be reused elsewhere)
export async function saveFeedbackToFirestore({ rating = 0, feedback = "", username = null } = {}) {
  try {
    const db = getFirestore();
    const payload = {
      rating,
      feedback,
      createdAt: serverTimestamp(),
    };
    if (username) payload.username = username;

    await addDoc(collection(db, "feedback"), payload);
    return { ok: true };
  } catch (error) {
    console.error("saveFeedbackToFirestore error:", error);
    return { ok: false, error };
  }
}

// Accept username from parent
const FeedbackModal = ({ username = null }) => {
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editInfo, setEditInfo] = useState({
    gender: "",
    status: "",
    barangay: "",
    purok: "",
  });

  // Dummy data for barangay and purok
  const barangayList = ["Barangay 1", "Barangay 2", "Barangay 3"];
  const purokList = ["Purok 1", "Purok 2", "Purok 3"];

  // Check if user is logged in and if feedback was already submitted
  useEffect(() => {
    const checkLoginAndFeedback = async () => {
      try {
        // Check if user is logged in
        const user = await AsyncStorage.getItem("user");
        const loggedIn = !!user;
        setIsLoggedIn(loggedIn);

        if (loggedIn) {
          // Check if feedback was already submitted for this user
          const feedbackKey = `feedback_submitted_${user}`;
          const alreadySubmitted = await AsyncStorage.getItem(feedbackKey);
          setSubmitted(!!alreadySubmitted);
        } else {
          setSubmitted(false);
        }
      } catch (error) {
        console.error("Error checking login/feedback status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkLoginAndFeedback();
  }, []);

  // Show modal every 30 minutes (only if logged in and not submitted)
  useEffect(() => {
    if (loading || submitted || !isLoggedIn) return;

    const timer = setInterval(() => {
      setVisible(true);
    }, 1800000); // 30 minutes

    return () => clearInterval(timer);
  }, [loading, submitted, isLoggedIn]);

  const handleSubmit = async () => {
    try {
      console.log("Feedback submit payload:", { rating, feedback, username });

      const res = await saveFeedbackToFirestore({
        rating,
        feedback,
        username,
      });

      if (res.ok) {
        console.log("✅ Feedback saved!");

        // Persist feedback submission state
        if (username) {
          const feedbackKey = `feedback_submitted_${username}`;
          await AsyncStorage.setItem(feedbackKey, "true");
        }

        setVisible(false);
        setFeedback("");
        setRating(0);
        setSubmitted(true);
        Alert.alert("Thanks!", "Your feedback has been submitted.");
      } else {
        throw res.error || new Error("Failed to save feedback");
      }
    } catch (error) {
      console.error("❌ Error saving feedback: ", error);
      Alert.alert("Error", "Unable to submit feedback. Please try again.");
    }
  };

  // Don't render if user is not logged in
  if (!isLoggedIn || loading) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setVisible(false)}
          >
            <Text style={{ fontSize: 30, fontWeight: "bold" }}>×</Text>
          </TouchableOpacity>

          <Text style={styles.title}>We appreciate your feedback.</Text>
          <Text style={styles.subtitle}>
            We are always looking for ways to improve your experience. Please
            take a moment to evaluate and tell us what you think.
          </Text>

          {/* Rating Stars */}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Icon
                  name={star <= rating ? "star" : "star-o"}
                  size={30}
                  color="#f4c10f"
                  style={{ marginHorizontal: 4 }}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Feedback Input */}
          <TextInput
            style={styles.input}
            placeholder="What can we do to improve your experience?"
            value={feedback}
            onChangeText={setFeedback}
            multiline
          />

          {/* Gender Picker */}
          <Text style={styles.label}>Gender</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={editInfo.gender}
              onValueChange={(v) => setEditInfo({ ...editInfo, gender: v })}
              enabled={true}
              style={{ color: "#333" }}
            >
              <Picker.Item label="Select Gender" value="" />
              <Picker.Item label="Male" value="Male" />
              <Picker.Item label="Female" value="Female" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          {/* STATUS */}
          <Text style={styles.label}>Civil Status</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={editInfo.status}
              onValueChange={(v) => setEditInfo({ ...editInfo, status: v })}
              enabled={true}
              style={{ color: "#333" }}
            >
              <Picker.Item label="Select Status" value="" />
              <Picker.Item label="Single" value="Single" />
              <Picker.Item label="Married" value="Married" />
              <Picker.Item label="Divorced" value="Divorced" />
              <Picker.Item label="Widowed" value="Widowed" />
            </Picker>
          </View>

          {/* BARANGAY */}
          <Text style={styles.label}>Barangay</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={editInfo.barangay}
              onValueChange={(v) =>
                setEditInfo({ ...editInfo, barangay: v, purok: "" })
              }
              enabled={true}
              style={{ color: "#333" }}
            >
              <Picker.Item label="Select Barangay" value="" />
              {barangayList.map((b, idx) => (
                <Picker.Item key={idx} label={b} value={b} />
              ))}
            </Picker>
          </View>

          {/* PUROK */}
          <Text style={styles.label}>Purok</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={editInfo.purok}
              onValueChange={(v) => setEditInfo({ ...editInfo, purok: v })}
              enabled={true && !!editInfo.barangay}
              style={{ color: "#333" }}
            >
              <Picker.Item
                label={
                  editInfo.barangay ? "Select Purok" : "Select Barangay first"
                }
                value=""
              />
              {purokList.map((p, idx) => (
                <Picker.Item key={idx} label={p} value={p} />
              ))}
            </Picker>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Submit My Feedback
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#f8f9ff",
    padding: 20,
    borderRadius: 16,
    width: "85%",
    elevation: 5,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 15,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 15,
  },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    minHeight: 70,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  pickerContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
    overflow: 'hidden',  // IMPORTANT: Hide overflow for proper Picker rendering
  },
  submitBtn: {
    backgroundColor: "#334EAC",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});

export default FeedbackModal;
