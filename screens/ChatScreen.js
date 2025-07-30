import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { getGeminiResponse } from "../services/geminiChatService";
import { getUserInfo } from "../services/getinfo"; // ✅ corrected path
import * as Location from "expo-location";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const FAQS = [
  "What services are available in my area?",
  "How do I request for medical assistance?",
  "Where is the nearest evacuation center?",
  "How do I report an emergency?",
  "What are the food distribution schedules?",
];

export default function ChatScreen({ route }) {
  const username = route?.params?.username;

  const [messages, setMessages] = useState([
    {
      id: "1",
      sender: "bot",
      text: "Hi! I am your chatbot assistant. How may I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [placeName, setPlaceName] = useState("");
  const [showFaqs, setShowFaqs] = useState(true);

  useEffect(() => {
    let timeoutId = setTimeout(() => {
      setLoadTimeout(true);
      setInfoLoading(false);
    }, 5000);

    async function fetchUserInfo() {
      const data = await getUserInfo(username);
      if (data) {
        setUserInfo(data);
        clearTimeout(timeoutId);
        setInfoLoading(false);
      }
    }

    fetchUserInfo();

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      let places = await Location.reverseGeocodeAsync(loc.coords);
      if (places && places.length > 0) {
        const place = places[0];
        setPlaceName(
          [
            place.name,
            place.street,
            place.subregion,
            place.city,
            place.region,
            place.country,
          ]
            .filter(Boolean)
            .join(", ")
        );
      }
    })();

    return () => clearTimeout(timeoutId);
  }, [username]);

  // Add this function to handle FAQ quick send
  function handleFAQPress(faq) {
    setInput(faq);
    sendMessageWithText(faq);
  }

  // Helper to send a message with a specific text (for FAQ)
  async function sendMessageWithText(text) {
    if (!text.trim()) return;

    let USER_INFO;
    let locationText = placeName ? `My current location is: ${placeName}.` : "";

    if (userInfo) {
      USER_INFO = `
My name is ${userInfo.firstName.trim()} ${userInfo.lastName.trim()}.
I am from ${userInfo.barangay}, ${userInfo.city}, ${userInfo.province}.
I was born on ${userInfo.dob} and I identify as ${userInfo.gender}.
My civil status is ${userInfo.status}.
My location is ${locationText}.
You should remember this information and use it to personalize your responses.
`;
    } else if (loadTimeout) {
      USER_INFO = `
This is not a signed-in account. If the user asks for personal information, politely tell them to sign in first(except for location).
My location is ${locationText}
`;
    } else {
      // Still loading, do not send
      return;
    }

    // Add the user's message to the chat first
    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const prompt = USER_INFO + "\nUser: " + text;
    const botText = await getGeminiResponse(prompt);

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString() + "_bot", sender: "bot", text: botText },
    ]);
    setInput("");
    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim()) return;

    let USER_INFO;
    let locationText = placeName ? `My current location is: ${placeName}.` : "";

    if (userInfo) {
      USER_INFO = `
My name is ${userInfo.firstName.trim()} ${userInfo.lastName.trim()}.
I am from ${userInfo.barangay}, ${userInfo.city}, ${userInfo.province}.
I was born on ${userInfo.dob} and I identify as ${userInfo.gender}.
My civil status is ${userInfo.status}.
My location is ${locationText}.
You should remember this information and use it to personalize your responses.
`;
    } else if (loadTimeout) {
      USER_INFO = `
This is not a signed-in account. If the user asks for personal information, politely tell them to sign in first(except for location).
My location is ${locationText}
`;
    } else {
      // Still loading, do not send
      return;
    }

    // Add the user's message to the chat first
    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const prompt = USER_INFO + "\nUser: " + input;
    const botText = await getGeminiResponse(prompt);

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString() + "_bot", sender: "bot", text: botText },
    ]);
    setInput("");
    setLoading(false);
  }

  if (infoLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[
            styles.container,
            { justifyContent: "center", alignItems: "center" },
          ]}
        >
          <ActivityIndicator size="large" color="#e75e33" />
          <Text>Loading user info...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Icon name="chatbubble-ellipses-outline" size={20} color="#fff" />
            <Text style={styles.headerTitle}>Gemini Chat</Text>
          </View>
          <TouchableOpacity>
            <Icon name="person-circle-outline" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Chat Area */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.message,
                item.sender === "user" ? styles.user : styles.bot,
              ]}
            >
              <Text style={styles.messageText}>{item.text}</Text>
              {/* Show FAQ buttons right after the bot's greeting */}
              {index === 0 && item.sender === "bot" && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
                  {FAQS.map((faq, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        backgroundColor: "#e75e33",
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        margin: 4,
                      }}
                      onPress={() => handleFAQPress(faq)}
                      disabled={loading}
                    >
                      <Text style={{ color: "#fff", fontSize: 13 }}>{faq}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          contentContainerStyle={styles.chatContainer}
        />

        {/* Input Row */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            disabled={loading}
          >
            <Icon name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#e75e33",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: wp('4%'),
    // paddingTop: Platform.OS === 'android' ? 32 : 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: wp('4.5%'),
    marginLeft: wp('2%'),
  },
  chatContainer: {
    flexGrow: 1,
    padding: wp('3.5%'),
    justifyContent: "flex-end",
  },
  message: {
    marginVertical: hp('0.8%'),
    padding: wp('3%'),
    borderRadius: wp('3%'),
    maxWidth: "80%",
  },
  user: {
    alignSelf: "flex-end",
    backgroundColor: "#DCF8C6",
  },
  bot: {
    alignSelf: "flex-start",
    backgroundColor: "#EEE",
  },
  messageText: {
    fontSize: wp('4%'),
    color: "#222",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: wp('3%'),
    marginHorizontal: wp('4%'),
    marginBottom: hp('4.5%'),
    paddingHorizontal: wp('3%'),
    paddingVertical: hp('0.5%'),
    elevation: 2,
  },
  input: {
    flex: 1,
    height: hp('5.5%'),
    paddingHorizontal: wp('2%'),
    color: "#000",
    fontSize: wp('3.8%'),
  },
  sendButton: {
    backgroundColor: "#225B64",
    borderRadius: wp('3%'),
    padding: wp('2%'),
    marginLeft: wp('2%'),
    justifyContent: "center",
    alignItems: "center",
  },
});

