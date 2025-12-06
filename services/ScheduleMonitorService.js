// services/ScheduleMonitorService.js - WITH REMOTE PUSH NOTIFICATIONS
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { 
  sendLocalNotification, 
  saveNotificationToHistory,
  getUserPushToken,
  sendRemotePushNotification,
  getAllPushTokens,
  sendBatchPushNotifications
} from './NotificationService';

const SCHEDULE_MONITOR_TASK = 'SCHEDULE_MONITOR_TASK';
const LAST_SCHEDULE_CHECK = 'last_schedule_check';
const NOTIFIED_SCHEDULES_KEY = 'notified_schedules';
const CHECK_INTERVAL_MINUTES = 15; // Check every 15 minutes

/**
 * Get user data from AsyncStorage
 */
async function getUserData() {
  try {
    const username = await AsyncStorage.getItem('username');
    if (!username) {
      return null;
    }
    return { username };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

/**
 * Get the last time we checked for schedules
 */
async function getLastCheckTime() {
  try {
    const str = await AsyncStorage.getItem(LAST_SCHEDULE_CHECK);
    return str ? parseInt(str) : Date.now() - 7 * 24 * 60 * 60 * 1000; // Default: 7 days ago
  } catch (error) {
    return Date.now() - 7 * 24 * 60 * 60 * 1000;
  }
}

/**
 * Get list of schedule IDs we've already notified about
 */
async function getNotifiedSchedules() {
  try {
    const str = await AsyncStorage.getItem(NOTIFIED_SCHEDULES_KEY);
    const list = str ? JSON.parse(str) : [];
    
    // Keep only last 200 to prevent list from growing forever
    if (list.length > 200) {
      return list.slice(-200);
    }
    return list;
  } catch (error) {
    return [];
  }
}

/**
 * Add schedule ID to notified list
 */
async function markScheduleAsNotified(scheduleId) {
  try {
    const notified = await getNotifiedSchedules();
    if (!notified.includes(scheduleId)) {
      notified.push(scheduleId);
      await AsyncStorage.setItem(NOTIFIED_SCHEDULES_KEY, JSON.stringify(notified));
    }
  } catch (error) {
    console.error('Error marking schedule as notified:', error);
  }
}

/**
 * Get user's barangay and purok from Firestore
 */
async function getUserLocation(username) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('User not found:', username);
      return null;
    }
    
    const userData = snapshot.docs[0].data();
    return {
      barangay: userData.barangay || null,
      purok: userData.purok || null,
    };
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}

/**
 * ✅ NEW: Get all users in a specific barangay and purok
 */
async function getUsersInLocation(barangay, purok) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('barangay', '==', barangay),
      where('purok', '==', purok)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data().username);
  } catch (error) {
    console.error('Error getting users in location:', error);
    return [];
  }
}

/**
 * ✅ NEW: Get push tokens for users in specific location
 */
async function getPushTokensForLocation(barangay, purok) {
  try {
    const usernames = await getUsersInLocation(barangay, purok);
    
    if (usernames.length === 0) {
      return [];
    }

    // Get push tokens for these users
    const tokensRef = collection(db, 'pushTokens');
    const tokens = [];

    // Firebase doesn't support 'in' queries with more than 10 items,
    // so we batch the queries
    const batchSize = 10;
    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize);
      const q = query(tokensRef, where('username', 'in', batch));
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
        tokens.push(doc.data().token);
      });
    }

    return tokens;
  } catch (error) {
    console.error('Error getting push tokens for location:', error);
    return [];
  }
}

/**
 * ✅ UPDATED: Check for new food distribution schedules with REMOTE push notifications
 */
