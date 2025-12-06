// services/NotificationService.js - FIXED VERSION
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push notification token:', token);

    await AsyncStorage.setItem('pushToken', token);

    if (username) {
      await saveTokenToFirestore(username, token);
    }

    if (Platform.OS === 'android') {
      console.log('🔔 Creating Android notification channels...');
      
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#e75e33',
        sound: 'default',
      });
      console.log('✅ Created channel: default');

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
        sound: 'default',
      });
      console.log('✅ Created channel: incident');

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
 * Send a local notification
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

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: null,
    });
    
    console.log('✅ Local notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send local notification:', error);
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
 * ✅ FIXED: Save notification to Firestore with proper type handling
 * @param {string} username - Username or 'all' for public notifications
 * @param {Object} notification - Notification object
 */
export const saveNotificationToHistory = async (username, notification) => {
  try {
    console.log('💾 Saving notification to history for:', username);
    console.log('   Type:', notification.data?.type);
    
    // Determine if this is a public notification
    const notificationType = notification.data?.type;
    const isPublicNotification = ['earthquake', 'weather', 'typhoon'].includes(notificationType);
    
    // Public notifications should be saved to 'all'
    // Personal notifications should be saved to the specific user
    const saveToUsername = isPublicNotification ? 'all' : username;
    
    console.log('   Saving to:', saveToUsername);
    
    await addDoc(collection(db, 'notifications'), {
      username: saveToUsername,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      type: notificationType || 'general', // ✅ Add type field for easier filtering
      isPublic: isPublicNotification, // ✅ Flag for public notifications
      read: false,
      createdAt: serverTimestamp(),
    });
    
    console.log('✅ Notification saved successfully');
  } catch (error) {
    console.error('❌ Error saving notification:', error);
  }
};

/**
 * ✅ FIXED: Get user's notification history with proper filtering
 * @param {string} username - Username or 'all' for public notifications
 * @param {number} limit - Maximum number of notifications to fetch
 */
export const getNotificationHistory = async (username, limit = 50) => {
  try {
    console.log('📥 Fetching notifications for:', username);
    
    const notificationsRef = collection(db, 'notifications');
    
    // Query based on username
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
 * ✅ FIXED: Send earthquake alert (saves to 'all' automatically)
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
  
  // Save to 'all' for everyone to see
  await saveNotificationToHistory('all', notification);
};

/**
 * ✅ FIXED: Send weather alert (saves to 'all' automatically)
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
  
  // Save to 'all' for everyone to see
  await saveNotificationToHistory('all', notification);
};

/**
 * ✅ FIXED: Send incident alert (saves to 'all' automatically)
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
  
  // Save to 'all' for everyone to see
  await saveNotificationToHistory('all', notification);
};