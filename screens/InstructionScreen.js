// screens/InstructionScreen.js
import React from "react";
import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import AppIntroSlider from "react-native-app-intro-slider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    key: "one",
    title: "Welcome to Kalinga",
    text: "Pin safe locations and get real-time disaster assistance.",
    image: require("../assets/poster1.jpg"),
  },
  {
    key: "two",
    title: "Find Resources",
    text: "View shelters, food distribution, and emergency contacts.",
    image: require("../assets/poster2.jpg"),
  },
  {
    key: "three",
    title: "Stay Connected",
    text: "Chat with support and receive alerts instantly.",
    image: require("../assets/Emergency.jpg"),
  },
];

export default function InstructionScreen({ navigation, route }) {
  const { userDocId, username } = route.params;

  const _renderItem = ({ item }) => (
    <View style={styles.slide}>
      <Image source={item.image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.text}>{item.text}</Text>
    </View>
  );

  const _onDone = async () => {
    try {
      if (userDocId) {
        await updateDoc(doc(db, "users", userDocId), { firstLogin: false });
      }
      navigation.replace("MainTabs", { username });
    } catch (error) {
      console.error("Error updating firstLogin:", error);
    }
  };

  return (
    <AppIntroSlider
      renderItem={_renderItem}
      data={slides}
      onDone={_onDone}
      showSkipButton
      onSkip={_onDone}
      activeDotStyle={{ backgroundColor: "#225B64" }}
      skipLabel="Skip"
      nextLabel="Next"
      doneLabel="Get Started"
    />
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 20 },
  image: { width: width * 0.7, height: height * 0.4, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: "bold", color: "#225B64", textAlign: "center", marginBottom: 10 },
  text: { fontSize: 16, color: "#444", textAlign: "center" },
});
