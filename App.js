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

const Stack = createStackNavigator();

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

          {/* Removed MapScreen from here since it's in TabNavigator */}
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
