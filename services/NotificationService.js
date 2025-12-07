// services/NotificationService.js - OneSignal Version
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import Constants from 'expo-constants';
import { OneSignal } from 'react-native-onesignal';
import { supabase } from './supabaseClient';

// ✅ Initialize OneSignal (call this in App.js on startup)
export const initializeOneSignal = async (username) => {
  try {
    const appId = Constants.expoConfig?.extra?.oneSignalAppId;
    
    if (!appId) {
      console.error('❌ OneSignal App ID not found in app.json');
      return false;
    }

    console.log('🔧 Initializing OneSignal...');
    
    // Initialize OneSignal
    OneSignal.initialize(appId);
    
    // Request permission
    const permission = await OneSignal.Notifications.requestPermission(true);
    console.log('   Permission granted:', permission);

    if (!permission) {
      console.log('❌ Notification permission denied');
      return false;
    }

    // Set external user ID (your username)
    if (username) {
      OneSignal.login(username);
      console.log('✅ OneSignal logged in as:', username);
    }

    // Get OneSignal Player ID
    const deviceState = await OneSignal.User.pushSubscription.getPushSubscriptionId();
    console.log('📱 OneSignal Player ID:', deviceState);

    if (deviceState) {
      await AsyncStorage.setItem('oneSignalPlayerId', deviceState);
      await saveOneSignalIdToFirestore(username, deviceState);
    }

    // Setup notification handlers
    setupNotificationHandlers();

    console.log('🎉 OneSignal initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing OneSignal:', error);
    return false;
  }
};

/**
 * Setup OneSignal notification event handlers
 */
const setupNotificationHandlers = () => {
  // Notification received (foreground)
  OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
    console.log('📨 Notification received in foreground:', event.notification);
    
    // You can prevent display with: event.preventDefault();
    // Or modify the notification before display
  });

  // Notification clicked
  OneSignal.Notifications.addEventListener('click', (event) => {
    console.log('👆 Notification clicked:', event.notification);
    
    const data = event.notification.additionalData;
    console.log('   Additional data:', data);
    
    // Handle navigation based on notification type
    if (data?.type === 'earthquake') {
      // Navigate to earthquake alerts screen
    } else if (data?.type === 'weather') {
      // Navigate to weather alerts screen
    }
  });
};

/**
 * Save OneSignal Player ID to Firestore
 */
const saveOneSignalIdToFirestore = async (username, playerId) => {
  try {
    console.log('💾 Saving OneSignal Player ID to Firestore...');
    
    const tokensRef = collection(db, 'oneSignalPlayers');
    const q = query(tokensRef, where('username', '==', username));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(tokensRef, {
        username,
        playerId,
        platform: Platform.OS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ OneSignal Player ID saved');
    } else {
      const docRef = doc(db, 'oneSignalPlayers', snapshot.docs[0].id);
      await updateDoc(docRef, {
        playerId,
        platform: Platform.OS,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ OneSignal Player ID updated');
    }
  } catch (error) {
    console.error('❌ Error saving OneSignal Player ID:', error);
  }
};

/**
 * Get all OneSignal Player IDs from Firestore
 */
export const getAllOneSignalPlayerIds = async () => {
  try {
    const playersRef = collection(db, 'oneSignalPlayers');
    const snapshot = await getDocs(playersRef);
    const playerIds = snapshot.docs.map(doc => doc.data().playerId);
    console.log(`📋 Retrieved ${playerIds.length} OneSignal Player IDs`);
    return playerIds;
  } catch (error) {
    console.error('❌ Error fetching OneSignal Player IDs:', error);
    return [];
  }
};

/**
 * Get OneSignal Player ID for specific user
 */
export const getUserOneSignalPlayerId = async (username) => {
  try {
    const playersRef = collection(db, 'oneSignalPlayers');
    const q = query(playersRef, where('username', '==', username));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data().playerId;
    }
    return null;
  } catch (error) {
    console.error('❌ Error fetching user OneSignal Player ID:', error);
    return null;
  }
};

/**
 * Send notification to specific users via Supabase Edge Function
 */
export const sendOneSignalNotification = async (
  usernames,
  title,
  body,
  data = {},
  channelId = 'default'
) => {
  try {
    console.log('📤 Sending OneSignal notification to users:', usernames);

    const { data: result, error } = await supabase.functions.invoke('send-onesignal-notification', {
      body: {
        usernames,
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

    console.log('✅ OneSignal notification sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending OneSignal notification:', error);
    throw error;
  }
};

/**
 * Send notification to ALL users via Supabase Edge Function
 */
export const sendOneSignalBroadcast = async (
  title,
  body,
  data = {},
  channelId = 'default'
) => {
  try {
    console.log('📢 Broadcasting OneSignal notification to all users');

    const { data: result, error } = await supabase.functions.invoke('send-onesignal-notification', {
      body: {
        broadcast: true,
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

    console.log('✅ OneSignal broadcast sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending OneSignal broadcast:', error);
    throw error;
  }
};

/**
 * Send earthquake alert via OneSignal
 */
export const sendEarthquakeAlert = async (magnitude, location) => {
  const notification = {
    title: `🚨 Earthquake Alert - Magnitude ${magnitude}`,
    body: `Earthquake detected in ${location}. Stay safe and follow emergency procedures.`,
    data: { type: 'earthquake', magnitude, location },
  };

  console.log('🌍 Sending earthquake alert to all users...');

  await sendOneSignalBroadcast(
    notification.title,
    notification.body,
    notification.data,
    'earthquake'
  );

  await saveNotificationToHistory('all', notification);
};

/**
 * Send weather alert via OneSignal
 */
export const sendWeatherAlert = async (alertType, description) => {
  const notification = {
    title: `⚠️ Weather Alert: ${alertType}`,
    body: description,
    data: { type: 'weather', alertType },
  };

  console.log('⛈️ Sending weather alert to all users...');

  await sendOneSignalBroadcast(
    notification.title,
    notification.body,
    notification.data,
    'weather'
  );

  await saveNotificationToHistory('all', notification);
};

/**
 * Send incident alert via OneSignal
 */
export const sendIncidentAlert = async (incidentType, distance) => {
  const notification = {
    title: `📍 New Incident Near You`,
    body: `${incidentType} reported ${distance} away. Tap to view details.`,
    data: { type: 'incident', incidentType },
  };

  console.log('🚨 Sending incident alert to all users...');

  await sendOneSignalBroadcast(
    notification.title,
    notification.body,
    notification.data,
    'incident'
  );

  await saveNotificationToHistory('all', notification);
};

/**
 * Save notification to Firestore history
 */
export const saveNotificationToHistory = async (username, notification) => {
  try {
    console.log('💾 Saving notification to history for:', username);
    
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
    console.error('❌ Error marking notification as read:', error);
  }
};

/**
 * Set tags for user segmentation
 */
export const setOneSignalTags = async (tags) => {
  try {
    await OneSignal.User.addTags(tags);
    console.log('✅ OneSignal tags set:', tags);
  } catch (error) {
    console.error('❌ Error setting OneSignal tags:', error);
  }
};

/**
 * Logout from OneSignal
 */
export const logoutOneSignal = async () => {
  try {
    await OneSignal.logout();
    await AsyncStorage.removeItem('oneSignalPlayerId');
    console.log('✅ Logged out from OneSignal');
  } catch (error) {
    console.error('❌ Error logging out from OneSignal:', error);
  }
};