const checkForNewSchedules = async (username, isManualCheck = false) => {
  try {
    console.log('📅 Checking for new schedules...', isManualCheck ? '(Manual)' : '(Background)');
    
    if (!username) {
      console.log('   ⚠️ No username provided');
      return false;
    }

    // Get user's location (barangay and purok)
    const userLocation = await getUserLocation(username);
    
    if (!userLocation || !userLocation.barangay || !userLocation.purok) {
      console.log('   ⚠️ User location not set (barangay/purok missing)');
      return false;
    }

    console.log('   📍 User location:', userLocation.barangay, userLocation.purok);

    // Get last check time and notified schedules
    const lastCheck = await getLastCheckTime();
    const notifiedSchedules = await getNotifiedSchedules();

    // Query Firebase for new schedules in user's barangay and purok
    const schedulesRef = collection(db, 'food_schedules');
    const q = query(
      schedulesRef,
      where('title', '==', userLocation.barangay),
      where('purok', '==', userLocation.purok)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('   ℹ️ No schedules found for this location');
      return false;
    }

    console.log(`   📋 Found ${snapshot.size} total schedules for this location`);

    // Filter for new schedules (created after last check and not yet notified)
    const newSchedules = [];
    
    snapshot.forEach((doc) => {
      const scheduleData = doc.data();
      const scheduleId = doc.id;
      
      // Check if already notified
      if (notifiedSchedules.includes(scheduleId)) {
        return;
      }

      // Check if created after last check
      const createdAt = scheduleData.createdAt?.toDate?.() || new Date(scheduleData.createdAt);
      
      if (createdAt.getTime() > lastCheck) {
        newSchedules.push({
          id: scheduleId,
          ...scheduleData,
          createdAt,
        });
      }
    });

    if (newSchedules.length === 0) {
      console.log('   ✅ No new schedules (all already notified)');
      await AsyncStorage.setItem(LAST_SCHEDULE_CHECK, Date.now().toString());
      return false;
    }

    console.log(`   📢 Found ${newSchedules.length} NEW schedules!`);

    // Send notifications for each new schedule
    for (const schedule of newSchedules) {
      const title = '📅 New Food Distribution Schedule';
      const body = `${schedule.title}, ${schedule.purok}\n📍 ${schedule.location}\n📆 ${schedule.date} at ${schedule.time}`;
      
      const notificationData = {
        type: 'food_schedule',
        barangay: schedule.title,
        purok: schedule.purok,
        location: schedule.location,
        date: schedule.date,
        time: schedule.time,
        scheduleId: schedule.id,
      };

      try {
        // 1️⃣ Send LOCAL notification (for current user if app is open)
        await sendLocalNotification({
          title,
          body,
          data: notificationData,
          channelId: 'schedules',
        });

        // 2️⃣ Send REMOTE push notifications to ALL users in this location
        const tokens = await getPushTokensForLocation(schedule.title, schedule.purok);
        console.log(`   📤 Sending to ${tokens.length} users in ${schedule.title}, ${schedule.purok}...`);
        
        if (tokens.length > 0) {
          await sendBatchPushNotifications(
            tokens,
            title,
            body,
            notificationData,
            'schedules'
          );
          console.log(`   ✅ Remote push sent to ${tokens.length} devices`);
        }

        // 3️⃣ Save to notification history for all users in this location
        const usersInLocation = await getUsersInLocation(schedule.title, schedule.purok);
        for (const user of usersInLocation) {
          await saveNotificationToHistory(user, {
            title,
            body,
            data: notificationData,
          });
        }

        // 4️⃣ Mark as notified
        await markScheduleAsNotified(schedule.id);

        console.log(`   ✅ Notified about schedule: ${schedule.location} on ${schedule.date}`);
      } catch (error) {
        console.error(`   ❌ Failed to notify about schedule ${schedule.id}:`, error);
      }
    }

    // Update last check time
    await AsyncStorage.setItem(LAST_SCHEDULE_CHECK, Date.now().toString());

    return true;

  } catch (error) {
    console.error('❌ Error checking for new schedules:', error);
    return false;
  }
};

/**
 * ✅ NEW: Send immediate schedule notification when admin creates a schedule
 * This is called directly from AddScheduleScreen when a schedule is posted
 */
