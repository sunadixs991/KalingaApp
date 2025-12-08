// services/NotificationService.js - SUPABASE EDGE FUNCTION VERSION
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { supabase } from './supabaseClient';

// ========== SUPABASE CONFIGURATION ==========

const EDGE_FUNCTION_URL = `${supabase.supabaseUrl}/functions/v1/send-push-notification`;
const SUPABASE_ANON_KEY = supabase.supabaseKey;

// ========== NOTIFICATION CONFIGURATION ==========

const NOTIFICATION_CONFIG = {
  earthquake: {
    getPriority: (magnitude) => {
      if (magnitude >= 7.0) return 'max'; // Critical
      if (magnitude >= 5.0) return 'high';
      return 'default';
    },
    getVibration: (magnitude) => {
      if (magnitude >= 7.0) return [0, 500, 200, 500, 200, 500]; // Urgent
      if (magnitude >= 5.0) return [0, 250, 250, 250];
      return [0, 250, 250, 250];
    }
  },
  weather: {
    priorityMap: {
      'typhoon_super_typhoon': 'max',
      'typhoon_typhoon': 'high',
      'storm': 'high',
      'high_wind': 'default',
      'heavy_rain': 'default',
      'extreme_heat': 'default'
    }
  }
};

// ========== PUSH TOKEN MANAGEMENT ==========

/**
 * ✅ Register device for push notifications with improved error handling
 */
export const registerForPushNotifications = async (username) => {
  let token = null;

  if (!Device.isDevice) {
    console.log('⚠️ Must use physical device for Push Notifications');
    return null;
  }

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('❌ Push notification permission denied');
      return null;
    }

    console.log('🔧 Getting push token...');
    console.log('   Platform:', Platform.OS);
    console.log('   App ownership:', Constants.appOwnership || 'standalone');

    // Try to get device push token (FCM for Android, APNS for iOS)
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken.data;
      console.log('✅ Got device push token (FCM/APNS)');
      console.log('   Token length:', token.length);
      console.log('   Token preview:', token.substring(0, 30) + '...');
    } catch (error) {
      console.error('⚠️ Failed to get device token, trying Expo token:', error);

      // Fallback to Expo token
      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId
      });
      token = expoToken.data;
      console.log('✅ Got Expo push token (fallback)');
      console.log('   Token:', token);
    }

    // Save token locally
    await AsyncStorage.setItem('pushToken', token);
    await AsyncStorage.setItem('pushTokenTimestamp', Date.now().toString());

    // Save to Firestore if username provided
    if (username) {
      await saveTokenToFirestore(username, token);
    }

    // Setup notification channels (Android)
    await setupNotificationChannels();

    return token;
  } catch (error) {
    if (token.startsWith('ExponentPushToken')) {
      console.log('✅ Using Expo Push Token');
    } else if (token.includes(':') && token.length > 120) {
      console.log('✅ Using FCM Token (will be sent directly to FCM)');
    }
    console.error('❌ Error registering for push notifications:', error);
    return null;
  }
};

/**
 * ✅ Setup Android notification channels with proper priorities
 */
const setupNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  console.log('🔔 Creating Android notification channels...');

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e75e33',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('earthquake', {
      name: 'Earthquake Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e67e22',
      sound: 'default',
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('earthquake_critical', {
      name: 'Critical Earthquake Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#c0392b',
      sound: 'default',
      enableVibrate: true,
    });

    await Notifications.setNotificationChannelAsync('weather', {
      name: 'Weather Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3498db',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('weather_critical', {
      name: 'Critical Weather Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      lightColor: '#8B0000',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('incident', {
      name: 'Incident Reports',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e75e33',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('schedules', {
      name: 'Food Distribution Schedules',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#49A5A2',
      sound: 'default',
    });

    console.log('✅ All notification channels created!');
  } catch (error) {
    console.error('❌ Error creating notification channels:', error);
  }
};

/**
 * ✅ Save push token to Firestore with metadata
 */
