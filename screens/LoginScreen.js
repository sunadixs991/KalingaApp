import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Alert,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { loginWithUsernameAndPassword } from "../services/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDocs, query, where } from "firebase/firestore";

export default function LoginScreen({ navigation, onLogin }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [rememberMe, setRememberMe] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const logLoginActivity = async (username) => {
    try {
      await addDoc(collection(db, "login_activity"), {
        username: username.trim(),
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.log("Failed to log login activity:", error);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    try {
      const { success, userData } = await loginWithUsernameAndPassword(username, password);

      if (success && userData) {
        await AsyncStorage.setItem("userInfo", JSON.stringify(userData));
        await AsyncStorage.setItem("user", username.trim());

        await logLoginActivity(username);

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDocId = querySnapshot.docs[0].id;
          await updateDoc(doc(db, "users", userDocId), { accountStatus: "active" });
        }

        if (onLogin) onLogin();

        Alert.alert("Success", userData.isAdmin ? "Logged in as Administrator!" : "Logged in successfully!");

        navigation.replace("MainTabs", {
          username,
          isAdmin: userData.isAdmin,
        });
      } else {
        Alert.alert("Error", "Invalid username or password");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Text style={styles.title}>SIGN IN</Text>

            <Image
              source={require("../assets/Kalinga_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Animated.Text style={[styles.welcomeText, { opacity: fadeAnim }]}>
              Welcome to {"\n"}
              <Text style={styles.kalingaText}>KALINGA!</Text>
            </Animated.Text>

            <Animated.View
              style={[styles.formContainer, { transform: [{ translateY: slideAnim }] }]}
            >
              {/* Username Input */}
              <View style={styles.inputWrapper}>
                <Icon name="person-outline" size={25} color="#225B64" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter Username"
                  style={styles.input}
                  placeholderTextColor="#888"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputWrapper}>
                <Icon name="lock-closed-outline" size={25} color="#225B64" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter Password"
                  secureTextEntry
                  style={styles.input}
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Remember Me & Forgot Password */}
              <View style={styles.rememberForgotRow}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
                  >
                    {rememberMe && <Icon name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>

              {/* Sign Up */}
              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Not yet a member?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                  <Text style={styles.signupLink}> SIGN UP</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: wp("5%"),
    paddingBottom: hp("3%"),
  },
  title: {
    fontSize: wp("8%"),
    marginTop: hp("2%"),
    marginBottom: hp("1%"),
    textAlign: "center",
    color: "#EC6135",
    fontWeight: "bold",
  },
  logo: {
    width: wp("32%"),
    height: wp("32%"),
    marginTop: hp("1%"),
    marginBottom: hp("1%"),
    alignSelf: "center",
  },
  welcomeText: {
    textAlign: "center",
    fontSize: wp("6.5%"),
    color: "#000",
    fontWeight: "400",
    marginTop: hp("1%"),
  },
  kalingaText: {
    color: "#FCBE38",
    fontSize: wp("8%"),
    fontWeight: "800",
    letterSpacing: wp("0.5%"),
  },
  formContainer: {
    marginTop: hp("3%"),
    height: hp("70%"),
    width: wp("100%"),
    backgroundColor: "#49A5A2",
    borderTopLeftRadius: wp('12%'),
    padding: wp("5%"),
    paddingTop: hp('4.5%'),
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: wp("8%"),
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: hp("2%"),
    paddingHorizontal: wp("4%"),
    height: hp("6%"),
    elevation: 3,
  },
  inputIcon: {
    marginRight: wp("3%"),
  },
  input: {
    flex: 1,
    paddingVertical: hp("1%"),
    color: "#333",
    fontSize: wp("4%"),
  },
  rememberForgotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: hp("1.5%"),
    marginHorizontal: wp("2%"),
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: wp("6%"),
    height: wp("6%"),
    borderRadius: wp("1.5%"),
    borderWidth: 2,
    borderColor: "#225B64",
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("2%"),
    backgroundColor: "#fff",
  },
  checkboxChecked: {
    backgroundColor: "#225B64",
    borderColor: "#225B64",
  },
  rememberMeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: wp("3.5%"),
  },
  forgotPasswordText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: wp("3.5%"),
  },
  loginButton: {
    backgroundColor: "#225B64",
    paddingVertical: hp("1.5%"),
    borderRadius: wp("8%"),
    alignItems: "center",
    marginTop: hp("1%"),
  },
  loginButtonText: {
    color: "#fff",
    fontSize: wp("5%"),
    fontWeight: "bold",
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: hp("3%"),
  },
  signupText: {
    fontSize: wp("4%"),
    color: "#fff",
  },
  signupLink: {
    fontSize: wp("4%"),
    color: "#FCBE38",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
