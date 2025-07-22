import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export default function SignUp({ navigation }) {
  const [step, setStep] = useState(1);

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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Error states
  const [stepOneErrors, setStepOneErrors] = useState({});
  const [stepTwoErrors, setStepTwoErrors] = useState({});

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
    if (!dob) errors.dob = true;
    if (!gender) errors.gender = true;
    if (!status) errors.status = true;

    setStepOneErrors(errors);
    if (Object.keys(errors).length > 0) {
      Alert.alert("Incomplete Information", "Please fill out all fields before proceeding.");
      return false;
    }
    return true;
  };

  const validateStepTwo = () => {
    const errors = {};
    if (!username.trim()) errors.username = true;
    if (!email.trim()) errors.email = true;
    if (!password.trim()) errors.password = true;
    if (!confirmPassword.trim()) errors.confirmPassword = true;
    if (password !== confirmPassword) errors.passwordMismatch = true;

    setStepTwoErrors(errors);
    if (errors.passwordMismatch) {
      Alert.alert("Password Error", "Passwords do not match.");
      return false;
    }
    if (Object.keys(errors).length > 0) {
      Alert.alert("Incomplete Form", "Please complete all fields.");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateStepTwo()) return;

    try {
      await addDoc(collection(db, "users"), {
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
        password,
        is_verified: 0,
      });
      Alert.alert("Success", "Account created!");
      navigation.replace("LoginScreen");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
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
            {step === 1 && (
              <>
                <TextInput
                  style={[
                    styles.input,
                    stepOneErrors.firstName && { borderColor: "red" },
                  ]}
                  placeholder="First Name"
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    setStepOneErrors((prev) => ({ ...prev, firstName: false }));
                  }}
                />
                <TextInput
                  style={[
                    styles.input,
                    stepOneErrors.lastName && { borderColor: "red" },
                  ]}
                  placeholder="Last Name"
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    setStepOneErrors((prev) => ({ ...prev, lastName: false }));
                  }}
                />
                <TextInput
                  style={[
                    styles.input,
                    stepOneErrors.phone && { borderColor: "red" },
                  ]}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setStepOneErrors((prev) => ({ ...prev, phone: false }));
                  }}
                />
                <TouchableOpacity
                  style={[
                    styles.input,
                    stepOneErrors.dob && { borderColor: "red" },
                    { justifyContent: "center" },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ color: dob ? "#000" : "#aaa" }}>
                    {dob ? dob : "Date of Birth"}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dob ? new Date(dob) : new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onChangeDate}
                    maximumDate={new Date()}
                  />
                )}

                <View
                  style={[
                    styles.pickerContainer,
                    stepOneErrors.gender && { borderColor: "red" },
                  ]}
                >
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

                <View
                  style={[
                    styles.pickerContainer,
                    stepOneErrors.status && { borderColor: "red" },
                  ]}
                >
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

                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    if (validateStepOne()) setStep(2);
                  }}
                >
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <TextInput
                  style={[
                    styles.input,
                    stepTwoErrors.username && { borderColor: "red" },
                  ]}
                  placeholder="Username"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setStepTwoErrors((prev) => ({ ...prev, username: false }));
                  }}
                />
                <TextInput
                  style={[
                    styles.input,
                    stepTwoErrors.email && { borderColor: "red" },
                  ]}
                  placeholder="Email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setStepTwoErrors((prev) => ({ ...prev, email: false }));
                  }}
                />
                <TextInput
                  style={[
                    styles.input,
                    stepTwoErrors.password && { borderColor: "red" },
                  ]}
                  placeholder="Password"
                  secureTextEntry
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setStepTwoErrors((prev) => ({ ...prev, password: false }));
                  }}
                />
                <TextInput
                  style={[
                    styles.input,
                    (stepTwoErrors.confirmPassword || stepTwoErrors.passwordMismatch) &&
                      { borderColor: "red" },
                  ]}
                  placeholder="Confirm Password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setStepTwoErrors((prev) => ({
                      ...prev,
                      confirmPassword: false,
                      passwordMismatch: false,
                    }));
                  }}
                />

                <TouchableOpacity style={styles.button} onPress={handleSignUp}>
                  <Text style={styles.buttonText}>Create Account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "#6c757d" }]}
                  onPress={() => setStep(1)}
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
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: wp("8%"),
    paddingVertical: hp("1.8%"),
    paddingHorizontal: wp("5%"),
    marginBottom: hp("2%"),
    fontSize: wp("4%"),
    elevation: 4,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    paddingLeft: wp("4%"),
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: wp("8%"),
    marginBottom: hp("2%"),
    minHeight: hp("7%"),
    justifyContent: "center",
    elevation: 4,
  },
  picker: {
    width: "100%",
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
});
