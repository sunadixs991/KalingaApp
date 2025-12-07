// services/NotificationService.js - EXPO COMPATIBLE WITH FCM TOKENS
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

/**
 * ✅ Register device for push notifications
 * Gets FCM token for standalone builds, Expo token for development
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

    console.log('🔧 Getting push token...');
    console.log('   Platform:', Platform.OS);
    console.log('   App ownership:', Constants.appOwnership || 'standalone');

    // Get device push token (FCM for Android, APNS for iOS)
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken.data;
      console.log('✅ Got device push token (FCM)');
      console.log('   Token:', token.substring(0, 30) + '...');
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

    await AsyncStorage.setItem('pushToken', token);

    if (username) {
      await saveTokenToFirestore(username, token);
    }

    // Create Android notification channels
    if (Platform.OS === 'android') {
      console.log('🔔 Creating Android notification channels...');
      
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
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
      });

      await Notifications.setNotificationChannelAsync('weather', {
        name: 'Weather Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3498db',
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
    }

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

    const tokenData = {
      username,
      token,
      platform: Platform.OS,
      tokenType: token.startsWith('ExponentPushToken') ? 'expo' : 'fcm',
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
    console.error('Error saving token to Firestore:', error);
  }
};

/**
 * ✅ Send LOCAL notification
 */
export const sendLocalNotification = async ({ title, body, data = {}, channelId = 'default', priority = 'high' }) => {
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

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
    
    console.log('✅ Local notification sent');
  } catch (error) {
    console.error('❌ Failed to send local notification:', error);
    throw error;
  }
};

/**
 * ✅ FIXED: Send REMOTE push notification - Works with both Expo and FCM tokens
 * Uses Expo's push service which accepts both token types
 */
export const sendRemotePushNotification = async (
  pushToken,
  title,
  body,
  data = {},
  channelId = 'default'
) => {
  try {
    console.log('📤 Sending push notification via Expo service...');

    const isExpoToken = pushToken.startsWith('ExponentPushToken');
    const isFCMToken = !isExpoToken && pushToken.includes(':');

    console.log('   Token type:', isExpoToken ? 'Expo' : isFCMToken ? 'FCM' : 'Unknown');

    // Expo's push service accepts BOTH Expo tokens and FCM tokens
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      channelId: channelId,
      priority: 'high',
      // Important for Android
      android: {
        channelId: channelId,
        priority: 'high',
      },
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
      return { success: false, error: result.data[0] };
    } else {
      console.log('✅ Push notification sent successfully');
      return { success: true, result };
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ Send push notifications to multiple users at once
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
      console.log('⚠️ No tokens provided');
      return { success: 0, failure: 0 };
    }

    // Filter out invalid tokens
    const validTokens = tokens.filter(token => token && token.length > 20);

    if (validTokens.length === 0) {
      console.log('⚠️ No valid tokens found');
      return { success: 0, failure: 0 };
    }

    console.log(`📤 Sending ${validTokens.length} push notifications...`);

    // Better token type detection
    const expoTokens = validTokens.filter(t => t.startsWith('ExponentPushToken'));
    const fcmTokens = validTokens.filter(t => !t.startsWith('ExponentPushToken'));
    
    console.log(`   📱 ${expoTokens.length} Expo tokens, 🔥 ${fcmTokens.length} FCM tokens`);

    // Send all tokens to Expo's service (it handles both types)
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      channelId: channelId,
      priority: 'high',
      android: {
        channelId: channelId,
        priority: 'high',
      },
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

    // Count successes and failures
    let successCount = 0;
    let failureCount = 0;

    if (result.data) {
      result.data.forEach(r => {
        if (r.status === 'ok') {
          successCount++;
        } else if (r.status === 'error') {
          failureCount++;
          console.error('   ❌ Failed token:', r.message);
        }
      });
    }

    console.log(`✅ Sent: ${successCount} successful, ❌ ${failureCount} failed`);

    return {
      success: successCount,
      failure: failureCount,
      details: result.data,
    };
  } catch (error) {
    console.error('❌ Error sending batch push notifications:', error);
    throw error;
  }
};

// ========== ALL OTHER FUNCTIONS (UNCHANGED) ==========

export const getAllPushTokens = async () => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const snapshot = await getDocs(tokensRef);
    return snapshot.docs.map(doc => doc.data().token);
  } catch (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }
};

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

export const clearAllPushTokens = async () => {
  try {
    const tokensRef = collection(db, 'pushTokens');
    const snapshot = await getDocs(tokensRef);
    
    console.log(`🗑️ Deleting ${snapshot.size} old tokens...`);
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('✅ All old tokens cleared');
    return true;
  } catch (error) {
    console.error('Error clearing tokens:', error);
    return false;
  }
};

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

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const getBadgeCount = async () => {
  return await Notifications.getBadgeCountAsync();
};

export const setBadgeCount = async (count) => {
  await Notifications.setBadgeCountAsync(count);
};

export const dismissAllNotifications = async () => {
  await Notifications.dismissAllNotificationsAsync();
};

export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

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
  } catch (error) {
    console.error('❌ Error saving notification:', error);
  }
};

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

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const markAllNotificationsAsRead = async (username) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('username', '==', username), where('read', '==', false));
    const snapshot = await getDocs(q);

    const promises = snapshot.docs.map(doc => updateDoc(doc.ref, { read: true }));
    await Promise.all(promises);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

export const sendEarthquakeAlert = async (magnitude, location) => {
  const notification = {
    title: `🚨 Earthquake Alert - Magnitude ${magnitude}`,
    body: `Earthquake detected in ${location}. Stay safe and follow emergency procedures.`,
    data: { type: 'earthquake', magnitude, location },
  };

  await sendLocalNotification({ ...notification, channelId: 'earthquake' });

  const tokens = await getAllPushTokens();
  if (tokens.length > 0) {
    await sendBatchPushNotifications(tokens, notification.title, notification.body, notification.data, 'earthquake');
  }

  await saveNotificationToHistory('all', notification);
};

export const sendWeatherAlert = async (alertType, description) => {
  const notification = {
    title: `⚠️ Weather Alert: ${alertType}`,
    body: description,
    data: { type: 'weather', alertType },
  };

  await sendLocalNotification({ ...notification, channelId: 'weather' });

  const tokens = await getAllPushTokens();
  if (tokens.length > 0) {
    await sendBatchPushNotifications(tokens, notification.title, notification.body, notification.data, 'weather');
  }

  await saveNotificationToHistory('all', notification);
};

export const sendIncidentAlert = async (incidentType, distance) => {
  const notification = {
    title: `📍 New Incident Near You`,
    body: `${incidentType} reported ${distance} away. Tap to view details.`,
    data: { type: 'incident', incidentType },
  };

  await sendLocalNotification({ ...notification, channelId: 'incident' });

  const tokens = await getAllPushTokens();
  if (tokens.length > 0) {
    await sendBatchPushNotifications(tokens, notification.title, notification.body, notification.data, 'incident');
  }

  await saveNotificationToHistory('all', notification);
};

// Add to NotificationService.js
export const debugTokenTypes = async () => {
  const tokensRef = collection(db, 'pushTokens');
  const snapshot = await getDocs(tokensRef);
  
  console.log('=== TOKEN DEBUG ===');
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const isExpo = data.token.startsWith('ExponentPushToken');
    console.log(`${data.username}: ${isExpo ? 'Expo' : 'FCM'} (${data.platform})`);
  });
};