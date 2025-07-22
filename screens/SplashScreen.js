// screens/SplashScreen.js
import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";


export default function SplashScreen({ navigation }) {
  const [fontsLoaded] = useFonts({
    Caveat: require("../assets/fonts/Caveat-VariableFont_wght.ttf"),
  });

  useEffect(() => {
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

  if (!fontsLoaded) return null; // or show loading indicator

  return (
    <View style={styles.container}>
      <Text style={styles.text}>KALINGA</Text>
      <Image
        source={require("../assets/Kalinga_logo.png")}
        style={styles.logo}
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
