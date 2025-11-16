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
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
// import { getAuth } from "firebase/auth";

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
  const [submitted, setSubmitted] = useState(false); // ✅ Track if user already submitted

  // Show modal every 30 minutes (if not submitted yet)
  useEffect(() => {
    if (submitted) return;
    const timer = setInterval(() => {
      setVisible(true);
    }, 1000);
    return () => clearInterval(timer);
  }, [submitted]);

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
  submitBtn: {
    backgroundColor: "#334EAC",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});

export default FeedbackModal;
