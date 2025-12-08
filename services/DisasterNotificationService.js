// services/DisasterNotificationService.js
// Server-side disaster monitoring service (Supabase Edge Function)
import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ==================== CONFIGURATION ====================

const DISASTER_MONITOR_URL = `${supabase.supabaseUrl}/functions/v1/disaster-monitor`;
const SUPABASE_ANON_KEY = supabase.supabaseKey;

// ==================== MONITORING STATUS ====================

/**
 * Check if server-side disaster monitoring is active
 * (This just checks if the function is deployed and accessible)
 */
export const checkMonitoringStatus = async () => {
  try {
    const response = await fetch(DISASTER_MONITOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ test: true }),
    });

    const result = await response.json();
    
    return {
      active: response.ok,
      message: result.message || 'Server monitoring active',
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error checking monitoring status:', error);
    return {
      active: false,
      message: 'Unable to connect to monitoring service',
      error: error.message,
    };
  }
};

/**
 * Manually trigger a disaster check (for testing)
 */
export const triggerManualDisasterCheck = async () => {
  try {
    console.log('🔍 Triggering manual disaster check...');
    
    const response = await fetch(DISASTER_MONITOR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const result = await response.json();
    
    console.log('✅ Manual check complete:', result);
    
    return {
      success: result.success,
      earthquakeNotifications: result.earthquakeNotifications || 0,
      weatherNotifications: result.weatherNotifications || 0,
      totalNotifications: result.totalNotifications || 0,
      usersMonitored: result.usersMonitored || 0,
      message: result.message,
    };
  } catch (error) {
    console.error('❌ Manual check failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ==================== NOTIFICATION HISTORY ====================

/**
 * Fetch disaster notification history from Firebase
 */
export const getDisasterNotificationHistory = async (username, daysBack = 7) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    // Get both personal and public disaster notifications
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const q = query(
      notificationsRef,
      where('type', 'in', ['earthquake', 'weather', 'typhoon']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    
    const notifications = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
      }))
      .filter(notif => 
        notif.username === username || notif.username === 'all'
      );

    console.log(`✅ Fetched ${notifications.length} disaster notifications`);
    return notifications;
  } catch (error) {
    console.error('❌ Error fetching disaster history:', error);
    return [];
  }
};

/**
 * Get earthquake history
 */
export const getEarthquakeHistory = async (daysBack = 7) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    const q = query(
      notificationsRef,
      where('type', '==', 'earthquake'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
  } catch (error) {
    console.error('❌ Error fetching earthquake history:', error);
    return [];
  }
};

/**
 * Get weather/typhoon alert history
 */
export const getWeatherAlertHistory = async (daysBack = 7) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    
    const q = query(
      notificationsRef,
      where('type', 'in', ['weather', 'typhoon']),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
  } catch (error) {
    console.error('❌ Error fetching weather history:', error);
    return [];
  }
};

// ==================== DISASTER EVENT LOGS ====================

/**
 * Get processed disaster events (to see what the server has detected)
 */
export const getProcessedDisasterEvents = async (type = null, daysBack = 7) => {
  try {
    const eventsRef = collection(db, 'disasterEvents');
    
    let q;
    if (type) {
      q = query(
        eventsRef,
        where('type', '==', type),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    } else {
      q = query(
        eventsRef,
        orderBy('timestamp', 'desc'),
        limit(50)
      );
    }

    const snapshot = await getDocs(q);
    
    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        eventId: data.eventId,
        data: JSON.parse(data.data || '{}'),
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
      };
    });

    console.log(`✅ Found ${events.length} processed disaster events`);
    return events;
  } catch (error) {
    console.error('❌ Error fetching disaster events:', error);
    return [];
  }
};

// ==================== LOCAL NOTIFICATION HANDLERS ====================

/**
 * Setup notification handlers for disaster alerts
 */
export const setupDisasterNotificationHandlers = () => {
  // Handle notification received while app is in foreground
  Notifications.addNotificationReceivedListener(notification => {
    const data = notification.request.content.data;
    
    if (data.type === 'earthquake' || data.type === 'weather' || data.type === 'typhoon') {
      console.log('📱 Disaster notification received:', data.type);
      
      // You can show in-app alert or update UI here
      // Example: Show a banner, update a badge, etc.
    }
  });

  // Handle notification tap
  Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    if (data.type === 'earthquake') {
      console.log('🌍 User tapped earthquake notification');
      // Navigate to earthquake details screen
      // navigation.navigate('EarthquakeDetails', { quakeId: data.quakeId });
    } else if (data.type === 'weather' || data.type === 'typhoon') {
      console.log('🌦️  User tapped weather notification');
      // Navigate to weather alerts screen
      // navigation.navigate('WeatherAlerts');
    }
  });
};

/**
 * Configure notification channels for disasters (Android)
 */
export const setupDisasterNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  try {
    // Earthquake channels
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

    // Weather channels
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

    console.log('✅ Disaster notification channels created');
  } catch (error) {
    console.error('❌ Error creating channels:', error);
  }
};

