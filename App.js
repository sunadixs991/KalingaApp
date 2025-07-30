// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import SplashScreen from "./screens/SplashScreen";
import TabNavigator from "./navigation/TabNavigator";
import LoginScreen from "./screens/LoginScreen";
import SignUp from "./screens/SignUp";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import FoodDistribution from './screens/FoodDistribution';
import EvacuationCenters from './screens/EvacuationCenters';
import MedicalSupport from './screens/MedicalSupport';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUp} />
        <Stack.Screen name="AnalyticsScreen" component={AnalyticsScreen} />
        <Stack.Screen name="FoodDistribution" component={FoodDistribution} />
        <Stack.Screen name="EvacuationCenters" component={EvacuationCenters} />
        <Stack.Screen name="MedicalSupport" component={MedicalSupport} />

        
        {/* Removed MapScreen from here since it's in TabNavigator */}
      </Stack.Navigator>
    </NavigationContainer>
  );
}