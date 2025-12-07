// services/NotificationService.js - HYBRID VERSION (Expo + FCM)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

// ✅ Set notification handler at module load
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications and save token to Firestore
 * For Expo Go: Gets Expo token
 * For Custom APK: Gets FCM token from native Firebase Messaging
 */
export const registerForPushNotifications = async (username) => {
  let token = null;
  let tokenType = 'expo'; // 'expo' or 'fcm'

  if (!Device.isDevice) {
    console.log('⚠️ Must use physical device for Push Notifications');
    return null;
  }

  try {
    console.log('🔧 Starting notification registration for:', username);
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('   Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Notification permission not granted:', finalStatus);
      return null;
    }

    console.log('✅ Notification permission granted');

    // Try to get FCM token first (only works for custom APKs built with Firebase)
    if (Platform.OS === 'android') {
      console.log('📱 Attempting to get FCM token from native Firebase...');
      try {
        const fcmToken = await getFCMToken();
        if (fcmToken) {
          token = fcmToken;
          tokenType = 'fcm';
          console.log('✅ Got FCM token:', token);
        } else {
          console.log('⚠️ FCM token not available, falling back to Expo token');
        }
      } catch (fcmError) {
        console.log('⚠️ FCM token generation failed:', fcmError.message);
        console.log('   Falling back to Expo token...');
      }
    }

    // If no FCM token, get Expo token
    if (!token) {
      console.log('🔧 Getting Expo push token...');
      
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                        Constants.easConfig?.projectId ||
                        Constants.manifest?.extra?.eas?.projectId;

      if (!projectId) {
        console.error('❌ No EAS project ID found! Checked all paths:');
        console.error('   - Constants.expoConfig?.extra?.eas?.projectId:', Constants.expoConfig?.extra?.eas?.projectId);
        console.error('   - Constants.easConfig?.projectId:', Constants.easConfig?.projectId);
        console.error('   - Constants.manifest?.extra?.eas?.projectId:', Constants.manifest?.extra?.eas?.projectId);
      }

      console.log('   Project ID:', projectId);
      
      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });
      
      token = expoToken.data;
      tokenType = 'expo';
      console.log('📱 Got Expo push token:', token);
    }

    // Save both token and type
    await AsyncStorage.setItem('pushToken', token);
    await AsyncStorage.setItem('pushTokenType', tokenType);
    console.log(`✅ Saved ${tokenType.toUpperCase()} token to AsyncStorage`);

    if (username) {
      await saveTokenToFirestore(username, token, tokenType);
    } else {
      console.log('⚠️ No username provided, skipping Firestore save');
    }

    // Create notification channels (Android)
    if (Platform.OS === 'android') {
      await createNotificationChannels();
    }

    return { token, tokenType };
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    console.error('   Stack:', error.stack);
    return null;
  }
};

/**
 * Get FCM token from native Firebase Messaging
 * Only works for custom APKs built with Firebase configured
 */
const getFCMToken = async () => {
  try {
    // Try using react-native-firebase if available
    if (global.firebase && global.firebase.messaging) {
      console.log('   Trying react-native-firebase...');
      const token = await global.firebase.messaging().getToken();
      return token;
    }

    // For bare React Native or custom Expo builds with Firebase configured
    // Try accessing native modules
    const { NativeModules } = require('react-native');
    
    if (NativeModules.FirebaseMessaging) {
      console.log('   Trying NativeModules.FirebaseMessaging...');
      const token = await NativeModules.FirebaseMessaging.getToken();
      return token;
    }

    // Try accessing Firebase app instance directly
    if (global.Firebase && global.Firebase.getInstance) {
      console.log('   Trying global Firebase instance...');
      const app = global.Firebase.getInstance();
      if (app && app.messaging) {
        const token = await app.messaging().getToken();
        return token;
      }
    }

    console.log('   ⚠️ No FCM SDK available');
    return null;
  } catch (error) {
    console.error('   FCM token error:', error.message);
    return null;
  }
};

/**
 * Create Android notification channels
 */
const createNotificationChannels = async () => {
  console.log('🔔 Creating Android notification channels...');
  
  const channels = [
    {
      id: 'default',
      name: 'Default Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e75e33',
    },
    {
      id: 'earthquake',
      name: 'Earthquake Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#e67e22',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    },
    {
      id: 'weather',
      name: 'Weather Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3498db',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    },
    {
      id: 'incident',
      name: 'Incident Reports',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e75e33',
    },
    {
      id: 'schedules',
      name: 'Food Distribution Schedules',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#49A5A2',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    },
  ];

  for (const channel of channels) {
    try {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: channel.importance,
        vibrationPattern: channel.vibrationPattern,
        lightColor: channel.lightColor,
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        ...(channel.lockscreenVisibility && {
          lockscreenVisibility: channel.lockscreenVisibility,
        }),
      });
      console.log(`   ✅ Created ${channel.id} channel`);
    } catch (error) {
      console.error(`   ❌ Failed to create ${channel.id} channel:`, error);
    }
  }
  
  console.log('🎉 All notification channels created successfully!');
};

