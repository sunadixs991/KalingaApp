import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getGeminiResponse } from "../services/geminiChatService";
import { getUserInfo } from "../services/getinfo";
import { getChatbotContext, formatContextForPrompt, cleanModelOutput } from "../services/chatbotDataService";
import * as Location from "expo-location";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const FAQS = [
  "Show me nearby evacuation facilities",
  "Show me nearby medical facilities",
  "What are the food distribution schedules?",
  "Give me emergency contact numbers",
  "What community services are available?",
];

export default function GeminiChatUI({ route, onClose }) {
  // try route param first; we will populate usernameState from AsyncStorage if missing
  const initialRouteUsername = route?.params?.username || null;
  const [usernameState, setUsernameState] = useState(initialRouteUsername);

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
      try {
        let identifier = initialRouteUsername;

        if (!identifier) {
          // Try AsyncStorage fallback (ChatScreen stores the signed-in user under "user")
          const stored = await AsyncStorage.getItem("user");
          if (stored) {
            identifier = stored;
          }
        }

        // keep the resolved identifier in state for later context queries
        if (identifier) setUsernameState(identifier);

        console.debug("[chat] GeminiChatUI resolved identifier:", { initialRouteUsername, identifier });

        // If we have an identifier, try to load profile
        if (identifier) {
          const data = await getUserInfo(identifier);
          console.debug("[chat] getUserInfo result for", identifier, !!data);
          if (data) {
            setUserInfo(data);
            clearTimeout(timeoutId);
            setInfoLoading(false);
            return;
          }
        }

        // if no identifier or getUserInfo returned null, still clear loading so chat can proceed
        setInfoLoading(false);
      } catch (err) {
        console.error("[chat] fetchUserInfo error", err);
        setInfoLoading(false);
      }
    }

    fetchUserInfo();

    (async () => {
      try {
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
      } catch (e) {
        console.debug("[chat] location lookup failed", e);
      }
    })();

    return () => clearTimeout(timeoutId);
  }, [initialRouteUsername]);

  function handleFAQPress(faq) {
    setInput(faq);
    sendMessageWithText(faq);
  }

  async function sendMessageWithText(text) {
    if (!text.trim()) return;

    let USER_INFO;
    let locationText = placeName ? `My current location is: ${placeName}.` : "";

    if (userInfo) {
      USER_INFO = `
My name is ${userInfo.firstName?.trim() || ""} ${userInfo.lastName?.trim() || ""}.
I am from ${userInfo.barangay || ""}, ${userInfo.city || ""}, ${userInfo.province || ""}.
My location is ${locationText}.
You should remember this information and use it to personalize your responses.
`;
    } else if (loadTimeout) {
      USER_INFO = `
This is not a signed-in account. If the user asks for personal information, politely tell them to sign in first (except for location).
My location is ${locationText}
`;
    } else {
      // still loading user info; avoid sending until we either have userInfo or timeout
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Use the resolved identifier (AsyncStorage or route) when fetching DB context
      const identifierToUse = usernameState || null;
      console.debug("[chat] sending message, identifier used for context:", identifierToUse);

      // Fetch database context based on the user's question
      const context = await getChatbotContext(identifierToUse, text);
      const databaseContext = formatContextForPrompt(context);

      const prompt = USER_INFO + databaseContext + "\nUser: " + text;

      // Get response from Gemini with database context and clean formatting
      const rawBotText = await getGeminiResponse(prompt);
      const botText = cleanModelOutput(rawBotText);

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + "_bot", sender: "bot", text: botText },
      ]);
    } catch (error) {
      console.error("Error getting response:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "_bot",
          sender: "bot",
          text: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setInput("");
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    sendMessageWithText(input);
  }

  if (infoLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? 0 : StatusBar.currentHeight || 0
        }
      >
        <StatusBar
          style="light"
          backgroundColor="#e75e33"
          translucent={false}
        />
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Icon name="chatbubble-ellipses-outline" size={20} color="#fff" />
              <Text style={styles.headerTitle}>Chat with Gemini</Text>
            </View>
            {typeof onClose === "function" && (
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <Icon name="close" size={20} color="#fff" />
              </TouchableOpacity>
            )}
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
                {index === 0 && item.sender === "bot" && (
                  <View style={styles.faqContainer}>
                    {FAQS.map((faq, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.faqButton}
                        onPress={() => handleFAQPress(faq)}
                        disabled={loading}
                      >
                        <Text style={styles.faqText}>{faq}</Text>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#e75e33",
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
    paddingVertical: hp("2%"),
    paddingHorizontal: wp("4%"),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: wp("4.5%"),
    marginLeft: wp("2%"),
  },
  chatContainer: {
    flexGrow: 1,
    padding: wp("3.5%"),
    justifyContent: "flex-end",
  },
  message: {
    marginVertical: hp("0.8%"),
    padding: wp("3%"),
    borderRadius: wp("3%"),
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
    fontSize: wp("4%"),
    color: "#222",
  },
  faqContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  faqButton: {
    backgroundColor: "#e75e33",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 4,
  },
  faqText: {
    color: "#fff",
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: wp("3%"),
    marginHorizontal: wp("4%"),
    marginBottom: hp("3.5%"),
    paddingHorizontal: wp("3%"),
    paddingVertical: hp("0.5%"),
    elevation: 2,
  },
  input: {
    flex: 1,
    height: hp("5.5%"),
    paddingHorizontal: wp("2%"),
    color: "#000",
    fontSize: wp("3.8%"),
  },
  sendButton: {
    backgroundColor: "#225B64",
    borderRadius: wp("3%"),
    padding: wp("2%"),
    marginLeft: wp("2%"),
    justifyContent: "center",
    alignItems: "center",
  },
});