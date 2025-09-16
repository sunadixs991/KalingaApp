import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

export default function PinMessages({ route }) {
  const { pinId } = route.params;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "votes"), where("pinId", "==", pinId));
      const snap = await getDocs(q);
      const list = snap.docs.map((docu) => ({ id: docu.id, ...docu.data() }));
      console.log("Fetched votes for pinId:", pinId, list); // Debug log
      const filtered = list.filter(
        (vote) => vote.voteMessage && vote.voteMessage.trim() !== ""
      );
      setMessages(filtered);
    } catch (error) {
      console.log("Error fetching messages:", error); // Debug log
      setMessages([]);
    }
    setLoading(false);
  };

  const renderMessageItem = ({ item }) => (
    <View style={styles.messageCard}>
      <Text style={styles.messageText}>{item.voteMessage}</Text>
      <Text style={styles.metaText}>
        By: {item.userFirstName || "Unknown"} {item.userLastName || ""}
      </Text>
      <Text style={styles.metaText}>
        Type:{" "}
        {item.voteType === "upvote"
          ? "Up Vote"
          : item.voteType === "downvote"
          ? "Down Vote"
          : "Unknown"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#49A5A2" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Pin Messages</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#49A5A2" />
        ) : messages.length === 0 ? (
          <Text style={{ textAlign: "center", marginTop: 40, color: "#888" }}>
            No messages found for this pin.
          </Text>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#49A5A2",
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
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  messageCard: {
    backgroundColor: "#e3f6f5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  messageText: { fontSize: 15, color: "#333", marginBottom: 6 },
  metaText: { fontSize: 12, color: "#555" },
});