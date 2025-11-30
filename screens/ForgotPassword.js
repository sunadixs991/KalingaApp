import React, { useState, useEffect } from "react";
import { CommonActions } from "@react-navigation/native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { collection, query, where, getDocs, getDoc, serverTimestamp, doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { sendOTPSMS, formatPhoneNumber } from "../services/notification";
import * as Crypto from "expo-crypto";

export default function ForgotPassword({ navigation }) {
  const [step, setStep] = useState(1); // 1 = lookup, 2 = verify OTP, 3 = set new password
  const [identifier, setIdentifier] = useState("");
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(false);

  const [otp, setOtp] = useState("");
  const [resetDocId, setResetDocId] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChecks, setPasswordChecks] = useState({
    length: false, uppercase: false, lowercase: false, digit: false, special: false,
  });

  const [showPassword, setShowPassword] = useState(false); // toggle for password fields

  useEffect(() => {
    const checks = {
      length: newPassword.length >= 8,
      uppercase: /[A-Z]/.test(newPassword),
      lowercase: /[a-z]/.test(newPassword),
      digit: /\d/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    };
    setPasswordChecks(checks);
  }, [newPassword]);

  // find user by username or phone
  const findUser = async () => {
    setLoading(true);
    try {
      const ident = (identifier || "").trim();
      if (!ident) {
        Alert.alert("Error", "Please enter username or phone.");
        setLoading(false);
        return;
      }

      // try username
      let q = query(collection(db, "users"), where("username", "==", ident));
      let snap = await getDocs(q);
      if (snap.empty) {
        // try phone (normalize and try multiple variants)
        const formatted = formatPhoneNumber(ident); // e.g. +63...
        const digits = (ident || "").replace(/\D/g, "");
        const candidates = [];

        if (formatted) candidates.push(formatted);
        if (digits) {
          if (digits.length === 11 && digits.startsWith("09")) {
            candidates.push(digits);
            candidates.push("+63" + digits.slice(1));
          }
          if (digits.length === 10 && digits.startsWith("9")) {
            candidates.push("0" + digits);
            candidates.push("+63" + digits);
          }
        }
        if (!candidates.includes(ident)) candidates.push(ident);

        try {
          q = query(collection(db, "users"), where("phone", "in", candidates));
          snap = await getDocs(q);
        } catch (e) {
          q = query(collection(db, "users"), where("phone", "==", formatted || ident));
          snap = await getDocs(q);
        }
      }

      if (snap.empty) {
        Alert.alert("Not found", "No account matches the provided username or phone.");
        setLoading(false);
        return;
      }

      const docSnap = snap.docs[0];
      setUserDoc({ id: docSnap.id, ...docSnap.data() });

      // send OTP to the user's phone
      const phone = docSnap.data().phone;
      if (!phone) {
        Alert.alert("No phone", "This account has no phone number on file.");
        setLoading(false);
        return;
      }

      // generate 6-digit OTP and store hashed in Firestore with expiry
      const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawOtp);

      // store reset record (overwrite any previous by same user)
      const resetRef = doc(collection(db, "passwordResets"));
      await setDoc(resetRef, {
        userId: docSnap.id,
        username: docSnap.data().username || null,
        phone: phone,
        identifierUsed: ident,
        otpHash,
        createdAt: serverTimestamp(),
        expiresAt: Date.now() + 5 * 60 * 1000,
        used: false,
      });

      setResetDocId(resetRef.id);

      // send OTP using the OTP function signature: sendOTPSMS(phoneString, otp)
      const sendResult = await sendOTPSMS(phone, rawOtp);
      if (!sendResult || !sendResult.success) {
        console.warn("OTP send failed:", sendResult);
        Alert.alert("Error", "Failed to send reset code. Try again later.");
        setLoading(false);
        return;
      }

      setStep(2);
      Alert.alert("OTP Sent", `A reset code was sent`);
    } catch (err) {
      console.error("findUser error:", err);
      Alert.alert("Error", "Failed to initiate reset. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Enter OTP.");
      return;
    }
    setLoading(true);
    try {
      if (!resetDocId) throw new Error("No reset session");
      const docRef = doc(db, "passwordResets", resetDocId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        Alert.alert("Error", "Reset session not found or expired.");
        setLoading(false);
        return;
      }
      const data = docSnap.data();

      if (data.used) {
        Alert.alert("Error", "This code has already been used.");
        setLoading(false);
        return;
      }

      if (Date.now() > (data.expiresAt || 0)) {
        Alert.alert("Expired", "This code has expired. Request a new one.");
        setLoading(false);
        return;
      }

      const otpHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, otp.trim());
      if (otpHash !== data.otpHash) {
        Alert.alert("Invalid", "OTP is incorrect.");
        setLoading(false);
        return;
      }

      // mark verified (do not mark as used yet)
      await updateDoc(doc(db, "passwordResets", resetDocId), { verified: true, verifiedAt: serverTimestamp() });

      setStep(3);
    } catch (err) {
      console.error("verifyOtp error:", err);
      Alert.alert("Error", "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const performReset = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (!Object.values(passwordChecks).every(Boolean)) {
      Alert.alert("Error", "Password does not meet requirements.");
      return;
    }
    setLoading(true);
    try {
      if (!resetDocId) throw new Error("No reset session");
      const resetRef = doc(db, "passwordResets", resetDocId);
      const resetSnap = await getDoc(resetRef);
      if (!resetSnap.exists()) throw new Error("Reset session not found");
      const resetData = resetSnap.data();
      if (resetData.used) throw new Error("Reset session already used");

      // Update the user's password field directly (no hashing as requested)
      const targetUserId = resetData.userId || (userDoc && userDoc.id);
      if (!targetUserId) throw new Error("Target user not identified");
      await updateDoc(doc(db, "users", targetUserId), {
        password: newPassword,
        passwordUpdatedAt: serverTimestamp(),
      });

      // mark reset used
      await updateDoc(resetRef, { used: true, usedAt: serverTimestamp() });

      Alert.alert("Success", "Password has been reset. You may now log in.");
      // Reset navigation stack and go to the correct login screen name
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "LoginScreen" }], // <- use exact screen name from App.js
        })
      );
    } catch (err) {
      console.error("performReset error:", err);
      Alert.alert("Error", err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <Text style={styles.title}>Forgot Password</Text>

            {step === 1 && (
              <>
                <Text style={styles.info}>Enter your username or phone number to receive a reset code.</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="person-outline" size={22} color="#225B64" style={{ marginRight: wp("3%") }} />
                  <TextInput
                    placeholder="Username or Phone"
                    style={styles.input}
                    value={identifier}
                    onChangeText={setIdentifier}
                    editable={!loading}
                  />
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={findUser} disabled={loading}>
                  <Text style={styles.actionText}>{loading ? "..." : "Send reset code"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.link}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.info}>Enter the 6-digit code sent to your phone.</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="key-outline" size={22} color="#225B64" style={{ marginRight: wp("3%") }} />
                  <TextInput
                    placeholder="Enter code"
                    keyboardType="number-pad"
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    editable={!loading}
                    maxLength={6}
                  />
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={verifyOtp} disabled={loading}>
                  <Text style={styles.actionText}>{loading ? "..." : "Verify code"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setStep(1); setOtp(""); }}>
                  <Text style={styles.link}>Use different account</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={styles.info}>Choose a new password. Minimum 8 characters, include upper/lower/digit/special.</Text>

                <View style={styles.inputWrapper}>
                  <Icon name="lock-closed-outline" size={22} color="#225B64" style={{ marginRight: wp("3%") }} />
                  <TextInput
                    placeholder="New password"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#225B64" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <Icon name="lock-closed-outline" size={22} color="#225B64" style={{ marginRight: wp("3%") }} />
                  <TextInput
                    placeholder="Confirm password"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#225B64" />
                  </TouchableOpacity>
                </View>

                <View style={styles.requirements}>
                  <Text style={passwordChecks.length ? styles.ok : styles.fail}>• Minimum 8 characters</Text>
                  <Text style={passwordChecks.uppercase ? styles.ok : styles.fail}>• Uppercase letter</Text>
                  <Text style={passwordChecks.lowercase ? styles.ok : styles.fail}>• Lowercase letter</Text>
                  <Text style={passwordChecks.digit ? styles.ok : styles.fail}>• Digit</Text>
                  <Text style={passwordChecks.special ? styles.ok : styles.fail}>• Special character</Text>
                </View>

                <TouchableOpacity style={styles.actionButton} onPress={performReset} disabled={loading}>
                  <Text style={styles.actionText}>{loading ? "..." : "Reset password"}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: wp("5%"), alignItems: "center", justifyContent: "flex-start" },
  title: { fontSize: wp("7%"), fontWeight: "700", marginTop: hp("3%"), color: "#EC6135" },
  info: { fontSize: wp("4%"), color: "#333", marginVertical: hp("2%"), textAlign: "center" },

  /* match LoginScreen input styles */
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
    width: "100%",
  },
  input: {
    flex: 1,
    paddingVertical: hp("1%"),
    color: "#333",
    fontSize: wp("4%"),
  },

  actionButton: {
    marginTop: hp("2%"),
    backgroundColor: "#225B64",
    paddingVertical: hp("1.6%"),
    paddingHorizontal: wp("6%"),
    borderRadius: wp("8%"),
    width: "100%",
    alignItems: "center",
  },
  actionText: { color: "#fff", fontSize: wp("4.2%"), fontWeight: "600" },

  link: { color: "#EC6135", marginTop: hp("2%") },

  requirements: { width: "100%", marginVertical: hp("1.5%") },
  ok: { color: "green", fontSize: wp("3.6%") },
  fail: { color: "red", fontSize: wp("3.6%") },
});