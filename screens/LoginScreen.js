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
import * as Crypto from 'expo-crypto';
import NetInfo from "@react-native-community/netinfo";
import {
  sendLockedAccountNotification,
  notifyBruteForceAttempt,
} from "../services/securityNotification";
import Toast from "react-native-toast-message";
import sessionManager from "../services/sessionManager";

const validatePasswordStrength = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isLongEnough = password.length >= 8;

  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough;
};

const logSecurityEvent = async (eventType, username, details) => {
  try {
    await addDoc(collection(db, "security_events"), {
      eventType: eventType,
      username: username || "unknown",
      details: details,
      timestamp: serverTimestamp(),
      platform: Platform.OS,
    });
  } catch (error) {
    console.log("Failed to log security event:", error);
  }
};

export default function LoginScreen({ navigation, onLogin }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current;
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [sessionToken, setSessionToken] = useState(null);

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

    // Check if account is locked
    checkAccountLockStatus();
    checkNetworkConnectivity();
    // session timeout handled centrally by sessionManager (init in App.js)

    // no local timeouts to clean up here
  }, []);

  const checkAccountLockStatus = async () => {
    try {
      const lockStatus = await AsyncStorage.getItem("accountLocked");
      const lockTime = await AsyncStorage.getItem("lockTime");

      if (lockStatus && lockTime) {
        const timeDiff = Date.now() - parseInt(lockTime);
        const lockDurationMs = 15 * 60 * 1000; // 15 minutes

        if (timeDiff < lockDurationMs) {
          setIsLocked(true);
          const remainingMinutes = Math.ceil((lockDurationMs - timeDiff) / 60000);
          Alert.alert(
            "Account Locked",
            `Too many failed login attempts. Try again in ${remainingMinutes} minutes.`
          );
        } else {
          await AsyncStorage.removeItem("accountLocked");
          await AsyncStorage.removeItem("lockTime");
          await AsyncStorage.removeItem("loginAttempts");
          setIsLocked(false);
        }
      }
    } catch (error) {
      console.log("Failed to check account lock status:", error);
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.log("Failed to fetch IP:", error);
      return "unavailable";
    }
  };

  const logLoginActivity = async (username, success, userType) => {
    try {
      const ipAddress = await getClientIP();

      await addDoc(collection(db, "login_activity"), {
        username: username.trim(),
        timestamp: serverTimestamp(),
        success: success,
        userType: userType || "unknown",
        ipAddress: ipAddress,
        deviceInfo: Platform.OS,
      });
    } catch (error) {
      console.log("Failed to log login activity:", error);
    }
  };

  const checkNetworkConnectivity = async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected ?? true);

    if (!state.isConnected) {
      Alert.alert(
        "⚠️ No Internet Connection",
        "Please check your internet connection and try again."
      );
    }
  };

  const validateLoginInput = (username, password) => {
    const sqlInjectionPattern = /(\bOR\b|\bAND\b|--|;|\/\*|\*\/|xp_|sp_)/gi;
    if (sqlInjectionPattern.test(username) || sqlInjectionPattern.test(password)) {
      logSecurityEvent("suspicious_activity", username, "SQL injection attempt detected");
      Alert.alert("⚠️ Invalid Input", "Your input contains invalid characters.");
      return false;
    }

    const xssPattern = /<script|javascript:|onerror|onclick/gi;
    if (xssPattern.test(username) || xssPattern.test(password)) {
      logSecurityEvent("suspicious_activity", username, "XSS attempt detected");
      Alert.alert("⚠️ Invalid Input", "Your input contains invalid characters.");
      return false;
    }

    if (username.length < 3 || username.length > 50) {
      Alert.alert("⚠️ Invalid Username", "Username must be between 3 and 50 characters.");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("⚠️ Invalid Password", "Password must be at least 6 characters long.");
      return false;
    }

    return true;
  };

  const generateSessionToken = async (username) => {
    try {
      const token = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${username}-${Date.now()}-${Math.random()}`
      );
      return token;
    } catch (error) {
      console.log("Failed to generate session token:", error);
      return null;
    }
  };

  const checkSuspiciousActivity = async (username) => {
    try {
      const activityRef = collection(db, "login_activity");
      const q = query(
        activityRef,
        where("username", "==", username),
        where("success", "==", true)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.size > 0) {
        const lastLogin = querySnapshot.docs[querySnapshot.size - 1].data();
        const lastDevice = lastLogin.deviceInfo;

        if (lastDevice !== Platform.OS) {
          await logSecurityEvent("suspicious_activity", username, `Login from different device: ${Platform.OS}`);

          return new Promise((resolve) => {
            Alert.alert(
              "🔐 Verify Login",
              `We detected a login from a different device (${Platform.OS}). Is this you?`,
              [
                { text: "No", onPress: () => resolve(false) },
                { text: "Yes", onPress: () => resolve(true) },
              ]
            );
          });
        }
      }
      return true;
    } catch (error) {
      console.log("Failed to check suspicious activity:", error);
      return true;
    }
  };

  const recordFailedLoginAttempt = async (username) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDocId = querySnapshot.docs[0].id;
        const userData = querySnapshot.docs[0].data();
        const failedAttempts = (userData.failedLoginAttempts || 0) + 1;
        const remainingAttempts = 3 - failedAttempts;

        if (failedAttempts >= 2) {
          await logSecurityEvent("brute_force_attempt", username, `Failed attempts: ${failedAttempts}`);
          await notifyBruteForceAttempt(userData.phone, username, failedAttempts);
        }

        if ((userData.userType === "LGU Admin" || userData.isAdmin) && failedAttempts >= 3) {
          await updateDoc(doc(db, "users", userDocId), {
            failedLoginAttempts: failedAttempts,
            accountLocked: true,
            lockedAt: serverTimestamp(),
          });

          await AsyncStorage.setItem("accountLocked", "true");
          await AsyncStorage.setItem("lockTime", Date.now().toString());
          setIsLocked(true);

          await addDoc(collection(db, "security_alerts"), {
            type: "account_locked",
            username: username.trim(),
            userType: userData.userType,
            reason: "Multiple failed login attempts",
            timestamp: serverTimestamp(),
            ipAddress: "mobile_app",
            device: Platform.OS,
          });

          await sendLockedAccountNotification(username, "Multiple failed login attempts");

          Alert.alert(
            "🔒 Account Locked",
            "Too many failed login attempts.\n\nYour account has been temporarily locked for security purposes.\n\nPlease try again in 15 minutes."
          );
        } else {
          let alertTitle = "❌ Login Failed";
          let alertMessage = `Invalid username or password.\n\n`;

          if (remainingAttempts > 0) {
            alertMessage += `⚠️ Remaining attempts: ${remainingAttempts}\n\n`;
            if (remainingAttempts === 1) {
              alertMessage += `⚠️ One more failed attempt will lock your account for 15 minutes.`;
            } else {
              alertMessage += `After ${3 - remainingAttempts} more failed attempts, your account will be locked.`;
            }
          }

          await updateDoc(doc(db, "users", userDocId), {
            failedLoginAttempts: failedAttempts,
          });

          Alert.alert(alertTitle, alertMessage);
        }
      }
    } catch (error) {
      console.log("Failed to record login attempt:", error);
    }
  };

  const resetFailedLoginAttempts = async (username) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDocId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, "users", userDocId), {
          failedLoginAttempts: 0,
          accountLocked: false,
        });
      }
    } catch (error) {
      console.log("Failed to reset login attempts:", error);
    }
  };

  const handleLogin = async () => {
    if (!isOnline) {
      Alert.alert("⚠️ No Internet", "Please check your internet connection.");
      return;
    }

    if (isLocked) {
      Alert.alert(
        "🔒 Account Locked",
        "Your account is temporarily locked due to multiple failed login attempts.\n\nPlease try again later."
      );
      return;
    }

    if (!username || !password) {
      Alert.alert(
        "⚠️ Missing Information",
        "Please enter both your username and password to continue."
      );
      return;
    }

    if (!validateLoginInput(username, password)) {
      return;
    }

    setLoading(true);

    try {
      const { success, userData } = await loginWithUsernameAndPassword(username, password);

      if (success && userData) {
        // set central session expiry (minutes)
        await sessionManager.setSessionExpiry(30);

        const isTrusted = await checkSuspiciousActivity(username);
        if (!isTrusted) {
          await logSecurityEvent("suspicious_activity_rejected", username, "User denied suspicious login");
          setLoading(false);
          return;
        }

        const token = await generateSessionToken(username);
        if (token) {
          await AsyncStorage.setItem("sessionToken", token);
          setSessionToken(token);
        }

        await resetFailedLoginAttempts(username);

        await AsyncStorage.setItem("userInfo", JSON.stringify(userData));
        await AsyncStorage.setItem("user", username.trim());
        await AsyncStorage.setItem("lastLogin", new Date().toISOString());

        await logLoginActivity(username, true, userData.userType);

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.trim()));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDocId = querySnapshot.docs[0].id;
          await updateDoc(doc(db, "users", userDocId), {
            accountStatus: "active",
            lastLoginTime: serverTimestamp(),
            lastLoginDevice: Platform.OS,
          });
        }

        if (onLogin) onLogin();

        Toast.show({
          type: "success",
          text1: "Login Successful",
          text2:
            userData.userType === "CSWD Admin"
              ? "You have successfully logged in as CSWD Admin."
              : userData.isAdmin
              ? "You have successfully logged in as Administrator."
              : userData.userType === "DRRM Admin"
              ? "You have successfully logged in as DRRM Admin."
              : userData.userType === "Purok Leader"
              ? "You have successfully logged in as Purok Leader."
              : "You have successfully logged in.",
        });

        navigation.replace("MainTabs", {
          username,
          isAdmin: userData.isAdmin,
          userType: userData.userType,
          sessionToken: token,
        });
      } else {
        await recordFailedLoginAttempt(username);
        await logLoginActivity(username, false, null);
      }
    } catch (error) {
      await logLoginActivity(username, false, null);
      Alert.alert(
        "⚠️ Login Error",
        error.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setLoading(false);
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
              <View style={styles.inputWrapper}>
                <Icon name="person-outline" size={25} color="#225B64" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter Username"
                  style={styles.input}
                  placeholderTextColor="#888"
                  value={username}
                  onChangeText={setUsername}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Icon name="lock-closed-outline" size={25} color="#225B64" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter Password"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  placeholderTextColor="#888"
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}>
                  <Icon
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={24}
                    color="#225B64"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.rememberForgotRow}>
                <TouchableOpacity
                  style={styles.rememberMeContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={loading}
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, (loading || isLocked) && { opacity: 0.6 }]}
                onPress={handleLogin}
                disabled={loading || isLocked}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? "Logging in..." : "Login"}
                </Text>
              </TouchableOpacity>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>Not yet a member?</Text>
                <TouchableOpacity onPress={() => navigation.navigate("SignUp")} disabled={loading}>
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
