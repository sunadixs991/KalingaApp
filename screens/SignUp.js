import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
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
  const [barangayList, setBarangayList] = useState([]);
  const [purok, setPurok] = useState("");
  const [purokList, setPurokList] = useState([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Error states
  const [stepOneErrors, setStepOneErrors] = useState({});
  const [stepTwoErrors, setStepTwoErrors] = useState({});

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
    if (!dob) errors.dob = true;
    if (!gender) errors.gender = true;
    if (!status) errors.status = true;
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

  const generateUniqueId = () => {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 10000);
    return `USER${timestamp}${random}`;
  };

  const handleSignUp = async () => {
    if (!validateStepTwo()) return;

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

      Alert.alert(
        "Success",
        `Account created!`,
        [
          {
            text: "OK",
            onPress: () => navigation.replace("LoginScreen"),
          },
        ]
      );
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Error", "Failed to create account. Please try again.");
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#fff" }}
      edges={["top", "left", "right"]}
    >
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
                <View style={styles.inputWrapper}>
                  <Icon name="person-outline" size={20} color="#225B64" style={styles.icon} />
                  <TextInput
                    style={[styles.inputField, stepOneErrors.firstName && { borderColor: "red" }]}
                    placeholder="First Name"
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      setStepOneErrors((prev) => ({ ...prev, firstName: false }));
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Icon name="person-outline" size={20} color="#225B64" style={styles.icon} />
                  <TextInput
                    style={[styles.inputField, stepOneErrors.lastName && { borderColor: "red" }]}
                    placeholder="Last Name"
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      setStepOneErrors((prev) => ({ ...prev, lastName: false }));
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Icon name="call-outline" size={20} color="#225B64" style={styles.icon} />
                  <TextInput
                    style={[styles.inputField, stepOneErrors.phone && { borderColor: "red" }]}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      setStepOneErrors((prev) => ({ ...prev, phone: false }));
                    }}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.inputWrapper, stepOneErrors.dob && { borderColor: "red" }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Icon name="calendar-outline" size={20} color="#225B64" style={styles.icon} />
                  <Text style={{ color: dob ? "#000" : "#aaa", fontSize: 16 }}>
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

                <View style={[styles.pickerWrapper, stepOneErrors.gender && { borderColor: "red" }]}>
                  <Icon name="male-female-outline" size={20} color="#225B64" style={styles.icon} />
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

                <View style={[styles.pickerWrapper, stepOneErrors.status && { borderColor: "red" }]}>
                  <Icon name="heart-outline" size={20} color="#225B64" style={styles.icon} />
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

                <View style={[styles.pickerWrapper, stepOneErrors.barangay && { borderColor: "red" }]}>
                  <Icon name="home-outline" size={20} color="#225B64" style={styles.icon} />
                  <Picker
                    selectedValue={barangay}
                    onValueChange={(itemValue) => {
                      setBarangay(itemValue);
                      setStepOneErrors((prev) => ({ ...prev, barangay: false }));
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Barangay" value="" />
                    {barangayList.map((name, idx) => (
                      <Picker.Item key={idx} label={name} value={name} />
                    ))}
                  </Picker>
                </View>

                <View style={[styles.pickerWrapper, stepOneErrors.purok && { borderColor: "red" }]}>
                  <Icon name="location-outline" size={20} color="#225B64" style={styles.icon} />
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
                      label={barangay ? "Select Purok" : "Select Barangay first"}
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
                    if (validateStepOne()) setStep(2);
                  }}
                >
                  <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.inputWrapper}>
                  <Icon name="person-outline" size={20} color="#225B64" style={styles.icon} />
                  <TextInput
                    style={[styles.inputField, stepTwoErrors.username && { borderColor: "red" }]}
                    placeholder="Username"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      setStepTwoErrors((prev) => ({ ...prev, username: false }));
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Icon name="mail-outline" size={20} color="#225B64" style={styles.icon} />
                  <TextInput
                    style={[styles.inputField, stepTwoErrors.email && { borderColor: "red" }]}
                    placeholder="Email"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setStepTwoErrors((prev) => ({ ...prev, email: false }));
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Icon name="lock-closed-outline" size={20} color="#225B64" style={styles.icon} />
                  <TextInput
                    style={[styles.inputField, stepTwoErrors.password && { borderColor: "red" }]}
                    placeholder="Password"
                    secureTextEntry
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setStepTwoErrors((prev) => ({ ...prev, password: false }));
                    }}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Icon name="lock-closed-outline" size={20} color="#225B64" style={styles.icon} />
                  <TextInput
                    style={[
                      styles.inputField,
                      (stepTwoErrors.confirmPassword || stepTwoErrors.passwordMismatch) && { borderColor: "red" },
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
                </View>

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
    paddingHorizontal: wp("2%"),
    marginBottom: hp("2%"),
    elevation: 4,
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
});
