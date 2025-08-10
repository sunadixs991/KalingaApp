// screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export default function SplashScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Caveat: require("../assets/fonts/Caveat-VariableFont_wght.ttf"),
  });

  const rotateYValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate logo spin
    Animated.sequence([
      Animated.timing(rotateYValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(rotateYValue, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    const checkLogin = async () => {
      const username = await AsyncStorage.getItem("user");
      console.log("Username from AsyncStorage:", username);

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs", params: { username } }],
        });
      }, 2000);
    };

    if (fontsLoaded) {
      checkLogin();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const rotateY = rotateYValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>KALINGA</Text>

      <Animated.Image
        source={require("../assets/Kalinga_logo.png")}
        style={[
          styles.logo,
          {
            transform: [
              { perspective: 1000 },
              { rotateY: rotateY },
            ],
          },
        ]}
        resizeMode="contain"
      />

      <Text style={styles.subtitle}>
        Katalyst Application with Localized INteractive{"\n"}
        Guided-relief mAp
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffff",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: wp("35%"),
    height: wp("35%"),
    marginBottom: hp("2%"),
  },
  text: {
    fontSize: wp("8%"),
    fontWeight: "800",
    letterSpacing: wp("1%"),
    color: "#EC6135",
    marginBottom: hp("1.5%"),
  },
  subtitle: {
    fontSize: wp("5%"),
    fontFamily: "Caveat",
    textAlign: "center",
    marginTop: hp("0.5%"),
    color: "#225B64",
    lineHeight: hp("4%"),
  },
});
