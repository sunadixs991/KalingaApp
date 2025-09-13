// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
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
import { ThemeProvider } from "./context/ThemeContext";
import AdminUtils from "./screens/AdminUtils";
import ContactScreen from "./screens/ManageContact";
import BarangayScreen from "./screens/ManageBarangay";
import ManageSchedule from "./screens/ManageSchedule";
import AccountInfoScreen from "./screens/AccountInfoScreen";
import ManageUsers from "./screens/ManageUsers";
import UsersActivity from "./screens/UsersActivity";
import PinLogs from "./screens/PinLogs";
import ManageCategory from "./screens/ManageCategory";
import { LogBox } from 'react-native';

const Stack = createStackNavigator();

LogBox.ignoreLogs([
  "shared value's .value inside reanimated inline style",
]);

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUp} />
          <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
          <Stack.Screen name="FoodDistribution" component={FoodDistribution} />
          <Stack.Screen
            name="EvacuationCenters"
            component={EvacuationCenters}
          />
          <Stack.Screen name="MedicalSupport" component={MedicalSupport} />
          <Stack.Screen
            name="AddSchedule"
            component={AddScheduleScreen}
            options={{ headerShown: false }}
          />
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
          <Stack.Screen name="UsersActivity" component={UsersActivity} />
          <Stack.Screen name="PinLogs" component={PinLogs} />
          <Stack.Screen name="ManageCategory" component={ManageCategory} />

        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
