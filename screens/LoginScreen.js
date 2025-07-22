import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { loginWithUsernameAndPassword } from "../services/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';


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

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password");
      return;
    }

    try {
      const success = await loginWithUsernameAndPassword(username, password);
      if (success) {
        await AsyncStorage.setItem("user", username.trim());
        if (onLogin) onLogin(); // Properly call the function if passed
        Alert.alert("Success", "Logged in!");
        navigation.replace("MainTabs", { username });
      } else {
        Alert.alert("Error", "Invalid username or password");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      
      <Text style={styles.title}>SIGN IN</Text>

      <Image
        source={require("../assets/Kalinga_logo.png")} // Update the path as needed
        style={styles.logo}
        resizeMode="contain"
      />

      <Animated.Text style={[styles.welcomeText, { opacity: fadeAnim }]}>
        Welcome to {"\n"}
        <Text style={styles.kalingaText}>KALINGA!</Text>
      </Animated.Text>

      <Animated.View
        style={[
          styles.formContainer,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.inputWrapper}>
          <Icon
            name="person-outline"
            size={25}
            color="#225B64"
            style={styles.inputIcon}
          />
          <TextInput
            placeholder="Enter Username"
            style={styles.input}
            placeholderTextColor="#888"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Icon
            name="lock-closed-outline"
            size={25}
            color="#225B64"
            style={styles.inputIcon}
          />
          <TextInput
            placeholder="Enter Password"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
          />
        </View>

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

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        {/* Divider with "or" */}
        {/* <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View> */}

        {/* <TouchableOpacity style={styles.continueButton}>
          <Text style={styles.continueButtonText}>
            Continue without logging in
          </Text>
        </TouchableOpacity> */}

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Not yet a member?</Text>
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.signupLink}> SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: {
    // height: hp('100%'),
    fontSize: wp('8%'),
    marginBottom: hp('1.5%'),
    textAlign: 'center',
    color: '#EC6135',
    backgroundColor: '#fff',
    padding: hp('5%'),
    fontWeight: 'bold',
  },
  logo: {
    position: 'absolute',
    top: hp('12%'),
    width: wp('30%'),
    height: wp('30%'),
    alignSelf: 'center',
  },
  welcomeText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: hp('28%'),
    marginBottom: hp('2%'),
    textAlign: 'center',
    fontSize: wp('7%'),
    color: 'black',
    fontWeight: '400',
    opacity: 0.8,
  },
  kalingaText: {
    color: '#FCBE38',
    fontSize: wp('8.5%'),
    fontWeight: '800',
    letterSpacing: wp('1%'),
  },
  formContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: hp('40%'),
    backgroundColor: '#49A5A2',
    borderTopLeftRadius: wp('12%'),
    padding: wp('5%'),
    paddingTop: hp('5%'),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: wp('8%'),
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: hp('2%'),
    paddingHorizontal: wp('4%'),
    height: hp('6%'),
    elevation: 4,
  },
  inputIcon: {
    marginRight: wp('3%'),
    marginLeft: wp('3%'),
    width: wp('7%'),
    height: wp('7%'),
  },
  input: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    color: '#333',
    fontSize: wp('4%'),
  },
  rememberForgotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp('1.5%'),
    marginHorizontal: wp('3%'),
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: wp('6%'),
    height: wp('6%'),
    borderRadius: wp('1.5%'),
    borderWidth: 2,
    borderColor: '#225B64',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp('2%'),
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#225B64',
    borderColor: '#225B64',
  },
  rememberMeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: wp('3.5%'),
  },
  forgotPasswordText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: wp('3.5%'),
  },
  loginButton: {
    backgroundColor: '#225B64',
    paddingVertical: hp('1.5%'),
    borderRadius: wp('8%'),
    alignItems: 'center',
    marginTop: hp('2%'),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: wp('5%'),
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp('3%'),
  },
  signupText: {
    fontSize: wp('4%'),
    color: '#fff',
  },
  signupLink: {
    fontSize: wp('4%'),
    color: '#FCBE38',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

