// services/NotificationService.js - VERIFIED AND CORRECTED
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// ✅ CRITICAL: Set notification handler BEFORE any notifications are sent
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

    // ✅ Get project ID
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                      Constants.easConfig?.projectId ||
                      Constants.manifest?.extra?.eas?.projectId;

    if (!projectId) {
      console.error('❌ No EAS project ID found! Check your app.json');
    }

    console.log('🔧 Getting Expo push token...');
    console.log('   Project ID:', projectId);
    
    const expoToken = await Notifications.getExpoPushTokenAsync({
      projectId: projectId
    });
    
    token = expoToken.data;
    console.log('📱 Got Expo push token:', token);

    await AsyncStorage.setItem('pushToken', token);

    if (username) {
      await saveTokenToFirestore(username, token);
    }

    // ✅ Create notification channels
    if (Platform.OS === 'android') {
      console.log('🔔 Creating Android notification channels...');
      
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e75e33',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      console.log('✅ Created channel: default');

      await Notifications.setNotificationChannelAsync('earthquake', {
        name: 'Earthquake Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#e67e22',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log('✅ Created channel: earthquake');

      await Notifications.setNotificationChannelAsync('weather', {
        name: 'Weather Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3498db',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log('✅ Created channel: weather');

      await Notifications.setNotificationChannelAsync('incident', {
        name: 'Incident Reports',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e75e33',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
      console.log('✅ Created channel: incident');

      await Notifications.setNotificationChannelAsync('schedules', {
        name: 'Food Distribution Schedules',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#49A5A2',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      console.log('✅ Created channel: schedules');
      
      console.log('🎉 All notification channels created successfully!');
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
 * ✅ Send LOCAL notification (works when app is open/background)
 */
export const sendLocalNotification = async ({ title, body, data = {}, channelId = 'default', priority = 'high' }) => {
  try {
    console.log('📱 Sending local notification:', { title, channelId, priority });
    
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
 * ✅ CORRECTED: Send REMOTE push notification with experienceId
 * This is CRITICAL for standalone builds to show your app name, not "Expo Go"
 */
export const sendRemotePushNotification = async (
  pushToken,
  title,
  body,
  data = {},
  channelId = 'default'
) => {
  try {
    console.log('📤 Sending remote push notification...');
    console.log('   Channel:', channelId);
    console.log('   Token:', pushToken.substring(0, 30) + '...');

    const isExpoToken = pushToken.startsWith('ExponentPushToken');
    const isFCMToken = pushToken.includes(':');

    console.log('   Token type:', isExpoToken ? 'Expo' : isFCMToken ? 'FCM' : 'Unknown');

    // ✅ CRITICAL FIX: Add experienceId to route notification to YOUR app
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: {
        ...data,
        experienceId: '@sunadixs98/Kalinga-App', // 🔴 CHANGE THIS TO YOUR EXPO USERNAME
      },
      channelId: channelId,
      categoryId: channelId,
      priority: 'high',
      badge: 1,
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
      console.error('   Message:', result.data[0].message);
      console.error('   Details:', result.data[0].details);
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
 * ✅ CORRECTED: Send batch push notifications with experienceId
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

    const validTokens = tokens.filter(token =>
      token && (token.startsWith('ExponentPushToken') || token.includes(':'))
    );

    if (validTokens.length === 0) {
      console.log('⚠️ No valid tokens found');
      return { data: [] };
    }

    console.log(`📤 Sending ${validTokens.length} push notifications...`);
    console.log('   Channel:', channelId);

    const expoCount = validTokens.filter(t => t.startsWith('ExponentPushToken')).length;
    const fcmCount = validTokens.length - expoCount;
    console.log(`   📱 ${expoCount} Expo tokens, 🔥 ${fcmCount} FCM tokens`);

    // ✅ CRITICAL FIX: Add experienceId to each message
    const messages = validTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title,
      body: body,
      data: {
        ...data,
        experienceId: '@sunadixs98/Kalinga-App', // 🔴 CHANGE THIS TO YOUR EXPO USERNAME
      },
      channelId: channelId,
      categoryId: channelId,
      priority: 'high',
      badge: 1,
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

    if (result.data) {
      const errors = result.data.filter(r => r.status === 'error');
      const successes = result.data.filter(r => r.status === 'ok');

      console.log(`✅ Sent: ${successes.length} successful, ❌ ${errors.length} failed`);

      if (errors.length > 0) {
        console.error('Failed notifications:');
        errors.forEach((err, index) => {
          console.error(`  ${index + 1}. ${err.message}`, err.details);
        });
      }
    }

    return result;
  } catch (error) {
    console.error('❌ Error sending batch push notifications:', error);
    throw error;
  }
};

/**
 * ✅ Get all push tokens from Firestore
 */
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
    console.error('Error fetching user push token:', error);
    return null;
  }
};

/**
 * ✅ Clear all old tokens (for migration)
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
 * ✅ Send earthquake alert with BOTH local + remote push
 */
export const sendEarthquakeAlert = async (magnitude, location) => {
  const notification = {
    title: `🚨 Earthquake Alert - Magnitude ${magnitude}`,
    body: `Earthquake detected in ${location}. Stay safe and follow emergency procedures.`,
    data: { type: 'earthquake', magnitude, location },
  };

  // 1. Send local notification
  await sendLocalNotification({
    ...notification,
    channelId: 'earthquake',
  });

  // 2. Send REMOTE push notifications to ALL users
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
 * ✅ Send weather alert with BOTH local + remote push
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
 * ✅ Send incident alert with BOTH local + remote push
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