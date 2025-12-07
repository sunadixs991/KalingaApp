// services/DisasterMonitorService.js - WITH REMOTE PUSH NOTIFICATIONS
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fetchNearbyEarthquakes } from './EarthquakeService';
import { fetchWeatherData } from './WeatherService';
import { checkPhilippinesWeatherAlerts } from './PAGASAWeatherService';
import { 
  sendLocalNotification, 
  saveNotificationToHistory,
  getAllPushTokens,
  sendBatchPushNotifications 
} from './NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISASTER_MONITOR_TASK = 'DISASTER_MONITOR_TASK';
const LAST_EARTHQUAKE_CHECK = 'last_earthquake_check';
const LAST_WEATHER_CHECK = 'last_weather_check';
const LAST_TYPHOON_CHECK = 'last_typhoon_check';
const NOTIFIED_QUAKES_KEY = 'notified_earthquakes';
const NOTIFIED_WEATHER_KEY = 'notified_weather_alerts';
const NOTIFIED_TYPHOON_KEY = 'notified_typhoon_alerts';

// Configuration
const EARTHQUAKE_MIN_MAGNITUDE = 3.0;
const EARTHQUAKE_RADIUS_KM = 500;
const CHECK_INTERVAL_MINUTES = 15;

// Weather alert cooldown (prevent spam)
const WEATHER_ALERT_COOLDOWN_HOURS = 3;
console.log('🔧 DisasterMonitorService loaded');
/**
 * Get user data from AsyncStorage
 */