/**
 * Save push token to Firestore with type information
 */
const saveTokenToFirestore = async (username, token, tokenType) => {
  try {
    console.log('💾 Attempting to save token to Firestore...');
    console.log('   Username:', username);
    console.log('   Token type:', tokenType);
    console.log('   Token:', token.substring(0, 40) + '...');
    
    const tokensRef = collection(db, 'pushTokens');
    console.log('   Collection reference created');
    
    const q = query(tokensRef, where('username', '==', username));
    console.log('   Query created, executing...');
    
    const snapshot = await getDocs(q);
    console.log('   Query executed. Docs found:', snapshot.size);

    if (snapshot.empty) {
      console.log('   No existing token found, creating new document...');
      const newDoc = await addDoc(tokensRef, {
        username,
        token,
        tokenType, // 'expo' or 'fcm'
        platform: Platform.OS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Token saved successfully! Doc ID:', newDoc.id);
    } else {
      console.log('   Existing token found, updating document...');
      const docRef = doc(db, 'pushTokens', snapshot.docs[0].id);
      await updateDoc(docRef, {
        token,
        tokenType,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ Token updated successfully! Doc ID:', snapshot.docs[0].id);
    }
  } catch (error) {
    console.error('❌ Error saving token to Firestore:', error);
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Stack:', error.stack);
    throw error;
  }
};

/**
 * ✅ Send LOCAL notification (works when app is open/background)
 */
export const sendLocalNotification = async ({ title, body, data = {}, channelId = 'default' }, seconds) => {
  try {
    console.log('📱 Sending local notification:', { title, channelId });
    
    const content = {
      title,
      body,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };

    if (Platform.OS === 'android') {
      content.channelId = channelId;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
    
    console.log('✅ Local notification sent successfully, ID:', id);
    return id;
  } catch (error) {
    console.error('❌ Failed to send local notification:', error);
    throw error;
  }
};

/**
 * ✅ Send REMOTE push notification via Supabase Edge Function
 */
export const sendRemotePushNotification = async (
  pushToken,
  title,
  body,
  data = {},
  channelId = 'default'
) => {
  try {
    console.log('📤 Sending push via Supabase Edge Function...');
    console.log('   Channel:', channelId);
    console.log('   Token:', pushToken.substring(0, 30) + '...');

    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        tokens: [pushToken],
        title,
        body,
        data,
        channelId,
      },
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Push notification sent via Supabase:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    throw error;
  }
};

/**
 * ✅ Send batch push notifications via Supabase Edge Function
 */
export const sendBatchPushNotifications = async (
  tokens,
  title,
  body,
  data = {},
  channelId = 'default'
) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No tokens provided for batch notification');
      return { sent: 0, failed: 0, total: 0 };
    }

    const validTokens = tokens.filter(token =>
      token && (token.startsWith('ExponentPushToken') || token.includes(':') && token.length > 50)
    );

    if (validTokens.length === 0) {
      console.log('⚠️ No valid tokens found');
      return { sent: 0, failed: 0, total: 0 };
    }

    console.log(`📤 Sending ${validTokens.length} push notifications via Supabase...`);
    console.log('   Channel:', channelId);
    console.log('   Tokens breakdown:');
    const expoTokens = validTokens.filter(t => t.startsWith('ExponentPushToken')).length;
    const fcmTokens = validTokens.filter(t => t.includes(':') && t.length > 50).length;
    console.log(`     - Expo: ${expoTokens}`);
    console.log(`     - FCM: ${fcmTokens}`);

    const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        tokens: validTokens,
        title,
        body,
        data,
        channelId,
      },
    });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('📦 Full Supabase response:', JSON.stringify(result, null, 2));
    
    if (result && typeof result === 'object') {
      console.log(`✅ Supabase result: ${result.sent || 0} sent, ${result.failed || 0} failed`);
    } else {
      console.log('⚠️ Unexpected response format from Supabase');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending batch push notifications:', error);
    throw error;
  }
};

/**
 * Get all push tokens from Firestore
 */
export const getAllPushTokens = async () => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const snapshot = await getDocs(tokensRef);
    const allTokens = snapshot.docs.map(doc => doc.data().token);
    console.log(`📋 Retrieved ${allTokens.length} push tokens from Firestore`);
    return allTokens;
  } catch (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }
};

/**
 * Get push token for specific user
 */
