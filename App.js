// App.js
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ThemeProvider } from "./context/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LogBox, ActivityIndicator, View } from "react-native";

import SplashScreen from "./screens/SplashScreen";
import TabNavigator from "./navigation/TabNavigator";
import LoginScreen from "./screens/LoginScreen";
import SignUp from "./screens/SignUp";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import FoodDistribution from "./screens/FoodDistribution";
import EvacuationCenters from "./screens/EvacuationCenters";
import MedicalSupport from "./screens/MedicalSupport";
import AddScheduleScreen from "./screens/AddScheduleScreen";
import PrivacyScreen from "./screens/PrivacyScreen";
import SettingsScreen from "./screens/SettingsScreen";
import AdminUtils from "./screens/AdminUtils";
import ContactScreen from "./screens/ManageContact";
import BarangayScreen from "./screens/ManageBarangay";
import ManageSchedule from "./screens/ManageSchedule";
import AccountInfoScreen from "./screens/AccountInfoScreen";
import ManageUsers from "./screens/ManageUsers";
import UsersActivity from "./screens/UserActivity";
import PinLogs from "./screens/PinLogs";
import ManagePinCategory from "./screens/ManagePinCategory";
import ManageCategory from "./screens/ManageCategory";
import ManageEvacuationCategory from "./screens/ManageEvacuationCategory";
import ManageEvacuationPins from "./screens/ManageEvacuationPins";
import ManagePins from "./screens/ManagePins";
import MapScreen from "./screens/MapScreen";
import PinMessages from "./screens/PinMessages";
import AdminActivity from "./screens/AdminActivity";
import ActivitySelector from "./screens/ActivitySelector";
import ManageLandmark from "./screens/ManageLandmark";
import DeletedPins from "./screens/DeletedPins";
import UserSelector from "./screens/UserSelector";
import ManageLGUAdmins from "./screens/ManageLGUAdmins";
import InstructionScreen from "./screens/InstructionScreen";
import AboutUs from "./screens/AboutUs";
import PrivacyPolicy from "./screens/PrivacyPolicy";
import ManageFeedback from "./screens/ManageFeedback";
import Admin2Utils from "./screens/Admin2Utils";
import SecurityLogs from "./screens/SecurityLogs";
import ForgotPassword from "./screens/ForgotPassword";


// ✅ Import Feedback Modal
import FeedbackModal from "./components/FeedbackModal";
import CommentsScreen from "./screens/CommentsScreen";

const Stack = createStackNavigator();

LogBox.ignoreLogs(["shared value's .value inside reanimated inline style"]);

export default function App() {
  const [currentUsername, setCurrentUsername] = useState(null);

  useEffect(() => {
    const loadUsername = async () => {
      try {
        // Get username from AsyncStorage (already set in LoginScreen.js)
        const username = await AsyncStorage.getItem("user");
        setCurrentUsername(username || null);
      } catch (e) {
        console.warn("Failed to load username from storage:", e);
      }
    };
    loadUsername();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
            <Stack.Screen
              name="FoodDistribution"
              component={FoodDistribution}
            />
            <Stack.Screen
              name="EvacuationCenters"
              component={EvacuationCenters}
            />
            <Stack.Screen name="MedicalSupport" component={MedicalSupport} />
            <Stack.Screen name="AddSchedule" component={AddScheduleScreen} />
            <Stack.Screen name="PrivacyScreen" component={PrivacyScreen} />
            <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
            <Stack.Screen
              name="AccountInfoScreen"
              component={AccountInfoScreen}
            />
            <Stack.Screen name="AdminUtils" component={AdminUtils} />
            <Stack.Screen name="ManageContact" component={ContactScreen} />
            <Stack.Screen name="ManageBarangay" component={BarangayScreen} />
            <Stack.Screen name="ManageSchedule" component={ManageSchedule} />
            <Stack.Screen name="ManageUsers" component={ManageUsers} />
            <Stack.Screen name="UserActivity" component={UsersActivity} />
            <Stack.Screen name="PinLogs" component={PinLogs} />
            <Stack.Screen
              name="ManagePinCategory"
              component={ManagePinCategory}
            />
            <Stack.Screen name="ManageCategory" component={ManageCategory} />
            <Stack.Screen
              name="ManageEvacuationCategory"
              component={ManageEvacuationCategory}
            />
            <Stack.Screen
              name="ManageEvacuationPins"
              component={ManageEvacuationPins}
            />
            <Stack.Screen name="ManagePins" component={ManagePins} />
            <Stack.Screen name="MapScreen" component={MapScreen} />
            <Stack.Screen name="PinMessages" component={PinMessages} />
            <Stack.Screen name="AdminActivity" component={AdminActivity} />
            <Stack.Screen
              name="ActivitySelector"
              component={ActivitySelector}
            />
            <Stack.Screen name="ManageLandmark" component={ManageLandmark} />
            <Stack.Screen name="DeletedPins" component={DeletedPins} />
            <Stack.Screen name="UserSelector" component={UserSelector} />
            <Stack.Screen name="InstructionScreen" component={InstructionScreen}
            />
            <Stack.Screen name="CommentsScreen" component={CommentsScreen} />
            <Stack.Screen name="AboutUs" component={AboutUs} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
            <Stack.Screen name="ManageFeedback" component={ManageFeedback} />
            <Stack.Screen name="ManageLGUAdmins" component={ManageLGUAdmins} />
            <Stack.Screen name="Admin2Utils" component={Admin2Utils} />
            <Stack.Screen name="SecurityLogs" component={SecurityLogs} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          </Stack.Navigator>

          {/* ✅ Pass username to Feedback Modal */}
          <FeedbackModal username={currentUsername} />
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
