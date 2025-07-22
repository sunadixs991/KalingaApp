import React, { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import SignUp from "../screens/SignUp";
import TabNavigator from "./TabNavigator";
import HomeScreen from "../screens/HomeScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";

const Stack = createNativeStackNavigator();

function LoginWrapper(props) {
  const [_, setIsLoggedIn] = useState(false);
  return <LoginScreen {...props} onLogin={() => setIsLoggedIn(true)} />;
}

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignUp" component={SignUp} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}
