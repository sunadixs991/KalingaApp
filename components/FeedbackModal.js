import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const FeedbackModal = () => {
  const [visible, setVisible] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false); // ✅ Track if user already submitted

  const db = getFirestore();
  const auth = getAuth();

  // Show modal every 1 minute (if not submitted yet)
  useEffect(() => {
    if (submitted) return; // ✅ Stop timer once submitted

    const timer = setInterval(() => {
      setVisible(true);
    }, 30 * 60 * 1000); // 1 minute in ms

    return () => clearInterval(timer);
  }, [submitted]);

  const handleSubmit = async () => {
    try {
      await addDoc(collection(db, "feedback"), {
        userId: auth.currentUser ? auth.currentUser.uid : null,
        rating,
        feedback,
        createdAt: serverTimestamp(),
      });

      console.log("✅ Feedback saved!");
      setVisible(false);
      setFeedback("");
      setRating(0);
      setSubmitted(true); // ✅ Stop showing modal after submission
    } catch (error) {
      console.error("❌ Error saving feedback: ", error);
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