const saveTokenToFirestore = async (username, token) => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const q = query(tokensRef, where('username', '==', username));
    const snapshot = await getDocs(q);

    const tokenData = {
      username,
      token,
      platform: Platform.OS,
      tokenType: token.startsWith('ExponentPushToken') ? 'expo' : 'fcm',
      deviceModel: Device.modelName || 'unknown',
      osVersion: Device.osVersion || 'unknown',
      updatedAt: serverTimestamp(),
    };

    if (snapshot.empty) {
      await addDoc(tokensRef, {
        ...tokenData,
        createdAt: serverTimestamp(),
      });
      console.log('✅ Token saved to Firestore');
    } else {
      const docRef = doc(db, 'pushTokens', snapshot.docs[0].id);
      await updateDoc(docRef, tokenData);
      console.log('✅ Token updated in Firestore');
    }
  } catch (error) {
    console.error('❌ Error saving token to Firestore:', error);
  }
};

/**
 * ✅ Get all push tokens (for broadcasting)
 */
export const getAllPushTokens = async () => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const snapshot = await getDocs(tokensRef);
    return snapshot.docs.map(doc => doc.data().token).filter(Boolean);
  } catch (error) {
    console.error('❌ Error fetching push tokens:', error);
    return [];
  }
};

/**
 * ✅ Get push token for specific user
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
    console.error('❌ Error fetching user push token:', error);
    return null;
  }
};

/**
 * ✅ Get current device token
 */
export const getCurrentDeviceToken = async () => {
  try {
    return await AsyncStorage.getItem('pushToken');
  } catch (error) {
    return null;
  }
};

/**
 * ✅ Clean up invalid/expired tokens
 */
export const cleanupInvalidTokens = async (invalidTokens) => {
  try {
    if (!invalidTokens || invalidTokens.length === 0) return;

    console.log(`🗑️ Cleaning up ${invalidTokens.length} invalid tokens...`);

    const tokensRef = collection(db, 'pushTokens');

    for (const token of invalidTokens) {
      const q = query(tokensRef, where('token', '==', token));
      const snapshot = await getDocs(q);

      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }

    console.log('✅ Invalid tokens cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up tokens:', error);
  }
};

/**
 * ✅ Clear all push tokens (admin function)
 */
export const clearAllPushTokens = async () => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const snapshot = await getDocs(tokensRef);

    console.log(`🗑️ Deleting ${snapshot.size} tokens...`);

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log('✅ All tokens cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
    return false;
  }
};

// ========== LOCAL NOTIFICATIONS ==========

/**
 * ✅ Send LOCAL notification with dynamic priority
 */
export const sendLocalNotification = async ({
  title,
  body,
  data = {},
  channelId = 'default',
  priority = 'high',
  vibrationPattern = null
}) => {
  try {
    console.log('📱 Sending local notification:', { title, channelId });

    // Determine channel based on severity
    let finalChannelId = channelId;
    if (data.type === 'earthquake' && data.magnitude >= 7.0) {
      finalChannelId = 'earthquake_critical';
    } else if (data.type === 'weather' &&
      (data.alertType?.includes('super_typhoon') || data.alertType?.includes('storm'))) {
      finalChannelId = 'weather_critical';
    }

    const content = {
      title,
      body,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      vibrate: vibrationPattern || [0, 250, 250, 250],
    };

    if (Platform.OS === 'android') {
      content.channelId = finalChannelId;
    }

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null, // Immediate
    });

    console.log('✅ Local notification sent');
    return true;
  } catch (error) {
    console.error('❌ Failed to send local notification:', error);
    return false;
  }
};

// ========== REMOTE PUSH NOTIFICATIONS (SUPABASE) ==========

/**
 * ✅ Send REMOTE push notification via Supabase Edge Function (single device)
 */
