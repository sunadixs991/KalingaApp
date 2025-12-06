// services/NotificationService.js - WITH REMOTE PUSH NOTIFICATIONS
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import Constants from 'expo-constants';

// ❌ REMOVED: Notification handler moved to App.js
// This should be configured at the app level, not in the service

/**
 * Register device for push notifications and save token to Firestore
 */
export const registerForPushNotifications = async (username) => {
  let token = null;

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // ✅ Try to get FCM device token first (for standalone builds)
    try {
      console.log('🔧 Attempting to get device push token (FCM)...');
      const devicePushToken = await Notifications.getDevicePushTokenAsync();

      if (devicePushToken && devicePushToken.data) {
        token = devicePushToken.data;
        console.log('✅ Got FCM device token:', token.substring(0, 50) + '...');
      } else {
        throw new Error('Device token data is null');
      }
    } catch (deviceTokenError) {
      console.log('⚠️ Could not get device token, using Expo token:', deviceTokenError.message);

      // Fallback to Expo push token
      const expoToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId
      });
      token = expoToken.data;
      console.log('📱 Using Expo push token:', token);
    }

    await AsyncStorage.setItem('pushToken', token);

    if (username) {
      await saveTokenToFirestore(username, token);
    }

    // ... rest of channel setup code ...

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Save push token to Firestore
 */
const saveTokenToFirestore = async (username, token) => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const q = query(tokensRef, where('username', '==', username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(tokensRef, {
        username,
        token,
        platform: Platform.OS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const docRef = doc(db, 'pushTokens', snapshot.docs[0].id);
      await updateDoc(docRef, {
        token,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
  }
};

/**
 * 🆕 Send REMOTE push notification via Expo's service (works when app is closed!)
 * This is 100% FREE - no backend server needed!
 */
export const sendRemotePushNotification = async (
  pushToken,
  title,
  body,
  data = {},
  channelId = 'default'
) => {
  try {
    console.log('📤 Sending push notification...');

    // Determine token type
    const isExpoToken = pushToken.startsWith('ExponentPushToken');
    const isFCMToken = pushToken.includes(':'); // FCM tokens have colons like "xxx:APA91b..."

    console.log('   Token type:', isExpoToken ? 'Expo' : isFCMToken ? 'FCM' : 'Unknown');

    // Both FCM and Expo tokens can use Expo's push service
    // Expo's service automatically routes FCM tokens correctly!
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      channelId: channelId,
      priority: 'high',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();

    if (result.data && result.data[0]?.status === 'error') {
      console.error('❌ Push notification error:', result.data[0]);
    } else {
      console.log('✅ Push notification sent successfully');
    }

    return result;
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    throw error;
  }
};

/**
 * 🆕 Send push notifications to multiple users at once
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
      return { data: [] };
    }

    // Filter out invalid tokens
    const validTokens = tokens.filter(token =>
      token && (token.startsWith('ExponentPushToken') || token.includes(':'))
    );

    if (validTokens.length === 0) {
      console.log('⚠️ No valid tokens found');
      return { data: [] };
    }

    console.log(`📤 Sending ${validTokens.length} push notifications...`);

    // Count token types
    const expoCount = validTokens.filter(t => t.startsWith('ExponentPushToken')).length;
    const fcmCount = validTokens.length - expoCount;
    console.log(`   📱 ${expoCount} Expo tokens, 🔥 ${fcmCount} FCM tokens`);

    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      channelId: channelId,
      priority: 'high',
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Check for errors
    if (result.data) {
      const errors = result.data.filter(r => r.status === 'error');
      const successes = result.data.filter(r => r.status === 'ok');

      console.log(`✅ Sent: ${successes.length} successful, ❌ ${errors.length} failed`);

      if (errors.length > 0) {
        console.error('Failed notifications:', errors);
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Error sending batch push notifications:', error);
    throw error;
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
      trigger: {
        seconds,
      },
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
 * Get user's notification history with proper filtering
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
    await updateDoc(notificationRef, {
      read: true,
    });
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
 * ✅ UPDATED: Send earthquake alert with BOTH local + remote push
 */
export const sendEarthquakeAlert = async (magnitude, location) => {
  const notification = {
    title: `🚨 Earthquake Alert - Magnitude ${magnitude}`,
    body: `Earthquake detected in ${location}. Stay safe and follow emergency procedures.`,
    data: { type: 'earthquake', magnitude, location },
  };

  // 1. Send local notification (for users with app open)
  await sendLocalNotification({
    ...notification,
    channelId: 'earthquake',
  });

  // 2. Send REMOTE push notifications to ALL users (works when app is closed!)
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

  // 3. Save to history
  await saveNotificationToHistory('all', notification);
};

/**
 * ✅ UPDATED: Send weather alert with BOTH local + remote push
 */
export const sendWeatherAlert = async (alertType, description) => {
  const notification = {
    title: `⚠️ Weather Alert: ${alertType}`,
    body: description,
    data: { type: 'weather', alertType },
  };

  // 1. Send local notification
  await sendLocalNotification({
    ...notification,
    channelId: 'weather',
  });

  // 2. Send REMOTE push notifications to ALL users
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

  // 3. Save to history
  await saveNotificationToHistory('all', notification);
};

/**
 * ✅ UPDATED: Send incident alert with BOTH local + remote push
 */
export const sendIncidentAlert = async (incidentType, distance) => {
  const notification = {
    title: `📍 New Incident Near You`,
    body: `${incidentType} reported ${distance} away. Tap to view details.`,
    data: { type: 'incident', incidentType },
  };

  // 1. Send local notification
  await sendLocalNotification({
    ...notification,
    channelId: 'incident',
  });

  // 2. Send REMOTE push notifications to ALL users
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

  // 3. Save to history
  await saveNotificationToHistory('all', notification);
};