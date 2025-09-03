// navigation/TabNavigator.js
import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Keyboard, SafeAreaView, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import HomeScreen from "../screens/HomeScreen";
import ContactScreen from "../screens/ContactScreen";
import ChatScreen from "../screens/ChatScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MapScreen from "../screens/MapScreen";
import { useTheme } from "../context/ThemeContext";

const Tab = createBottomTabNavigator();

export default function TabNavigator({ route }) {
  const username = route?.params?.username;
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const { isDarkMode } = useTheme();

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

  // Dynamic colors
  const colors = {
    tabBarBg: isDarkMode ? "#121212" : "#fff",
    tabBarActive: "#49A5A2",
    tabBarInactive: isDarkMode ? "#888" : "gray",
    mapButtonBg: "#EC6135",
    screenBg: isDarkMode ? "#121212" : "#fff",
  };

  // Wrap screen components in SafeAreaView to prevent overflow
  const withSafeArea = (Component) => (props) => (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.screenBg }]}
    >
      <Component {...props} />
    </SafeAreaView>
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          display: isKeyboardVisible ? "none" : "flex",
          backgroundColor: colors.tabBarBg,
          borderTopColor: isDarkMode ? "#333" : "#eee",
        },
        tabBarIcon: ({ focused, size }) => {
          let iconName;

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
                    backgroundColor: colors.mapButtonBg,
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

          return (
            <Ionicons
              name={iconName}
              size={size}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          );
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
      })}
    >
      <Tab.Screen
        name="Home"
        component={withSafeArea(HomeScreen)}
        initialParams={{ username }}
      />
      <Tab.Screen name="Contacts" component={withSafeArea(ContactScreen)} />
      <Tab.Screen name="Map" component={withSafeArea(MapScreen)} />
      <Tab.Screen
        name="Chat"
        component={withSafeArea(ChatScreen)}
        initialParams={{ username }}
      />
      <Tab.Screen
        name="Profile"
        component={withSafeArea(ProfileScreen)}
        initialParams={{ username }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