export const sendRemotePushNotification = async (
  pushToken,
  title,
  body,
  data = {},
  channelId = 'default',
  priority = 'high'
) => {
  try {
    if (!pushToken) {
      console.log('⚠️ No push token provided');
      return { success: false, error: 'No token' };
    }

    console.log('📤 Sending remote push notification via Supabase...');
    console.log('   Token type:', pushToken.startsWith('ExponentPushToken') ? 'Expo' : 'FCM/APNS');
    console.log('   Token length:', pushToken.length);

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        tokens: [pushToken],
        title,
        body,
        data,
        channelId,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('❌ Push notification error:', result);
      return { success: false, error: result.error || 'Unknown error' };
    }

    console.log('✅ Remote push notification sent');
    console.log(`   Sent: ${result.sent}, Failed: ${result.failed}`);

    return { success: true, result };
  } catch (error) {
    console.error('❌ Error sending remote push notification:', error);
    return { success: false, error: error.message };
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
  channelId = 'default',
  priority = 'high'
) => {
  try {
    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No tokens provided');
      return { success: 0, failure: 0, invalidTokens: [] };
    }

    // Filter valid tokens: Expo tokens OR FCM tokens (120+ characters)
    const validTokens = tokens.filter(token => {
      if (!token) return false;
      // Expo tokens
      if (token.startsWith('ExponentPushToken')) return true;
      // FCM tokens must be 120+ characters
      if (token.includes(':') && token.length >= 120) return true;
      return false;
    });

    if (validTokens.length === 0) {
      console.log('⚠️ No valid tokens found');
      return { success: 0, failure: 0, invalidTokens: [] };
    }

    console.log(`📤 Sending ${validTokens.length} push notifications via Supabase...`);

    const expoTokens = validTokens.filter(t => t.startsWith('ExponentPushToken'));
    const fcmTokens = validTokens.filter(t => !t.startsWith('ExponentPushToken'));

    console.log(`   📱 ${expoTokens.length} Expo tokens, 🔥 ${fcmTokens.length} FCM tokens (120+ chars)`);

    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        tokens: validTokens,
        title,
        body,
        data,
        channelId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Supabase edge function error:', result);
      return {
        success: 0,
        failure: validTokens.length,
        invalidTokens: [],
        error: result.error
      };
    }

    console.log(`✅ Sent: ${result.sent} successful, ❌ ${result.failed} failed`);

    return {
      success: result.sent || 0,
      failure: result.failed || 0,
      invalidTokens: [],
      total: result.total || validTokens.length
    };
  } catch (error) {
    console.error('❌ Error sending batch push notifications:', error);
    throw error;
  }
};

/**
 * ✅ Send broadcast notification via Supabase (excludes current device to prevent duplicates)
 */
export const sendBroadcastNotification = async (
  title,
  body,
  data = {},
  channelId = 'default',
  excludeCurrentDevice = true
) => {
  try {
    console.log('📡 Broadcasting notification via Supabase...');
    console.log('   Exclude current device:', excludeCurrentDevice);

    // Get all tokens
    const allTokens = await getAllPushTokens();

    // Optionally exclude current device
    let targetTokens = allTokens;
    if (excludeCurrentDevice) {
      const currentToken = await getCurrentDeviceToken();
      if (currentToken) {
        targetTokens = allTokens.filter(t => t !== currentToken);
        console.log(`   Excluded current device (${allTokens.length} → ${targetTokens.length} tokens)`);
      }
    }

    if (targetTokens.length === 0) {
      console.log('⚠️ No target devices for broadcast');
      return { success: 0, failure: 0 };
    }

    // Send to all target devices
    return await sendBatchPushNotifications(
      targetTokens,
      title,
      body,
      data,
      channelId
    );
  } catch (error) {
    console.error('❌ Error broadcasting notification:', error);
    throw error;
  }
};

// ========== NOTIFICATION HISTORY ==========

/**
 * ✅ Save notification to Firestore history
 */
export const saveNotificationToHistory = async (username, notification) => {
  try {
    const notificationType = notification.data?.type;
    const isPublicNotification = ['earthquake', 'weather', 'typhoon'].includes(notificationType);
    const saveToUsername = isPublicNotification ? 'all' : username;

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

    console.log('✅ Notification saved to history');
  } catch (error) {
    console.error('❌ Error saving notification:', error);
  }
};

/**
 * ✅ Get notification history
 */
export const getNotificationHistory = async (username, limit = 50) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('username', '==', username));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return [];
  }
};