// ==================== STATISTICS & ANALYTICS ====================

/**
 * Get disaster notification statistics
 */
export const getDisasterStatistics = async (daysBack = 30) => {
  try {
    const eventsRef = collection(db, 'disasterEvents');
    const snapshot = await getDocs(eventsRef);

    const stats = {
      totalEvents: 0,
      earthquakes: 0,
      weatherAlerts: 0,
      typhoons: 0,
      byMagnitude: {
        minor: 0,    // < 4.0
        light: 0,    // 4.0 - 4.9
        moderate: 0, // 5.0 - 5.9
        strong: 0,   // 6.0 - 6.9
        major: 0,    // 7.0+
      },
      byWeatherType: {},
    };

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      stats.totalEvents++;

      if (data.type === 'earthquake') {
        stats.earthquakes++;
        
        try {
          const eventData = JSON.parse(data.data);
          const mag = eventData.magnitude;
          
          if (mag >= 7.0) stats.byMagnitude.major++;
          else if (mag >= 6.0) stats.byMagnitude.strong++;
          else if (mag >= 5.0) stats.byMagnitude.moderate++;
          else if (mag >= 4.0) stats.byMagnitude.light++;
          else stats.byMagnitude.minor++;
        } catch (e) {
          // Skip if can't parse
        }
      } else if (data.type === 'weather') {
        stats.weatherAlerts++;
        
        try {
          const eventData = JSON.parse(data.data);
          const risk = eventData.risk || 'unknown';
          stats.byWeatherType[risk] = (stats.byWeatherType[risk] || 0) + 1;
        } catch (e) {
          // Skip if can't parse
        }
      }
    });

    return stats;
  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    return null;
  }
};

/**
 * Get recent disaster activity summary
 */
export const getRecentDisasterSummary = async () => {
  try {
    const earthquakes = await getEarthquakeHistory(7);
    const weatherAlerts = await getWeatherAlertHistory(7);

    return {
      earthquakes: {
        count: earthquakes.length,
        latest: earthquakes[0] || null,
        maxMagnitude: earthquakes.length > 0 
          ? Math.max(...earthquakes.map(eq => eq.data?.magnitude || 0))
          : 0,
      },
      weatherAlerts: {
        count: weatherAlerts.length,
        latest: weatherAlerts[0] || null,
        types: [...new Set(weatherAlerts.map(w => w.data?.alertType))],
      },
      totalAlerts: earthquakes.length + weatherAlerts.length,
    };
  } catch (error) {
    console.error('❌ Error fetching summary:', error);
    return null;
  }
};

// ==================== TESTING & DEBUG ====================

/**
 * Test push notification to current device
 */
export const testDisasterNotification = async (type = 'earthquake') => {
  try {
    console.log(`🧪 Sending test ${type} notification...`);

    const testNotifications = {
      earthquake: {
        title: '🚨 TEST: Earthquake Alert - Magnitude 5.2',
        body: 'This is a test earthquake notification. Real alerts will include location and safety instructions.',
        data: { type: 'earthquake', magnitude: 5.2, location: 'Test Location', test: true },
        channelId: 'earthquake',
      },
      weather: {
        title: '🌧️ TEST: Weather Alert',
        body: 'This is a test weather notification. Real alerts will include specific weather conditions.',
        data: { type: 'weather', alertType: 'storm', test: true },
        channelId: 'weather',
      },
      typhoon: {
        title: '🌀 TEST: Typhoon Alert',
        body: 'This is a test typhoon notification. Real alerts will include wind speed and safety instructions.',
        data: { type: 'typhoon', risk: 'typhoon', level: 4, test: true },
        channelId: 'weather_critical',
      },
    };

    const notification = testNotifications[type] || testNotifications.earthquake;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: true,
      },
      trigger: null, // Immediate
    });

    console.log('✅ Test notification sent');
    return true;
  } catch (error) {
    console.error('❌ Failed to send test notification:', error);
    return false;
  }
};

/**
 * Clear all disaster notification history (for testing)
 */
export const clearDisasterHistory = async () => {
  try {
    const eventsRef = collection(db, 'disasterEvents');
    const snapshot = await getDocs(eventsRef);

    console.log(`🗑️  Clearing ${snapshot.size} disaster events...`);

    const deletePromises = snapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    await Promise.all(deletePromises);

    console.log('✅ Disaster history cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing history:', error);
    return false;
  }
};

// ==================== EXPORT SUMMARY ====================

// // Named exports only - this is the correct way
// export {
//   // Status
//   // checkMonitoringStatus,
//   triggerManualDisasterCheck,
  
//   // History
//   getDisasterNotificationHistory,
//   getEarthquakeHistory,
//   getWeatherAlertHistory,
//   getProcessedDisasterEvents,
  
//   // Setup
//   setupDisasterNotificationHandlers,
//   setupDisasterNotificationChannels,
  
//   // Analytics
//   getDisasterStatistics,
//   getRecentDisasterSummary,
  
//   // Testing
//   testDisasterNotification,
//   clearDisasterHistory,
// };