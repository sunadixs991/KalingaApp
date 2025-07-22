import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Keyboard } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import HomeScreen from "../screens/HomeScreen";
import ContactScreen from "../screens/ContactScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MapScreen from "../screens/MapScreen";
import LoginScreen from "../screens/LoginScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator({ route }) {
  const username = route?.params?.username;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          display: isKeyboardVisible ? "none" : "flex",
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === "Login") return null; // Don't render icon or space for Login tab

          let iconName;
          let iconColor = focused ? "#49A5A2" : "gray";

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Contacts":
              iconName = focused ? "call" : "call-outline";
              break;
            case "Chat":
              iconName = focused ? "chatbubble" : "chatbubble-outline";
              break;
            case "Map":
              iconName = focused ? "map" : "map-outline";
              return (
                <View
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: "#EC6135",
                    borderRadius: 30,
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    transform: [{ translateY: -12 }],
                  }}
                >
                  <Ionicons name={iconName} size={28} color="#fff" />
                </View>
              );
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
          }

          return <Ionicons name={iconName} size={size} color={iconColor} />;
        },
        tabBarActiveTintColor: "#49A5A2",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        initialParams={{ username }}
      />
      <Tab.Screen name="Contacts" component={ContactScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        initialParams={{ username }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ username }}
      />
    </Tab.Navigator>
  );
}
