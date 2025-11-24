import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Animated, { FadeIn } from "react-native-reanimated";
import Icon from "react-native-vector-icons/Ionicons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { sendOTPSMS, verifyOTP, formatPhoneNumber } from "../services/notification";

export default function SignUp({ navigation }) {
  const [step, setStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Input states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [barangay, setBarangay] = useState("");
  const [barangayList, setBarangayList] = useState([]);
  const [purokList, setPurokList] = useState([]);
  const [purok, setPurok] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Error states
  const [stepOneErrors, setStepOneErrors] = useState({});
  const [stepTwoErrors, setStepTwoErrors] = useState({});
  
  // New states for username check and password rules
  const [usernameAvailable, setUsernameAvailable] = useState(null); // null = unknown, true = available, false = taken
  const [checkingUsername, setCheckingUsername] = useState(false);
  // Phone duplication check
  const [phoneAvailable, setPhoneAvailable] = useState(null); // null = unknown, true = available, false = taken
  const [checkingPhone, setCheckingPhone] = useState(false);
  // phone format/validity + debounce state
  const [phoneValid, setPhoneValid] = useState(false);
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const PHONE_DEBOUNCE_MS = 700;
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    digit: false,
    special: false,
  });

  // Fetch barangay list
  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const snap = await getDocs(collection(db, "barangays"));
        const list = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.name) list.push(data.name);
        });
        // Sort alphabetically
        list.sort((a, b) => a.localeCompare(b));
        setBarangayList(list);
      } catch (error) {
        console.log("Failed to fetch barangays:", error);
      }
    };
    fetchBarangays();
  }, []);

  // Fetch purok list
  useEffect(() => {
    const fetchPuroks = async () => {
      if (!barangay) {
        setPurokList([]);
        setPurok("");
        return;
      }
      try {
        const barangayQuery = query(
          collection(db, "barangays"),
          where("name", "==", barangay)
        );
        const barangaySnap = await getDocs(barangayQuery);
        if (!barangaySnap.empty) {
          const barangayDoc = barangaySnap.docs[0];
          const puroksSnap = await getDocs(
            collection(barangayDoc.ref, "puroks")
          );
          const list = [];
          puroksSnap.forEach((doc) => {
            const data = doc.data();
            if (data.name) list.push(data.name);
          });
          // Sort alphabetically
          list.sort((a, b) => a.localeCompare(b));
          setPurokList(list);
        } else {
          setPurokList([]);
        }
        setPurok("");
      } catch (error) {
        console.log("Failed to fetch puroks:", error);
        setPurokList([]);
        setPurok("");
      }
    };
    fetchPuroks();
  }, [barangay]);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split("T")[0];
      setDob(isoDate);
      setStepOneErrors((prev) => ({ ...prev, dob: false }));
    }
  };

  const validateStepOne = () => {
    const errors = {};
    if (!firstName.trim()) errors.firstName = true;
    if (!lastName.trim()) errors.lastName = true;
    if (!phone.trim()) errors.phone = true;
    if (!otpVerified) {
      Alert.alert(
        "Phone Verification Required",
        "Please verify your phone number with OTP."
      );
      return false;
    }
    if (!dob) errors.dob = true;
    if (!gender) errors.gender = true;
    if (!status) errors.status = true;
    if (!barangay) errors.barangay = true;
    if (!purok) errors.purok = true;
    setStepOneErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert(
        "Incomplete Information",
        "Please fill out all fields before proceeding."
      );
      return false;
    }
    return true;
  };

  // validate password strength live
  useEffect(() => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      digit: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    setPasswordChecks(checks);
  }, [password]);

  const validateStepTwo = () => {
    const errors = {};
    if (!username.trim()) errors.username = true;
    if (!email.trim()) errors.email = true;
    if (!password.trim()) errors.password = true;
    if (!confirmPassword.trim()) errors.confirmPassword = true;
    if (password !== confirmPassword) errors.passwordMismatch = true;
    // strict password enforcement
    const passwordValid = Object.values(passwordChecks).every((v) => v === true);
    if (!passwordValid) errors.passwordRules = true;
    // username availability check
    if (usernameAvailable === false) errors.usernameTaken = true;
    setStepTwoErrors(errors);

    if (errors.passwordMismatch) {
      Alert.alert("Password Error", "Passwords do not match.");
      return false;
    }
    if (errors.usernameTaken) {
      Alert.alert("Username Unavailable", "Please choose a different username.");
      return false;
    }
    if (errors.passwordRules) {
      Alert.alert("Password Error", "Password does not meet requirements. See tips below.");
      return false;
    }
    if (Object.keys(errors).length > 0) {
      Alert.alert("Incomplete Information", "Please fill out all fields.");
      return false;
    }
    return true;
  };

  const generateUniqueId = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `USER${timestamp}${random}`;
  };

  // Check username availability (call onBlur or before signup)
  const checkUsernameAvailability = async (value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", trimmed));
      const snap = await getDocs(q);
      setUsernameAvailable(snap.empty);
    } catch (err) {
      console.error("Username check error:", err);
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Check phone availability (call onBlur or before sending OTP / signup)
  const checkPhoneAvailability = async (value) => {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      setPhoneAvailable(null);
      return;
    }
    setCheckingPhone(true);
    try {
      const q = query(collection(db, "users"), where("phone", "==", trimmed));
      const snap = await getDocs(q);
      setPhoneAvailable(snap.empty);
    } catch (err) {
      console.error("Phone check error:", err);
      setPhoneAvailable(null);
    } finally {
      setCheckingPhone(false);
    }
  };
 
  // Auto-check phone validity and availability after user stops typing
  useEffect(() => {
    setPhoneValid(false);
    setPhoneAvailable(null);
    setPhoneInvalid(false);
    if (!phone || !phone.trim()) return;

    const timer = setTimeout(async () => {
      // normalize digits-only for length/start checks
      const digits = (phone || "").replace(/\D/g, "");
      // invalid if less than 11 digits or does not start with 09
      if (digits.length < 11 || !digits.startsWith("09")) {
        setPhoneValid(false);
        setPhoneAvailable(null);
        setPhoneInvalid(true);
        return;
      }

      // Use project's formatPhoneNumber for consistent formatting/DB matching
      const formatted = formatPhoneNumber(phone);
      if (!formatted) {
        setPhoneValid(false);
        setPhoneAvailable(null);
        setPhoneInvalid(true);
        return;
      }

      setPhoneInvalid(false);
      setPhoneValid(true);
      // check availability using the formatted value (DB must use same format)
      await checkPhoneAvailability(formatted);
    }, PHONE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [phone]);

  const handleSignUp = async () => {
    if (!validateStepTwo()) return;

    // Ensure username availability final check
    if (usernameAvailable !== true) {
      await checkUsernameAvailability(username);
      if (usernameAvailable !== true) {
        Alert.alert("Error", "Username already exists or could not be verified. Choose another username.");
        return;
      }
    }

    // Ensure phone availability final check
    if (phoneAvailable !== true) {
      await checkPhoneAvailability(phone);
      if (phoneAvailable !== true) {
        Alert.alert("Error", "Phone number already exists or could not be verified. Use another phone number.");
        return;
      }
    }

    // Ensure strong password
    if (!Object.values(passwordChecks).every(Boolean)) {
      Alert.alert("Error", "Password does not meet the required complexity.");
      return;
    }

    try {
      const usernameQuery = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const usernameSnapshot = await getDocs(usernameQuery);

      if (!usernameSnapshot.empty) {
        Alert.alert("Error", "Username already exists");
        return;
      }
      // Final phone duplication check
      const phoneQuery = query(collection(db, "users"), where("phone", "==", phone));
      const phoneSnapshot = await getDocs(phoneQuery);
      if (!phoneSnapshot.empty) {
        Alert.alert("Error", "Phone number already registered");
        return;
      }

      const userId = generateUniqueId();

      await addDoc(collection(db, "users"), {
        userId,
        firstName,
        lastName,
        username,
        email,
        phone,
        dob,
        gender,
        status,
        province,
        city,
        barangay,
        purok,
        password,
        is_verified: 0,
        createdAt: new Date(),
        accountStatus: "active",
        userType: "user",
      });

      Alert.alert("Success", `Account created!`, [
        { text: "OK", onPress: () => navigation.replace("LoginScreen") },
      ]);
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Error", "Failed to create account. Please try again.");
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert("Error", "Please enter a phone number first.");
      return;
    }

    // Ensure phone not already used
    if (phoneAvailable !== true) {
      await checkPhoneAvailability(phone);
      if (phoneAvailable === false) {
        Alert.alert("Phone In Use", "This phone number is already registered.");
        return;
      }
    }

    setOtpLoading(true);
    try {
      const result = await sendOTPSMS(phone);
      if (result.success) {
        setOtpSent(true);
        Alert.alert("Success", `OTP sent to ${result.phone}`);
      } else {
        Alert.alert("Error", result.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      Alert.alert("Error", "Please enter the OTP code.");
      return;
    }

    setOtpLoading(true);
    try {
      const result = await verifyOTP(phone, otpCode);
      if (result.success) {
        Alert.alert("Success", "Phone verified successfully!");
        setOtpVerified(true);
      } else {
        Alert.alert("Error", result.error || "Invalid OTP");
      }
    } catch (error) {
      console.error("OTP verify error:", error);
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <Text style={styles.title}>Sign up</Text>

          <Image
            source={require("../assets/Kalinga_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Animated.View entering={FadeIn} style={styles.formContainer}>
            {/* Step 1: Name + Phone + OTP */}
            {step === 1 && (
              <>
                {/* First Name */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="person-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <TextInput
                    style={[
                      styles.inputField,
                      stepOneErrors.firstName && { borderColor: "red" },
                    ]}
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      setStepOneErrors((prev) => ({
                        ...prev,
                        firstName: false,
                      }));
                    }}
                  />
                </View>

                {/* Last Name */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="person-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <TextInput
                    style={[
                      styles.inputField,
                      stepOneErrors.lastName && { borderColor: "red" },
                    ]}
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      setStepOneErrors((prev) => ({
                        ...prev,
                        lastName: false,
                      }));
                    }}
                  />
                </View>

                {/* Phone + Send OTP */}
                <View style={styles.phoneInputWrapper}>
                  <View style={[styles.inputWrapper, { flex: 1 }]}>
                    <Icon
                      name="call-outline"
                      size={20}
                      color="#225B64"
                      style={styles.icon}
                    />
                    <TextInput
                      style={[
                        styles.inputField,
                        stepOneErrors.phone && { borderColor: "red" },
                      ]}
                      placeholder="Phone"
                      keyboardType="phone-pad"
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text);
                        setStepOneErrors((prev) => ({ ...prev, phone: false }));
                        setPhoneAvailable(null); // reset while user edits
                        setPhoneValid(false);
                      }}
                      editable={!otpSent}
                      onBlur={() => checkPhoneAvailability(phone)}
                    />
                    {/* Show Send button only when phone is valid and available */}
                    {phoneValid && phoneAvailable === true && !otpSent ? (
                      <TouchableOpacity
                        onPress={handleSendOTP}
                        disabled={otpLoading}
                        style={{ opacity: otpLoading ? 0.5 : 1 }}
                      >
                        <Text
                          style={{
                            color: "#EC6135",
                            fontSize: wp("3.5%"),
                            fontWeight: "bold",
                          }}
                        >
                          {otpLoading ? "..." : "Send"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      // reserve space so layout doesn't jump
                      <View style={{ minWidth: wp("12%"), alignItems: "center" }}>
                        {checkingPhone ? (
                          <Text style={{ color: "#666", fontSize: wp("3%") }}>...</Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                </View>
    
                {checkingPhone && <Text style={{color:'#666', marginTop:4}}>Checking phone...</Text>}
                {phoneValid && phoneAvailable === true && <Text style={{color:'green', marginTop:4}}>Phone is not used</Text>}
                {phoneAvailable === false && <Text style={{color:'red', marginTop:4}}>Phone already in use</Text>}
                {phoneInvalid && <Text style={{color:'red', marginTop:4}}>Invalid phone number</Text>}

                {/* OTP */}
                {otpSent && (
                  <View style={styles.otpInputWrapper}>
                    <View
                      style={[
                        styles.inputWrapper,
                        { flex: 1, height: hp("6%") },
                      ]}
                    >
                      <Icon
                        name="key-outline"
                        size={20}
                        color="#225B64"
                        style={styles.icon}
                      />
                      <TextInput
                        style={styles.inputField}
                        placeholder="Enter 6-digit OTP"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otpCode}
                        onChangeText={setOtpCode}
                        editable={!otpVerified}
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.verifyOtpBtn,
                        otpVerified && styles.verifyOtpBtnSuccess,
                        (otpLoading || otpVerified) && { opacity: 0.6 },
                      ]}
                      onPress={handleVerifyOTP}
                      disabled={otpLoading || otpVerified}
                    >
                      {otpVerified ? (
                        <Icon name="checkmark-circle" size={24} color="#fff" />
                      ) : (
                        <Text style={styles.verifyOtpText}>
                          {otpLoading ? "..." : "Verify"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {otpSent && (
                  <TouchableOpacity
                    style={[
                      styles.button,
                      { backgroundColor: "#6c757d", marginTop: hp("1%") },
                    ]}
                    onPress={() => {
                      setOtpSent(false);
                      setOtpCode("");
                      setOtpVerified(false);
                    }}
                  >
                    <Text style={styles.buttonText}>Change Phone</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    if (!otpVerified) {
                      Alert.alert(
                        "Verify Phone",
                        "Please verify your phone first."
                      );
                      return;
                    }
                    setStep(2);
                  }}
                >
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 2: DOB + Gender + Status + Barangay/Purok */}
            {step === 2 && (
              <>
                {/* Date Picker */}
                <TouchableOpacity
                  style={[
                    styles.pickerWrapper,
                    stepOneErrors.dob && { borderColor: "red" },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon
                    name="calendar-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <Text
                    style={{
                      flex: 1,
                      fontSize: wp("4%"),
                      color: dob ? "#000" : "#999",
                      paddingVertical: hp("1.5%"),
                    }}
                  >
                    {dob || "Select Date of Birth"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeDate}
                  />
                )}

                {/* Gender */}
                <View
                  style={[
                    styles.pickerWrapper,
                    stepOneErrors.gender && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="male-female-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <Picker
                    selectedValue={gender}
                    onValueChange={(itemValue) => {
                      setGender(itemValue);
                      setStepOneErrors((prev) => ({ ...prev, gender: false }));
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Gender" value="" />
                    <Picker.Item label="Male" value="Male" />
                    <Picker.Item label="Female" value="Female" />
                  </Picker>
                </View>

                {/* Status */}
                <View
                  style={[
                    styles.pickerWrapper,
                    stepOneErrors.status && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="heart-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <Picker
                    selectedValue={status}
                    onValueChange={(itemValue) => {
                      setStatus(itemValue);
                      setStepOneErrors((prev) => ({ ...prev, status: false }));
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Status" value="" />
                    <Picker.Item label="Single" value="Single" />
                    <Picker.Item label="Married" value="Married" />
                  </Picker>
                </View>

                {/* Barangay */}
                <View
                  style={[
                    styles.pickerWrapper,
                    stepOneErrors.barangay && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="home-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <Picker
                    selectedValue={barangay}
                    onValueChange={(itemValue) => {
                      setBarangay(itemValue);
                      setStepOneErrors((prev) => ({
                        ...prev,
                        barangay: false,
                      }));
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Barangay" value="" />
                    {barangayList.map((name, idx) => (
                      <Picker.Item key={idx} label={name} value={name} />
                    ))}
                  </Picker>
                </View>

                {/* Purok */}
                <View
                  style={[
                    styles.pickerWrapper,
                    stepOneErrors.purok && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="location-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <Picker
                    selectedValue={purok}
                    onValueChange={(itemValue) => {
                      setPurok(itemValue);
                      setStepOneErrors((prev) => ({ ...prev, purok: false }));
                    }}
                    style={styles.picker}
                    enabled={!!barangay}
                  >
                    <Picker.Item
                      label={
                        barangay ? "Select Purok" : "Select Barangay first"
                      }
                      value=""
                    />
                    {purokList.map((name, idx) => (
                      <Picker.Item key={idx} label={name} value={name} />
                    ))}
                  </Picker>
                </View>

                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    if (validateStepOne()) setStep(3);
                  }}
                >
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: "#6c757d", marginTop: hp("1%") },
                  ]}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Step 3: Account Info */}
            {step === 3 && (
              <>
                {/* Username */}
                <View
                  style={[
                    styles.inputWrapper,
                    stepTwoErrors.username && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="person-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Username"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      setStepTwoErrors((prev) => ({ ...prev, username: false }));
                      setUsernameAvailable(null); // reset while user edits
                    }}
                    onBlur={() => checkUsernameAvailability(username)}
                  />
                  {checkingUsername && <Text style={{color:'#666', marginTop:4}}>Checking username...</Text>}
                  {usernameAvailable === true && <Text style={{color:'green', marginTop:4}}>Username is available</Text>}
                  {usernameAvailable === false && <Text style={{color:'red', marginTop:4}}>Username is already taken</Text>}
                </View>

                {/* Email */}
                <View
                  style={[
                    styles.inputWrapper,
                    stepTwoErrors.email && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="mail-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setStepTwoErrors((prev) => ({ ...prev, email: false }));
                    }}
                  />
                </View>

                {/* Password */}
                <View
                  style={[
                    styles.inputWrapper,
                    stepTwoErrors.password && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="lock-closed-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Password"
                    value={password}
                    secureTextEntry={!showPassword}
                    onChangeText={(text) => {
                      setPassword(text);
                      setStepTwoErrors((prev) => ({
                        ...prev,
                        password: false,
                        passwordMismatch: false,
                      }));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#225B64"
                    />
                  </TouchableOpacity>
                </View>

                <View style={{backgroundColor:'#f6f6f6', padding:10, borderRadius:8, marginBottom:12}}>
                  <Text style={{fontWeight:'600', marginBottom:6}}>Password requirements:</Text>
                  <Text style={passwordChecks.length ? styles.okText : styles.failText}>• Minimum 8 characters</Text>
                  <Text style={passwordChecks.uppercase ? styles.okText : styles.failText}>• At least one uppercase letter</Text>
                  <Text style={passwordChecks.lowercase ? styles.okText : styles.failText}>• At least one lowercase letter</Text>
                  <Text style={passwordChecks.digit ? styles.okText : styles.failText}>• At least one digit</Text>
                  <Text style={passwordChecks.special ? styles.okText : styles.failText}>• At least one special character (e.g. !@#$%)</Text>
                </View>

                {/* Confirm Password */}
                <View
                  style={[
                    styles.inputWrapper,
                    (stepTwoErrors.confirmPassword ||
                      stepTwoErrors.passwordMismatch) && {
                      borderColor: "red",
                    },
                  ]}
                >
                  <Icon
                    name="lock-closed-outline"
                    size={20}
                    color="#225B64"
                    style={styles.icon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      setStepTwoErrors((prev) => ({
                        ...prev,
                        confirmPassword: false,
                        passwordMismatch: false,
                      }));
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Icon
                      name={
                        showConfirmPassword ? "eye-outline" : "eye-off-outline"
                      }
                      size={20}
                      color="#225B64"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSignUp}>
                  <Text style={styles.buttonText}>Sign Up</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: "#6c757d", marginTop: hp("1%") },
                  ]}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.buttonText}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: wp("8%"),
    textAlign: "center",
    color: "#EC6135",
    backgroundColor: "#fff",
    padding: hp("2%"),
    fontWeight: "bold",
  },
  logo: {
    width: wp("30%"),
    height: wp("30%"),
    alignSelf: "center",
    marginVertical: hp("2%"),
    marginTop: 0,
  },
  formContainer: {
    backgroundColor: "#49A5A2",
    borderTopLeftRadius: wp("10%"),
    borderTopRightRadius: wp("10%"),
    paddingVertical: hp("4%"),
    paddingHorizontal: wp("4%"),
    flex: 1,
    justifyContent: "flex-start",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: wp("8%"),
    paddingHorizontal: wp("5%"), // keep original padding
    marginBottom: hp("2%"),
    elevation: 4,
    height: hp("6%"), // same as original input height
  },
  inputField: {
    flex: 1,
    fontSize: wp("4%"),
    paddingVertical: hp("1.5%"),
  },
  icon: {
    marginRight: wp("2%"),
    marginLeft: wp("1.5%"),
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: wp("8%"),
    paddingHorizontal: wp("5%"),
    marginBottom: hp("2%"),
    elevation: 4,
    height: hp("6%"),
  },
  picker: {
    flex: 1,
  },
  button: {
    backgroundColor: "#225B64",
    paddingVertical: hp("1.5%"),
    borderRadius: wp("8%"),
    alignItems: "center",
    marginTop: hp("1%"),
  },
  buttonText: {
    color: "#fff",
    fontSize: wp("4.5%"),
    fontWeight: "bold",
  },
  otpContainer: {
    backgroundColor: "#e8f4f3",
    borderRadius: wp("5%"),
    padding: wp("4%"),
    marginBottom: hp("2%"),
    borderWidth: 1,
    borderColor: "#49A5A2",
  },
  otpLabel: {
    fontSize: wp("3.5%"),
    color: "#225B64",
    fontWeight: "500",
    marginBottom: hp("2%"),
  },
  otpInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp("2%"),
    marginBottom: hp("2%"),
  },
  verifyOtpBtn: {
    backgroundColor: "#225B64",
    paddingHorizontal: wp("4%"),
    borderRadius: wp("8%"),
    justifyContent: "center",
    alignItems: "center",
    height: hp("5%"),
    minWidth: wp("20%"),
  },
  verifyOtpBtnSuccess: {
    backgroundColor: "green",
  },
  verifyOtpText: {
    color: "#fff",
    fontSize: wp("3.5%"),
    fontWeight: "bold",
  },
  okText: {
    color: "green",
    fontSize: wp("3.5%"),
  },
  failText: {
    color: "red",
    fontSize: wp("3.5%"),
  },
});
