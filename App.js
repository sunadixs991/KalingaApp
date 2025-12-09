// App.js - UPDATED WITH NOTIFICATION HANDLER
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { ThemeProvider } from "./context/ThemeContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LogBox } from "react-native";
import * as Notifications from 'expo-notifications';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { setupDisasterNotificationHandlers, setupDisasterNotificationChannels } from './services/DisasterNotificationService';

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
import ManageCSWDAdmins from "./screens/ManageCSWDAdmins";
import InstructionScreen from "./screens/InstructionScreen";
import AboutUs from "./screens/AboutUs";
import PrivacyPolicy from "./screens/PrivacyPolicy";
import ManageFeedback from "./screens/ManageFeedback";
import AdminUtilsCSWD from "./screens/AdminUtilsCSWD";
import SecurityLogs from "./screens/SecurityLogs";
import ForgotPassword from "./screens/ForgotPassword";
import ManagePurokLeaders from "./screens/ManagePurokLeaders";
import ManageDRRMAdmins from "./screens/ManageDRRMAdmins";
import AdminUtilsPurok from "./screens/AdminUtilsPurok";
import AdminUtilsDRRM from "./screens/AdminUtilsDRRM";
import EarthquakeScreen from './screens/EarthquakeScreen';
import * as DeleteService from './services/DeleteService';
import FeedbackModal from "./components/FeedbackModal";
import CommentsScreen from "./screens/CommentsScreen";
import NotificationCenterScreen from "./screens/NotificationCenterScreen";
import DisasterMonitorScreen from './screens/DisasterMonitorScreen';

const Stack = createStackNavigator();

LogBox.ignoreLogs(["shared value's .value inside reanimated inline style"]);

// ✅ CRITICAL: Configure notification handler at app level
// This ensures notifications show properly when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // Show alert
    shouldPlaySound: true,       // Play sound
    shouldSetBadge: true,        // Update badge
    shouldShowBanner: true,      // Show banner (iOS)
    shouldShowList: true,        // Show in notification center
  }),
});

