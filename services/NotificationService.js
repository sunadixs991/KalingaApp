// services/NotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // ⚠️ Deprecated
    shouldShowBanner: true,     // ✅ New
    shouldShowList: true,       // ✅ New (shows in notification center)
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications and save token to Firestore
 * @param {string} username - Current user's username
 * @returns {Promise<string|null>} Push token or null
 */
export const registerForPushNotifications = async (username) => {
  let token = null;

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the token
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push notification token:', token);

    // Save token to AsyncStorage
    await AsyncStorage.setItem('pushToken', token);

    // Save token to Firestore
    if (username) {
      await saveTokenToFirestore(username, token);
    }

    // Android specific setup
    if (Platform.OS === 'android') {
      console.log('🔔 Creating Android notification channels...');
      
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e75e33',
      });
      console.log('✅ Created channel: default');

      // Create notification channels for different alert types
      await Notifications.setNotificationChannelAsync('earthquake', {
        name: 'Earthquake Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e67e22',
        sound: 'default',
      });
      console.log('✅ Created channel: earthquake');

      await Notifications.setNotificationChannelAsync('weather', {
        name: 'Weather Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3498db',
        sound: 'default',
      });
      console.log('✅ Created channel: weather');

      await Notifications.setNotificationChannelAsync('incident', {
        name: 'Incident Reports',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e75e33',
      });
      console.log('✅ Created channel: incident');

      // ✅ NEW: Food Distribution Schedules channel
      await Notifications.setNotificationChannelAsync('schedules', {
        name: 'Food Distribution Schedules',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#49A5A2',
        sound: 'default',
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
    // Check if token already exists
    const tokensRef = collection(db, 'pushTokens');
    const q = query(tokensRef, where('username', '==', username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Create new token document
      await addDoc(tokensRef, {
        username,
        token,
        platform: Platform.OS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // Update existing token
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
 * Send a local notification (for testing or when app is in foreground)
 * @param {Object} options - Notification options
 */
export const sendLocalNotification = async ({ title, body, data = {}, channelId = 'default' }) => {
  try {
    console.log('📱 Sending local notification:', { title, channelId });
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
    
    console.log('✅ Local notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send local notification:', error);
  }
};

/**
 * Schedule a notification for later
 * @param {Object} options - Notification options
 * @param {number} seconds - Seconds from now to trigger
 */
export const scheduleNotification = async ({ title, body, data = {} }, seconds) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: {
      seconds,
    },
  });
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
 * Add notification listener (for when app is in foreground)
 * @param {Function} callback - Function to call when notification received
 * @returns {Object} Subscription object (call .remove() to unsubscribe)
 */
export const addNotificationReceivedListener = (callback) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener (for when user taps notification)
 * @param {Function} callback - Function to call when notification tapped
 * @returns {Object} Subscription object (call .remove() to unsubscribe)
 */
export const addNotificationResponseListener = (callback) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Save notification to Firestore for user's notification history
 */
export const saveNotificationToHistory = async (username, notification) => {
  try {
    console.log('💾 Saving notification to history:', username);
    
    await addDoc(collection(db, 'notifications'), {
      username,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      read: false,
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Notification saved to history');
  } catch (error) {
    console.error('❌ Error saving notification:', error);
  }
};

/**
 * Get user's notification history from Firestore
 */
export const getNotificationHistory = async (username, limit = 50) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('username', '==', username),
      // orderBy('createdAt', 'desc'),
      // limit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
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
 * Simulate earthquake notification (for testing)
 */
export const sendEarthquakeAlert = async (magnitude, location) => {
  await sendLocalNotification({
    title: `🚨 Earthquake Alert - Magnitude ${magnitude}`,
    body: `Earthquake detected in ${location}. Stay safe and follow emergency procedures.`,
    data: { type: 'earthquake', magnitude, location },
    channelId: 'earthquake',
  });
};

/**
 * Simulate weather alert notification (for testing)
 */
export const sendWeatherAlert = async (alertType, description) => {
  await sendLocalNotification({
    title: `⚠️ Weather Alert: ${alertType}`,
    body: description,
    data: { type: 'weather', alertType },
    channelId: 'weather',
  });
};

/**
 * Simulate nearby incident notification (for testing)
 */
export const sendIncidentAlert = async (incidentType, distance) => {
  await sendLocalNotification({
    title: `📍 New Incident Near You`,
    body: `${incidentType} reported ${distance} away. Tap to view details.`,
    data: { type: 'incident', incidentType },
    channelId: 'incident',
  });
};