async function getUserData() {
  try {
    const locationStr = await AsyncStorage.getItem('user_location');
    const username = await AsyncStorage.getItem('username');

    if (!locationStr || !username) {
      return null;
    }

    const { latitude, longitude } = JSON.parse(locationStr);
    return { latitude, longitude, username };
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

/**
 * Get list of already notified items
 */
async function getNotifiedList(key) {
  try {
    const str = await AsyncStorage.getItem(key);
    const list = str ? JSON.parse(str) : [];

    if (list.length > 100) {
      return list.slice(-100);
    }
    return list;
  } catch (error) {
    return [];
  }
}

/**
 * Get last check timestamp
 */
async function getLastCheckTime(key) {
  try {
    const str = await AsyncStorage.getItem(key);
    return str ? parseInt(str) : Date.now() - 24 * 60 * 60 * 1000;
  } catch (error) {
    return Date.now() - 24 * 60 * 60 * 1000;
  }
}

/**
 * Get last alert time for a specific weather condition
 */
async function getLastAlertTime(alertType) {
  try {
    const key = `last_alert_${alertType}`;
    const str = await AsyncStorage.getItem(key);
    return str ? parseInt(str) : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Set last alert time for a specific weather condition
 */
async function setLastAlertTime(alertType) {
  try {
    const key = `last_alert_${alertType}`;
    await AsyncStorage.setItem(key, Date.now().toString());
  } catch (error) {
    console.error('Error setting last alert time:', error);
  }
}

/**
 * Get earthquake severity message
 */
function getEarthquakeSeverity(magnitude) {
  if (magnitude >= 7.0) return 'MAJOR EARTHQUAKE - Seek immediate shelter!';
  if (magnitude >= 6.0) return 'Strong earthquake - Stay alert!';
  if (magnitude >= 5.0) return 'Moderate earthquake - Take precautions.';
  if (magnitude >= 4.0) return 'Light earthquake detected.';
  return 'Minor earthquake detected.';
}

/**
 * ✅ UPDATED: Check for new earthquakes with REMOTE push notifications
 */
async function checkEarthquakes(latitude, longitude, username) {
  try {
    console.log('🌍 Checking earthquakes...');

    const earthquakes = await fetchNearbyEarthquakes(
      latitude,
      longitude,
      EARTHQUAKE_RADIUS_KM,
      EARTHQUAKE_MIN_MAGNITUDE,
      50,
      1
    );

    if (earthquakes.length === 0) {
      console.log('   No earthquakes found');
      return false;
    }

    const notifiedQuakes = await getNotifiedList(NOTIFIED_QUAKES_KEY);
    const lastCheck = await getLastCheckTime(LAST_EARTHQUAKE_CHECK);

    const newQuakes = earthquakes.filter(quake =>
      quake.time.getTime() > lastCheck &&
      !notifiedQuakes.includes(quake.id)
    );

    if (newQuakes.length === 0) {
      console.log('   No new earthquakes');
      return false;
    }

    console.log(`   📢 Found ${newQuakes.length} new earthquakes!`);

    for (const quake of newQuakes) {
      const severity = getEarthquakeSeverity(quake.magnitude);
      const title = `🚨 Earthquake Alert - Magnitude ${quake.magnitude.toFixed(1)}`;
      const body = `${quake.place} - ${quake.distanceKm.toFixed(0)}km away. ${severity}`;
      const notificationData = {
        type: 'earthquake',
        magnitude: quake.magnitude,
        location: quake.place,
        quakeId: quake.id,
        latitude: quake.latitude,
        longitude: quake.longitude,
      };

      // 1️⃣ Send LOCAL notification
      await sendLocalNotification({
        title,
        body,
        data: notificationData,
        channelId: 'earthquake',
      });

      // 2️⃣ Send REMOTE push notifications to ALL users
      const tokens = await getAllPushTokens();
      console.log(`   🌍 Sending earthquake alert to ${tokens.length} users...`);
      
      if (tokens.length > 0) {
        await sendBatchPushNotifications(
          tokens,
          title,
          body,
          notificationData,
          'earthquake'
        );
        console.log(`   ✅ Remote push sent to ${tokens.length} devices`);
      }

      // 3️⃣ Save to notification history
      await saveNotificationToHistory('all', {
        title,
        body,
        data: notificationData
      });

      notifiedQuakes.push(quake.id);
    }

    await AsyncStorage.setItem(LAST_EARTHQUAKE_CHECK, Date.now().toString());
    await AsyncStorage.setItem(NOTIFIED_QUAKES_KEY, JSON.stringify(notifiedQuakes));

    return true;

  } catch (error) {
    console.error('❌ Earthquake check failed:', error);
    return false;
  }
}

/**
 * ✅ UPDATED: Check for weather alerts with REMOTE push notifications
 */
async function checkWeatherAlerts(latitude, longitude, username) {
  try {
    console.log('🌦️  Checking weather alerts...');

    const weather = await fetchWeatherData(latitude, longitude);

    if (!weather) {
      console.log('   No weather data');
      return false;
    }

    const alerts = [];
    const now = Date.now();
    const cooldownMs = WEATHER_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000;

    // High wind alert
    if (weather.windSpeed > 17) {
      const lastAlert = await getLastAlertTime('high_wind');
      if (now - lastAlert > cooldownMs) {
        alerts.push({
          type: 'high_wind',
          title: '🌪️ High Wind Alert',
          body: `Strong winds detected: ${weather.windSpeed.toFixed(1)} m/s (${(weather.windSpeed * 3.6).toFixed(0)} km/h). Stay indoors and secure loose objects.`,
        });
      } else {
        console.log('   ⏱️  High wind alert on cooldown');
      }
    }

    // Heavy rain alert
    if (weather.description.toLowerCase().includes('rain') &&
      (weather.description.toLowerCase().includes('heavy') ||
        weather.description.toLowerCase().includes('extreme'))) {
      const lastAlert = await getLastAlertTime('heavy_rain');
      if (now - lastAlert > cooldownMs) {
        alerts.push({
          type: 'heavy_rain',
          title: '🌧️ Heavy Rain Alert',
          body: `Heavy rainfall detected in your area (${weather.description}). Avoid flood-prone areas.`,
        });
      } else {
        console.log('   ⏱️  Heavy rain alert on cooldown');
      }
    }

    // Extreme heat alert
    if (weather.temperature > 35) {
      const lastAlert = await getLastAlertTime('extreme_heat');
      if (now - lastAlert > cooldownMs) {
        alerts.push({
          type: 'extreme_heat',
          title: '🌡️ Extreme Heat Warning',
          body: `Temperature: ${weather.temperature}°C. Stay hydrated and avoid prolonged sun exposure.`,
        });
      } else {
        console.log('   ⏱️  Extreme heat alert on cooldown');
      }
    }

    // Storm alert
    if (weather.main.toLowerCase().includes('storm') ||
      weather.main.toLowerCase().includes('thunderstorm')) {
      const lastAlert = await getLastAlertTime('storm');
      if (now - lastAlert > cooldownMs) {
        alerts.push({
          type: 'storm',
          title: '⛈️ Storm Warning',
          body: `${weather.description}. Seek shelter immediately.`,
        });
      } else {
        console.log('   ⏱️  Storm alert on cooldown');
      }
    }

    if (alerts.length === 0) {
      console.log('   No new weather alerts or all on cooldown');
      return false;
    }

    console.log(`   📢 Found ${alerts.length} new weather alerts!`);

    for (const alert of alerts) {
      const notificationData = {
        type: 'weather',
        alertType: alert.type,
      };

      // 1️⃣ Send LOCAL notification
      await sendLocalNotification({
        title: alert.title,
        body: alert.body,
        data: notificationData,
        channelId: 'weather',
      });

      // 2️⃣ Send REMOTE push notifications to ALL users
      const tokens = await getAllPushTokens();
      console.log(`   ⛈️ Sending weather alert to ${tokens.length} users...`);
      
      if (tokens.length > 0) {
        await sendBatchPushNotifications(
          tokens,
          alert.title,
          alert.body,
          notificationData,
          'weather'
        );
        console.log(`   ✅ Remote push sent to ${tokens.length} devices`);
      }

      // 3️⃣ Save to notification history
      await saveNotificationToHistory('all', {
        title: alert.title,
        body: alert.body,
        data: notificationData
      });

      // Set cooldown timer
      await setLastAlertTime(alert.type);
    }

    await AsyncStorage.setItem(LAST_WEATHER_CHECK, Date.now().toString());

    return true;

  } catch (error) {
    console.error('❌ Weather check failed:', error);
    return false;
  }
}

/**
 * ✅ UPDATED: Check for typhoon alerts with REMOTE push notifications
 */
async function checkTyphoonAlerts(latitude, longitude, username) {
  try {
    console.log('🌀 Checking typhoon alerts (PAGASA)...');

    const weather = await fetchWeatherData(latitude, longitude);

    if (!weather) {
      console.log('   No weather data for typhoon check');
      return false;
    }

    const typhoonAlerts = await checkPhilippinesWeatherAlerts(weather);

    if (typhoonAlerts.length === 0) {
      console.log('   No typhoon alerts');
      return false;
    }

    const now = Date.now();
    const cooldownMs = WEATHER_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000;
    const newAlerts = [];

    for (const alert of typhoonAlerts) {
      const alertKey = `typhoon_${alert.risk || 'general'}`;
      const lastAlert = await getLastAlertTime(alertKey);

      if (now - lastAlert > cooldownMs) {
        newAlerts.push(alert);
      } else {
        console.log(`   ⏱️  Typhoon alert ${alert.risk} on cooldown`);
      }
    }

    if (newAlerts.length === 0) {
      console.log('   No new typhoon alerts (all on cooldown)');
      return false;
    }

    console.log(`   📢 Found ${newAlerts.length} new typhoon alerts!`);

    for (const alert of newAlerts) {
      const priority = alert.severity === 'severe' || alert.level >= 4 ? 'high' : 'default';
      const notificationBody = alert.details || alert.description || alert.body || 'Check weather advisory';

      const notificationData = {
        type: 'typhoon',
        source: alert.source,
        severity: alert.severity,
      };

      if (alert.level !== undefined) notificationData.level = alert.level;
      if (alert.risk) notificationData.risk = alert.risk;
      if (alert.url) notificationData.url = alert.url;

      // 1️⃣ Send LOCAL notification
      await sendLocalNotification({
        title: alert.title,
        body: notificationBody,
        data: notificationData,
        channelId: 'weather',
        priority,
      });

      // 2️⃣ Send REMOTE push notifications to ALL users
      const tokens = await getAllPushTokens();
      console.log(`   🌀 Sending typhoon alert to ${tokens.length} users...`);
      
      if (tokens.length > 0) {
        await sendBatchPushNotifications(
          tokens,
          alert.title,
          notificationBody,
          notificationData,
          'weather'
        );
        console.log(`   ✅ Remote push sent to ${tokens.length} devices`);
      }

      // 3️⃣ Save to notification history
      await saveNotificationToHistory('all', {
        title: alert.title,
        body: notificationBody,
        data: notificationData
      });

      // Set cooldown timer
      const alertKey = `typhoon_${alert.risk || 'general'}`;
      await setLastAlertTime(alertKey);
    }

    await AsyncStorage.setItem(LAST_TYPHOON_CHECK, Date.now().toString());

    return true;

  } catch (error) {
    console.error('❌ Typhoon check failed:', error);
    return false;
  }
}

/**
 * Background task that monitors earthquakes, weather, and typhoons
 */
TaskManager.defineTask(DISASTER_MONITOR_TASK, async () => {
  try {
    console.log('🔍 Background disaster check started...');
    console.log('   Time:', new Date().toISOString());

    const userData = await getUserData();
    if (!userData) {
      console.log('⚠️ No user data found');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const { latitude, longitude, username } = userData;

    // Run all three checks in parallel
    const [earthquakeResult, weatherResult, typhoonResult] = await Promise.all([
      checkEarthquakes(latitude, longitude, username),
      checkWeatherAlerts(latitude, longitude, username),
      checkTyphoonAlerts(latitude, longitude, username),
    ]);

    if (earthquakeResult || weatherResult || typhoonResult) {
      console.log('✅ Found new alerts, sent notifications');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    console.log('✅ No new alerts');
    return BackgroundFetch.BackgroundFetchResult.NoData;

  } catch (error) {
    console.error('❌ Background check failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Start disaster monitoring
 */
export const startDisasterMonitoring = async (latitude, longitude, username) => {
  try {
    await AsyncStorage.setItem('user_location', JSON.stringify({ latitude, longitude }));
    await AsyncStorage.setItem('username', username);

    const isRegistered = await TaskManager.isTaskRegisteredAsync(DISASTER_MONITOR_TASK);

    if (isRegistered) {
      console.log('✅ Disaster monitoring already active');
      return true;
    }

    await BackgroundFetch.registerTaskAsync(DISASTER_MONITOR_TASK, {
      minimumInterval: CHECK_INTERVAL_MINUTES * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });

    console.log('✅ Disaster monitoring started');
    console.log(`   ⏱️  Minimum check interval: ${CHECK_INTERVAL_MINUTES} minutes`);
    console.log(`   📍 Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    console.log(`   👤 User: ${username}`);
    console.log('   🌀 PAGASA typhoon monitoring enabled');
    console.log('   ⏱️  Weather alerts have 3-hour cooldown');
    console.log('   📡 Remote push notifications enabled');

    return true;
  } catch (error) {
    console.error('❌ Failed to start disaster monitoring:', error);
    return false;
  }
};

/**
 * Stop disaster monitoring
 */
export const stopDisasterMonitoring = async () => {
  try {
    await BackgroundFetch.unregisterTaskAsync(DISASTER_MONITOR_TASK);
    console.log('✅ Disaster monitoring stopped');
    return true;
  } catch (error) {
    console.error('❌ Failed to stop disaster monitoring:', error);
    return false;
  }
};

/**
 * Check if monitoring is active
 */
export const isMonitoringActive = async () => {
  try {
    return await TaskManager.isTaskRegisteredAsync(DISASTER_MONITOR_TASK);
  } catch (error) {
    return false;
  }
};

/**
 * Get monitoring status
 */
export const getMonitoringStatus = async () => {
  try {
    const isActive = await isMonitoringActive();
    const status = await BackgroundFetch.getStatusAsync();
    const userData = await getUserData();

    return {
      isActive,
      status: getStatusMessage(status),
      userData,
      checkInterval: CHECK_INTERVAL_MINUTES,
    };
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    return {
      isActive: false,
      status: 'Unknown',
      userData: null,
      checkInterval: CHECK_INTERVAL_MINUTES,
    };
  }
};

function getStatusMessage(status) {
  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'Available';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'Denied';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'Restricted';
    default:
      return 'Unknown';
  }
}

/**
 * Manually trigger a check (for testing)
 */
export const triggerManualCheck = async () => {
  try {
    console.log('🔍 Manual check triggered...');
    console.log('   Time:', new Date().toISOString());

    const userData = await getUserData();
    if (!userData) {
      console.log('⚠️ No user data found');
      return false;
    }

    const { latitude, longitude, username } = userData;

    // Run all three checks
    const [earthquakeResult, weatherResult, typhoonResult] = await Promise.all([
      checkEarthquakes(latitude, longitude, username),
      checkWeatherAlerts(latitude, longitude, username),
      checkTyphoonAlerts(latitude, longitude, username),
    ]);

    const foundAlerts = earthquakeResult || weatherResult || typhoonResult;

    if (foundAlerts) {
      console.log('✅ Manual check complete - found new alerts');
    } else {
      console.log('✅ Manual check complete - no new alerts');
    }

    return foundAlerts;
  } catch (error) {
    console.error('❌ Manual check failed:', error);
    return false;
  }
};

/**
 * Clear all alert cooldowns (for testing)
 */
export const clearAlertCooldowns = async () => {
  try {
    const alertTypes = ['high_wind', 'heavy_rain', 'extreme_heat', 'storm',
      'typhoon_general', 'typhoon_tropical_depression',
      'typhoon_tropical_storm', 'typhoon_severe_tropical_storm',
      'typhoon_typhoon', 'typhoon_super_typhoon', 'typhoon_undefined'];

    for (const type of alertTypes) {
      const key = `last_alert_${type}`;
      await AsyncStorage.removeItem(key);
    }

    console.log('✅ All alert cooldowns cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear cooldowns:', error);
    return false;
  }
};

/**
 * Clear all notification history (for testing)
 */
export const clearNotificationHistory = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFIED_QUAKES_KEY);
    await AsyncStorage.removeItem(NOTIFIED_WEATHER_KEY);
    await AsyncStorage.removeItem(NOTIFIED_TYPHOON_KEY);
    await AsyncStorage.removeItem(LAST_EARTHQUAKE_CHECK);
    await AsyncStorage.removeItem(LAST_WEATHER_CHECK);
    await AsyncStorage.removeItem(LAST_TYPHOON_CHECK);

    console.log('✅ All notification history cleared');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear notification history:', error);
    return false;
  }
};

/**
 * Complete reset for testing (clears everything)
 */
export const resetDisasterMonitoring = async () => {
  try {
    await clearAlertCooldowns();
    await clearNotificationHistory();
    console.log('✅ Disaster monitoring completely reset');
    return true;
  } catch (error) {
    console.error('❌ Failed to reset disaster monitoring:', error);
    return false;
  }
};