const sendScheduleNotificationImmediate = async (scheduleData) => {
  try {
    console.log('📅 Sending immediate schedule notification...');
    console.log('   Location:', scheduleData.title, scheduleData.purok);

    const title = '📅 New Food Distribution Schedule';
    const body = `${scheduleData.title}, ${scheduleData.purok}\n📍 ${scheduleData.location}\n📆 ${scheduleData.date} at ${scheduleData.time}`;
    
    const notificationData = {
      type: 'food_schedule',
      barangay: scheduleData.title,
      purok: scheduleData.purok,
      location: scheduleData.location,
      date: scheduleData.date,
      time: scheduleData.time,
      scheduleId: scheduleData.id,
    };

    // 1️⃣ Send LOCAL notification
    await sendLocalNotification({
      title,
      body,
      data: notificationData,
      channelId: 'schedules',
    });

    // 2️⃣ Send REMOTE push notifications to ALL users in this location
    const tokens = await getPushTokensForLocation(scheduleData.title, scheduleData.purok);
    console.log(`   📤 Sending to ${tokens.length} users in ${scheduleData.title}, ${scheduleData.purok}...`);
    
    if (tokens.length > 0) {
      await sendBatchPushNotifications(
        tokens,
        title,
        body,
        notificationData,
        'schedules'
      );
      console.log(`   ✅ Remote push sent to ${tokens.length} devices`);
    } else {
      console.log('   ⚠️ No push tokens found for this location');
    }

    // 3️⃣ Save to notification history for all users in this location
    const usersInLocation = await getUsersInLocation(scheduleData.title, scheduleData.purok);
    console.log(`   💾 Saving to history for ${usersInLocation.length} users...`);
    
    for (const user of usersInLocation) {
      await saveNotificationToHistory(user, {
        title,
        body,
        data: notificationData,
      });
    }

    console.log('   ✅ Schedule notification sent successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error sending immediate schedule notification:', error);
    return false;
  }
};

/**
 * Background task that monitors for new schedules
 */
TaskManager.defineTask(SCHEDULE_MONITOR_TASK, async () => {
  try {
    console.log('📅 Background schedule check started...');
    console.log('   Time:', new Date().toISOString());

    const userData = await getUserData();
    if (!userData) {
      console.log('⚠️ No user data found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const { username } = userData;

    // Check for new schedules
    const result = await checkForNewSchedules(username, false);

    if (result) {
      console.log('✅ Found new schedules, sent notifications');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    console.log('✅ No new schedules');
    return BackgroundFetch.BackgroundFetchResult.NoData;

  } catch (error) {
    console.error('❌ Background schedule check failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Start schedule monitoring
 */
const startScheduleMonitoring = async (username) => {
  try {
    await AsyncStorage.setItem('username', username);

    const isRegistered = await TaskManager.isTaskRegisteredAsync(SCHEDULE_MONITOR_TASK);

    if (isRegistered) {
      console.log('✅ Schedule monitoring already active');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(SCHEDULE_MONITOR_TASK, {
      minimumInterval: CHECK_INTERVAL_MINUTES * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('✅ Schedule monitoring started');
    console.log(`   ⏱️  Check interval: ${CHECK_INTERVAL_MINUTES} minutes`);
    console.log(`   👤 User: ${username}`);

    return true;
  } catch (error) {
    console.error('❌ Failed to start schedule monitoring:', error);
    return false;
  }
};

/**
 * Stop schedule monitoring
 */
const stopScheduleMonitoring = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(SCHEDULE_MONITOR_TASK);
    console.log('✅ Schedule monitoring stopped');
    return true;
  } catch (error) {
    console.error('❌ Failed to stop schedule monitoring:', error);
    return false;
  }
};

/**
 * Check if monitoring is active
 */
const isScheduleMonitoringActive = async () => {
  try {
    return await TaskManager.isTaskRegisteredAsync(SCHEDULE_MONITOR_TASK);
  } catch (error) {
    return false;
  }
};

/**
 * Clear all schedule notification history (for testing)
 */
const clearScheduleNotificationHistory = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFIED_SCHEDULES_KEY);
    await AsyncStorage.removeItem(LAST_SCHEDULE_CHECK);
    console.log('✅ Schedule notification history cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear schedule history:', error);
    return false;
  }
};

/**
 * Get monitoring status
 */
const getScheduleMonitoringStatus = async (username) => {
  try {
    const lastCheck = await getLastCheckTime();
    const notifiedCount = (await getNotifiedSchedules()).length;
    const userLocation = username ? await getUserLocation(username) : null;
    const isActive = await isScheduleMonitoringActive();

    return {
      isActive,
      lastCheck: new Date(lastCheck),
      notifiedSchedulesCount: notifiedCount,
      userLocation,
      checkInterval: CHECK_INTERVAL_MINUTES,
    };
  } catch (error) {
    console.error('Error getting schedule monitoring status:', error);
    return null;
  }
};

// ✅ UPDATED DEFAULT EXPORT - Added sendScheduleNotificationImmediate
export default {
  checkForNewSchedules,
  startScheduleMonitoring,
  stopScheduleMonitoring,
  isScheduleMonitoringActive,
  clearScheduleNotificationHistory,
  getScheduleMonitoringStatus,
  sendScheduleNotificationImmediate, // ✅ NEW: For immediate notifications when admin posts
};