/**
 * ✅ Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
  }
};

/**
 * ✅ Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (username) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('username', '==', username), where('read', '==', false));
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map(doc => updateDoc(doc.ref, { read: true }));
    await Promise.all(promises);
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
  }
};

// ========== NOTIFICATION MANAGEMENT ==========

/**
 * ✅ Schedule notification for later
 */
export const scheduleNotification = async ({
  title,
  body,
  data = {},
  channelId = 'default'
}, seconds) => {
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

    console.log(`✅ Notification scheduled for ${seconds}s from now`);
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    throw error;
  }
};

/**
 * ✅ Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * ✅ Get badge count
 */
export const getBadgeCount = async () => {
  return await Notifications.getBadgeCountAsync();
};

/**
 * ✅ Set badge count
 */
export const setBadgeCount = async (count) => {
  await Notifications.setBadgeCountAsync(count);
};

/**
 * ✅ Dismiss all notifications
 */
export const dismissAllNotifications = async () => {
  await Notifications.dismissAllNotificationsAsync();
};

/**
 * ✅ Add notification received listener
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * ✅ Add notification response listener
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

// ========== QUICK NOTIFICATION HELPERS ==========

/**
 * ✅ Send earthquake alert
 */
export const sendEarthquakeAlert = async (magnitude, location, excludeCurrentDevice = true) => {
  const channelId = magnitude >= 7.0 ? 'earthquake_critical' : 'earthquake';

  const notification = {
    title: `🚨 Earthquake Alert - Magnitude ${magnitude}`,
    body: `Earthquake detected in ${location}. Stay safe and follow emergency procedures.`,
    data: { type: 'earthquake', magnitude, location },
  };

  // Send to other devices only
  await sendBroadcastNotification(
    notification.title,
    notification.body,
    notification.data,
    channelId,
    excludeCurrentDevice
  );

  // Save to history
  await saveNotificationToHistory('all', notification);
};

/**
 * ✅ Send weather alert
 */
export const sendWeatherAlert = async (alertType, description, excludeCurrentDevice = true) => {
  const isCritical = alertType.includes('typhoon') || alertType.includes('storm');
  const channelId = isCritical ? 'weather_critical' : 'weather';

  const notification = {
    title: `⚠️ Weather Alert: ${alertType}`,
    body: description,
    data: { type: 'weather', alertType },
  };

  await sendBroadcastNotification(
    notification.title,
    notification.body,
    notification.data,
    channelId,
    excludeCurrentDevice
  );

  await saveNotificationToHistory('all', notification);
};

/**
 * ✅ Send incident alert
 */
export const sendIncidentAlert = async (incidentType, distance, excludeCurrentDevice = true) => {
  const notification = {
    title: `📍 New Incident Near You`,
    body: `${incidentType} reported ${distance} away. Tap to view details.`,
    data: { type: 'incident', incidentType },
  };

  await sendBroadcastNotification(
    notification.title,
    notification.body,
    notification.data,
    'incident',
    excludeCurrentDevice
  );

  await saveNotificationToHistory('all', notification);
};

// ========== DEBUG UTILITIES ==========

/**
 * ✅ Debug token types
 */
export const debugTokenTypes = async () => {
  const tokensRef = collection(db, 'pushTokens');
  const snapshot = await getDocs(tokensRef);

  console.log('=== TOKEN DEBUG ===');
  console.log(`Total tokens: ${snapshot.size}`);

  const tokensByType = { expo: 0, fcm: 0, unknown: 0 };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const isExpo = data.token.startsWith('ExponentPushToken');
    const isFCM = !isExpo && data.token.includes(':') && data.token.length >= 120;

    if (isExpo) tokensByType.expo++;
    else if (isFCM) tokensByType.fcm++;
    else tokensByType.unknown++;

    console.log(`${data.username}: ${isExpo ? 'Expo' : isFCM ? 'FCM (120+)' : 'Unknown'} (${data.platform}) - Length: ${data.token.length}`);
  });

  console.log('Summary:', tokensByType);
  return tokensByType;
};