export default function App() {
  const [currentUsername, setCurrentUsername] = useState(null);

  const toastConfig = {
    success: (props) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: '#28A745' }}
        contentContainerStyle={{ backgroundColor: '#D4EDDA' }}
        text1Style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#155724'
        }}
        text2Style={{
          fontSize: 13,
          color: '#155724'
        }}
        text2NumberOfLines={3}
      />
    ),
    error: (props) => (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: '#DC3545' }}
        contentContainerStyle={{ backgroundColor: '#F8D7DA' }}
        text1Style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#721C24'
        }}
        text2Style={{
          fontSize: 13,
          color: '#721C24'
        }}
        text2NumberOfLines={3}
      />
    ),
    warning: (props) => (
      <ErrorToast
        {...props}
        style={{ borderLeftColor: '#FFC107' }}
        contentContainerStyle={{ backgroundColor: '#FFF3CD' }}
        text1Style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#856404'
        }}
        text2Style={{
          fontSize: 13,
          color: '#856404'
        }}
        text2NumberOfLines={3}
      />
    ),
    info: (props) => (
      <BaseToast
        {...props}
        style={{ borderLeftColor: '#17A2B8' }}
        contentContainerStyle={{ backgroundColor: '#D1ECF1' }}
        text1Style={{
          fontSize: 15,
          fontWeight: '600',
          color: '#0C5460'
        }}
        text2Style={{
          fontSize: 13,
          color: '#0C5460'
        }}
        text2NumberOfLines={3}
      />
    ),
  };

  // Initialize services
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('🔍 Initializing Auto-Delete Service...');

        if (DeleteService && DeleteService.startAutoDeleteService) {
          await DeleteService.startAutoDeleteService();
          console.log('✅ Auto-delete service initialized successfully');
        } else {
          console.error('❌ startAutoDeleteService not found');
          console.log('Available exports:', Object.keys(DeleteService || {}));
        }
      } catch (error) {
        console.error('❌ Failed to initialize auto-delete service:');
        console.error('   Error:', error.message);
        console.error('   Stack:', error.stack);
      }
    };

    initializeServices();
  }, []);

  // ✅ UPDATED: Better notification handling while app is in use
  useEffect(() => {
    // Listen for notifications when app is in FOREGROUND
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received in foreground:', notification);

      // Show Toast notification for better visibility
      const notificationType = notification.request.content.data?.type || 'info';

      // Map notification types to toast types
      const toastType = {
        'earthquake': 'error',
        'weather': 'warning',
        'incident': 'warning',
        'food_schedule': 'info',
        'schedule': 'info',
      }[notificationType] || 'info';

      Toast.show({
        type: toastType,
        text1: notification.request.content.title,
        text2: notification.request.content.body,
        visibilityTime: 5000,
        autoHide: true,
        topOffset: 50,
        onPress: () => {
          // You can add navigation logic here based on notification type
          console.log('Toast pressed - navigate to details');
        }
      });
    });

    // Listen for user TAPPING on notifications
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);

      const data = response.notification.request.content.data;

      // Handle navigation based on notification type
      if (data?.type === 'food_schedule' || data?.type === 'schedule') {
        console.log('Navigate to Food Distribution screen');
        // You can add navigation logic here if needed
        // navigation.navigate('FoodDistribution');
      } else if (data?.type === 'earthquake') {
        console.log('Navigate to Earthquake screen');
        // navigation.navigate('Earthquake');
      } else if (data?.type === 'incident') {
        console.log('Navigate to Map screen');
        // navigation.navigate('MapScreen');
      } else if (data?.type === 'weather') {
        console.log('Navigate to Weather/Alerts screen');
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Load username from storage
  useEffect(() => {
    const loadUsername = async () => {
      try {
        const username = await AsyncStorage.getItem("user");
        setCurrentUsername(username || null);
      } catch (e) {
        console.warn("Failed to load username from storage:", e);
      }
    };
    loadUsername();
  }, []);

  useEffect(() => {
    // Setup handlers once when app loads
    setupDisasterNotificationHandlers();
    setupDisasterNotificationChannels();
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
            <Stack.Screen name="FoodDistribution" component={FoodDistribution} />
            <Stack.Screen name="EvacuationCenters" component={EvacuationCenters} />
            <Stack.Screen name="MedicalSupport" component={MedicalSupport} />
            <Stack.Screen name="AddSchedule" component={AddScheduleScreen} />
            <Stack.Screen name="PrivacyScreen" component={PrivacyScreen} />
            <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
            <Stack.Screen name="AccountInfoScreen" component={AccountInfoScreen} />
            <Stack.Screen name="AdminUtils" component={AdminUtils} />
            <Stack.Screen name="ManageContact" component={ContactScreen} />
            <Stack.Screen name="ManageBarangay" component={BarangayScreen} />
            <Stack.Screen name="ManageSchedule" component={ManageSchedule} />
            <Stack.Screen name="ManageUsers" component={ManageUsers} />
            <Stack.Screen name="UserActivity" component={UsersActivity} />
            <Stack.Screen name="PinLogs" component={PinLogs} />
            <Stack.Screen name="ManagePinCategory" component={ManagePinCategory} />
            <Stack.Screen name="ManageCategory" component={ManageCategory} />
            <Stack.Screen name="ManageEvacuationCategory" component={ManageEvacuationCategory} />
            <Stack.Screen name="ManageEvacuationPins" component={ManageEvacuationPins} />
            <Stack.Screen name="ManagePins" component={ManagePins} />
            <Stack.Screen name="MapScreen" component={MapScreen} />
            <Stack.Screen name="PinMessages" component={PinMessages} />
            <Stack.Screen name="AdminActivity" component={AdminActivity} />
            <Stack.Screen name="ActivitySelector" component={ActivitySelector} />
            <Stack.Screen name="ManageLandmark" component={ManageLandmark} />
            <Stack.Screen name="DeletedPins" component={DeletedPins} />
            <Stack.Screen name="UserSelector" component={UserSelector} />
            <Stack.Screen name="InstructionScreen" component={InstructionScreen} />
            <Stack.Screen name="CommentsScreen" component={CommentsScreen} />
            <Stack.Screen name="AboutUs" component={AboutUs} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
            <Stack.Screen name="ManageFeedback" component={ManageFeedback} />
            <Stack.Screen name="ManageCSWDAdmins" component={ManageCSWDAdmins} />
            <Stack.Screen name="AdminUtilsCSWD" component={AdminUtilsCSWD} />
            <Stack.Screen name="SecurityLogs" component={SecurityLogs} />
            <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
            <Stack.Screen name="ManagePurokLeaders" component={ManagePurokLeaders} />
            <Stack.Screen name="ManageDRRMAdmins" component={ManageDRRMAdmins} />
            <Stack.Screen name="AdminUtilsPurok" component={AdminUtilsPurok} />
            <Stack.Screen name="AdminUtilsDRRM" component={AdminUtilsDRRM} />
            <Stack.Screen name="Earthquake" component={EarthquakeScreen} />
            <Stack.Screen name="NotificationCenter" component={NotificationCenterScreen} />
            <Stack.Screen name="DisasterMonitor" component={DisasterMonitorScreen} options={{ title: 'Disaster Monitoring' }}
            />
          </Stack.Navigator>

          <FeedbackModal username={currentUsername} />
          <Toast config={toastConfig} />
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}