export const getUserPushToken = async (username) => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const q = query(tokensRef, where('username', '==', username));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data().token;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user push token:', error);
    return null;
  }
};

/**
 * Clear all old tokens (for migration)
 */
export const clearAllPushTokens = async () => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const snapshot = await getDocs(tokensRef);
    
    console.log(`🗑️ Deleting ${snapshot.size} old tokens...`);
    
    const deletePromises = snapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    
    console.log('✅ All old tokens cleared');
    return true;
  } catch (error) {
    console.error('Error clearing tokens:', error);
    return false;
  }
};

/**
 * Schedule a notification for later
 */
export const scheduleNotification = async ({ title, body, data = {}, channelId = 'default' }, seconds) => {
  try {
    const content = {
      title,
      body,
      data,
      sound: true,
    };

    if (Platform.OS === 'android') {
      content.channelId = channelId;
    }

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { seconds },
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get notification badge count
 */
export const getBadgeCount = async () => {
  return await Notifications.getBadgeCountAsync();
};

/**
 * Set notification badge count
 */
export const setBadgeCount = async (count) => {
  await Notifications.setBadgeCountAsync(count);
};

/**
 * Clear all notifications from notification tray
 */
export const dismissAllNotifications = async () => {
  await Notifications.dismissAllNotificationsAsync();
};

/**
 * Add notification listener
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Save notification to Firestore with proper type handling
 */
export const saveNotificationToHistory = async (username, notification) => {
  try {
    console.log('💾 Saving notification to history for:', username);
    console.log('   Type:', notification.data?.type);

    const notificationType = notification.data?.type;
    const isPublicNotification = ['earthquake', 'weather', 'typhoon'].includes(notificationType);
    const saveToUsername = isPublicNotification ? 'all' : username;

    console.log('   Saving to:', saveToUsername);

    await addDoc(collection(db, 'notifications'), {
      username: saveToUsername,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      type: notificationType || 'general',
      isPublic: isPublicNotification,
      read: false,
      createdAt: serverTimestamp(),
    });

    console.log('✅ Notification saved successfully');
  } catch (error) {
    console.error('❌ Error saving notification:', error);
  }
};

/**
 * Get user's notification history
 */
export const getNotificationHistory = async (username, limit = 50) => {
  try {
    console.log('📥 Fetching notifications for:', username);

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('username', '==', username)
    );

    const snapshot = await getDocs(q);
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));

    console.log(`   Found ${notifications.length} notifications`);

    return notifications;
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * Mark all notifications as read for user
 */
export const markAllNotificationsAsRead = async (username) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('username', '==', username), where('read', '==', false));
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(promises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

/**
 * Send earthquake alert
 */
export const sendEarthquakeAlert = async (magnitude, location) => {
  const notification = {
    title: `🚨 Earthquake Alert - Magnitude ${magnitude}`,
    body: `Earthquake detected in ${location}. Stay safe and follow emergency procedures.`,
    data: { type: 'earthquake', magnitude, location },
  };

  await sendLocalNotification({
    ...notification,
    channelId: 'earthquake',
  });

  const tokens = await getAllPushTokens();
  console.log(`🌍 Sending earthquake alert to ${tokens.length} users...`);

  if (tokens.length > 0) {
    await sendBatchPushNotifications(
      tokens,
      notification.title,
      notification.body,
      notification.data,
      'earthquake'
    );
  }

  await saveNotificationToHistory('all', notification);
};

/**
 * Send weather alert
 */
export const sendWeatherAlert = async (alertType, description) => {
  const notification = {
    title: `⚠️ Weather Alert: ${alertType}`,
    body: description,
    data: { type: 'weather', alertType },
  };

  await sendLocalNotification({
    ...notification,
    channelId: 'weather',
  });

  const tokens = await getAllPushTokens();
  console.log(`⛈️ Sending weather alert to ${tokens.length} users...`);

  if (tokens.length > 0) {
    await sendBatchPushNotifications(
      tokens,
      notification.title,
      notification.body,
      notification.data,
      'weather'
    );
  }

  await saveNotificationToHistory('all', notification);
};

/**
 * Send incident alert
 */
export const sendIncidentAlert = async (incidentType, distance) => {
  const notification = {
    title: `📍 New Incident Near You`,
    body: `${incidentType} reported ${distance} away. Tap to view details.`,
    data: { type: 'incident', incidentType },
  };

  await sendLocalNotification({
    ...notification,
    channelId: 'incident',
  });

  const tokens = await getAllPushTokens();
  console.log(`🚨 Sending incident alert to ${tokens.length} users...`);

  if (tokens.length > 0) {
    await sendBatchPushNotifications(
      tokens,
      notification.title,
      notification.body,
      notification.data,
      'incident'
    );
  }

  await saveNotificationToHistory('all', notification);
};