// HomeScreen.js
import React, { useEffect, useState, useRef } from "react";
import { Modal } from "react-native";
import {
  View,
  Text,
  TextInput,
  Image,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import Swiper from "react-native-swiper";
import { useTheme } from "../context/ThemeContext";
import Icon from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import {
  fetchNearbyEarthquakes,
  getMagnitudeColor,
  getMagnitudeLabel
} from "../services/EarthquakeService";
// Import functions individually to test
import { fetchNearbyPins } from "../services/PinService";
import { fetchWeatherData, getWeatherIcon } from "../services/WeatherService";
import boyProfile from "../assets/boy.png";
import womanProfile from "../assets/woman.png";
import userProfile from "../assets/user.png";
import adminProfile from "../assets/admin.png";
import Toast from 'react-native-toast-message';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getNotificationHistory,
  getBadgeCount,
  sendLocalNotification,
} from '../services/NotificationService';
import { startDisasterMonitoring, resetDisasterMonitoring } from '../services/DisasterMonitorService';
import { triggerManualCheck } from '../services/DisasterMonitorService';
import { checkPhilippinesWeatherAlerts } from '../services/PAGASAWeatherService';
// At the top of your HomeScreen.js file
import { triggerManualDisasterCheck, testDisasterNotification } from '../services/DisasterNotificationService';
import ScheduleMonitorService from '../services/ScheduleMonitorService';
// At the top of your HomeScreen.js file


// Cache key prefix (bump version if cache format changes)
const NEARBY_CACHE_PREFIX = "nearby_pins_cache_v1";
const WEATHER_CACHE_KEY = "weather_cache_v1";



const makeNearbyCacheKey = (coords, radiusKm = 50, max = 10) =>
  coords
    ? `${NEARBY_CACHE_PREFIX}_${coords.latitude.toFixed(4)}_${coords.longitude
      .toFixed(4)
      .replace(".", "")}_${radiusKm}_${max}`
    : NEARBY_CACHE_PREFIX;

const saveNearbyPinsToCache = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    console.warn("saveNearbyPinsToCache failed:", e);
  }
};

const loadNearbyPinsFromCache = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch (e) {
    console.warn("loadNearbyPinsFromCache failed:", e);
    return null;
  }
};

// Weather cache functions
const saveWeatherToCache = async (data) => {
  try {
    await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch (e) {
    console.warn("saveWeatherToCache failed:", e);
  }
};

const loadWeatherFromCache = async () => {
  try {
    const raw = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache weather for 30 minutes
    if (Date.now() - parsed.ts > 30 * 60 * 1000) return null;
    return parsed.data;
  } catch (e) {
    console.warn("loadWeatherFromCache failed:", e);
    return null;
  }
};

// Simple PinCard component defined inline to avoid import issues
const SimplePinCard = ({ pin, onPress }) => (
  <TouchableOpacity
    style={styles.cardNearby}
    onPress={() => onPress && onPress(pin)}
    activeOpacity={0.9}
  >
    {/* Category header */}
    <View style={styles.cardHeader}>
      <Text style={styles.cardCategory}>{pin.category}</Text>
      <Text style={styles.cardDistance}>{pin.formattedDistance}</Text>
    </View>

    {/* Description */}
    <Text style={styles.cardDescription}>{pin.description}</Text>

    {/* Footer */}
    <View style={styles.cardFooter}>
      <Text style={styles.cardUser}>📌 {pin.userFirstName}</Text>
      <View style={styles.voteRow}>
        <Icon name="arrow-up-sharp" size={18} color="#49A5A2" />
        <Text style={styles.voteText}>{pin.upvotes || 0}</Text>
        <Icon
          name="arrow-down-sharp"
          size={18}
          color="#e75e33"
          style={{ marginLeft: 12 }}
        />
        <Text style={styles.voteText}>{pin.downvotes || 0}</Text>
      </View>
    </View>
  </TouchableOpacity>
);


export default function HomeScreen({ route, navigation }) {
  const username = route?.params?.username;
  const [userInfo, setUserInfo] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [placeName, setPlaceName] = useState("");
  const [nearbyPins, setNearbyPins] = useState([]);
  const [loadingPins, setLoadingPins] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const { isDarkMode } = useTheme();
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  // Weather state
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  // Earthquake state  ← ADD THESE TWO LINES
  const [earthquakes, setEarthquakes] = useState([]);
  const [loadingEarthquakes, setLoadingEarthquakes] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const notificationListener = useRef();
  const responseListener = useRef();
  const [updateVersion, setUpdateVersion] = useState(5);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("username", "==", username)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setUserInfo(querySnapshot.docs[0].data());
        }
      } catch (error) {
        // console.error("Error fetching user info:", error);
      }
    };

    if (username) {
      fetchUserInfo();
    }
  }, [username]);

  // Fetch device location and place name
  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationMessage("📍 Enable location to see nearby resources");
          Alert.alert(
            "Location Permission",
            "Location permission is required to show nearby resources."
          );
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);
        if (username) {
          const { updateTokenWithLocation } = await import('../services/NotificationService');
          await updateTokenWithLocation(username, loc.coords.latitude, loc.coords.longitude);
          console.log('✅ Token updated with location');
        }
        // Reverse geocode to get place name
        let places = await Location.reverseGeocodeAsync(loc.coords);
        if (places && places.length > 0) {
          const place = places[0];
          setPlaceName(
            [
              place.street,
              place.district,
              place.city,
              place.subregion,
              place.country,
            ]
              .filter(Boolean)
              .join(", ")
          );
        }

      } catch (error) {
        setLocationMessage(
          "Location is turned off — please enable location services in Settings."
        );

        Toast.show({
          type: "warning",
          text1: "Location Unavailable",
          text2: "Please enable your device's location services and try again.",
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      fetchEarthquakes();
    }
  }, [currentLocation]);
  // Fetch weather when location is available
  useEffect(() => {
    if (currentLocation) {
      fetchWeather();
    }
  }, [currentLocation]);

  useEffect(() => {
    if (username) {
      initializeNotifications();
    }

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [username]);

  useEffect(() => {
    const startMonitoring = async () => {
      if (username) {
        console.log('📅 Starting schedule monitoring...');
        console.log('   Username:', username);

        try {
          const started = await ScheduleMonitorService.startScheduleMonitoring(username);

          if (started) {
            console.log('✅ Schedule monitoring initialized successfully');
          } else {
            console.log('❌ Failed to start schedule monitoring');
          }
        } catch (error) {
          console.error('❌ Error starting schedule monitoring:', error);
        }
      }
    };

    startMonitoring();
  }, [username]);


  useEffect(() => {
    const runScheduleCatchupCheck = async () => {
      if (username) {
        console.log('📅 Running catch-up check for missed schedules...');

        try {
          // Wait a bit for everything to initialize
          await new Promise(resolve => setTimeout(resolve, 2500));

          console.log('📅 About to call checkForNewSchedules with username:', username);
          const result = await ScheduleMonitorService.checkForNewSchedules(username, true);
          console.log('📅 checkForNewSchedules returned:', result);

          if (result) {
            console.log('✅ Caught up - found schedules that were created while app was closed');
            Toast.show({
              type: 'info',
              text1: '📅 New Food Schedule',
              text2: 'Check notifications for distribution details',
              visibilityTime: 5000,
            });
          } else {
            console.log('✅ Caught up - no missed schedules');
          }
        } catch (error) {
          console.error('❌ Schedule catch-up check failed:', error);
        }
      } else {
        console.log('⚠️ No username available for schedule catch-up check');
      }
    };

    runScheduleCatchupCheck();
  }, [username]);
  const initializeNotifications = async () => {
    // Register for push notifications
    const token = await registerForPushNotifications(username);
    if (token) {
      console.log('Push notification token registered:', token);
    }
    // In HomeScreen.js initializeNotifications
    // if (currentLocation && username) {
    //   const started = await startDisasterMonitoring(
    //     currentLocation.latitude,
    //     currentLocation.longitude,
    //     username
    //   );
    //   if (started) {
    //     console.log('✅ Disaster monitoring active');
    //   } else {
    //     console.log('❌ Failed to start monitoring'); // Add user feedback
    //   }
    // }
    // Load unread notification count
    loadNotificationCount();

    // Listen for notifications while app is in foreground
    notificationListener.current = addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      loadNotificationCount();
    });
    // Listen for when user taps on notification
    responseListener.current = addNotificationResponseListener(response => {
      console.log('Notification tapped:', response);
      const notificationData = response.notification.request.content.data;

      if (notificationData.type === 'earthquake') {
        navigation.navigate('Earthquake');
      } else if (notificationData.type === 'incident') {
        navigation.navigate('IncidentsList');
      } else if (notificationData.type === 'weather') {
        navigation.navigate('Home');
      }
    });
  };
  const loadNotificationCount = async () => {
    try {
      const notifications = await getNotificationHistory(username);
      const unreadCount = notifications.filter(n => !n.read).length;
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error loading notification count:', error);
    }
  };
  // Add this function in your HomeScreen component
  // Add this function in your HomeScreen component
  const handleTestAllNotifications = async () => {
    Alert.alert(
      'Test Notifications',
      'Choose what to test:',
      [
        {
          text: 'Test Local Only',
          onPress: async () => {
            // Test local notifications
            await testDisasterNotification('earthquake');
            await testDisasterNotification('weather');
            await testDisasterNotification('typhoon');
            Alert.alert('Success', 'Local test notifications sent!');
          }
        },
        {
          text: 'Test Server Check',
          onPress: async () => {
            // Trigger server disaster check
            try {
              const result = await triggerManualDisasterCheck();
              if (result.success) {
                Alert.alert(
                  'Server Check Complete',
                  `Earthquakes: ${result.earthquakeNotifications || 0}\n` +
                  `Weather: ${result.weatherNotifications || 0}\n` +
                  `Total notifications: ${result.totalNotifications || 0}\n` +
                  `Users monitored: ${result.usersMonitored || 0}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', result.error || 'Server check failed');
              }
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };
  const fetchWeather = async () => {
    if (!currentLocation) return;

    setLoadingWeather(true);
    try {
      // Try to load from cache first
      const cached = await loadWeatherFromCache();
      if (cached) {
        setWeatherData(cached);
      }

      // Check network
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        if (!cached) {
          Toast.show({
            type: "info",
            text1: "Offline",
            text2: "Weather data unavailable offline",
          });
        }
        return;
      }

      // Fetch fresh weather data
      const weather = await fetchWeatherData(
        currentLocation.latitude,
        currentLocation.longitude
      );
      setWeatherData(weather);
      await saveWeatherToCache(weather);



    } catch (error) {
      console.error("Error fetching weather:", error);
      Toast.show({
        type: "error",
        text1: "Weather Error",
        text2: "Could not load weather data",
      });
    } finally {
      setLoadingWeather(false);
    }
  };
  const fetchEarthquakes = async () => {
  if (!currentLocation) return;

  setLoadingEarthquakes(true);
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      Toast.show({
        type: "info",
        text1: "Offline",
        text2: "Earthquake data unavailable offline",
      });
      return;
    }

    // Match EarthquakeScreen's "nearby" filter for consistency
    const quakes = await fetchNearbyEarthquakes(
      currentLocation.latitude,
      currentLocation.longitude,
      500,   // ← CHANGED: 300 → 500 km (match EarthquakeScreen)
      2.0,   // ← CHANGED: 1.0 → 2.0 (filter noise, show significant only)
      100,   // limit - keep same
      30     // last 30 days - keep same
    );

    setEarthquakes(quakes);
  } catch (error) {
    console.error("Error fetching earthquakes:", error);
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Could not load earthquake data",
    });
  } finally {
    setLoadingEarthquakes(false);
  }
};
  // Fetch nearby pins when location is available
  useEffect(() => {
    if (currentLocation) {
      // load cached immediately for snappy UI, then attempt live fetch
      (async () => {
        const cacheKey = makeNearbyCacheKey(currentLocation, 50, 10);
        const cached = await loadNearbyPinsFromCache(cacheKey);
        if (cached && cached.length > 0) {
          setNearbyPins(cached);
        }
        await fetchNearbyPinsData();
      })();
    }
  }, [currentLocation]);

  const fetchNearbyPinsData = async () => {
    if (!currentLocation) return;

    setLoadingPins(true);
    const cacheKey = makeNearbyCacheKey(currentLocation, 50, 10);
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // offline -> load cache
        const cached = await loadNearbyPinsFromCache(cacheKey);
        if (cached) {
          setNearbyPins(cached);
        } else {
          // no cache available
          setNearbyPins([]);
          Alert.alert(
            "Offline",
            "You're offline and no cached nearby resources are available."
          );
        }
        return;
      }

      // online -> fetch live and update cache
      const pins = await fetchNearbyPins(currentLocation, 50, 10);
      setNearbyPins(pins);
      await saveNearbyPinsToCache(cacheKey, pins);
    } catch (error) {
      console.error("Error fetching nearby pins:", error);
      // fallback to cache on error
      const cached = await loadNearbyPinsFromCache(cacheKey);
      if (cached) {
        setNearbyPins(cached);
      } else {
        Alert.alert("Error", "Failed to load nearby resources. Please try again.");
      }
    } finally {
      setLoadingPins(false);
    }
  };

  // When network returns, refresh nearby pins (if location is set)
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && currentLocation) {
        fetchNearbyPinsData();
        fetchWeather();
      }
    });
    return () => unsub();
  }, [currentLocation]);
  // Add this new useEffect AFTER your existing location and username useEffects

  // Start disaster monitoring when BOTH username AND location are ready
  useEffect(() => {
    const startMonitoring = async () => {
      if (username && currentLocation) {
        console.log('📍 Starting disaster monitoring...');
        console.log('   Username:', username);
        console.log('   Location:', currentLocation.latitude, currentLocation.longitude);

        const started = await startDisasterMonitoring(
          currentLocation.latitude,
          currentLocation.longitude,
          username
        );

        if (started) {
          console.log('✅ Disaster monitoring initialized successfully');
          // Toast.show({
          //   type: 'success',
          //   text1: 'Monitoring Active',
          //   text2: 'You will be alerted about disasters in your area',
          //   visibilityTime: 3000,
          // });
        } else {
          // console.log('❌ Failed to start disaster monitoring');
          // Toast.show({
          //   type: 'error',
          //   text1: 'Monitoring Failed',
          //   text2: 'Could not start disaster monitoring',
          // });
        }
      }
    };

    startMonitoring();
  }, [username, currentLocation]); // Re-run when either changes
  useEffect(() => {
    // Run a check when app first opens (after location and username are ready)
    const runCatchupCheck = async () => {
      if (username && currentLocation) {
        console.log('🔄 Running catch-up check for missed disasters...');

        // Wait a bit for everything to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        const result = await triggerManualCheck();

        if (result) {
          console.log('✅ Caught up - found disasters that happened while app was closed');
          Toast.show({
            type: 'warning',
            text1: 'Disaster Alert',
            text2: 'Check notifications for important updates',
            visibilityTime: 5000,
          });
        } else {
          console.log('✅ Caught up - no missed disasters');
        }
      }
    };

    runCatchupCheck();
  }, [username, currentLocation]);

  const handleRefresh = async () => {
    setRefreshing(true);

    // Try to get location again if we don't have it
    if (!currentLocation || locationMessage) {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();

        if (status !== "granted") {
          const permissionResult = await Location.requestForegroundPermissionsAsync();
          if (permissionResult.status !== "granted") {
            setLocationMessage("📍 Enable location to see nearby resources");
            setRefreshing(false);
            return;
          }
        }

        let loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);
        setLocationMessage("");

        let places = await Location.reverseGeocodeAsync(loc.coords);
        if (places && places.length > 0) {
          const place = places[0];
          setPlaceName(
            [
              place.street,
              place.district,
              place.city,
              place.subregion,
              place.country,
            ]
              .filter(Boolean)
              .join(", ")
          );
        }
      } catch (error) {
        setLocationMessage("Location is turned off — please enable location services in Settings.");
        console.warn("Location refresh error:", error);
      }
    }

    // Fetch nearby pins and weather if we have location
    if (currentLocation) {
      await Promise.all([fetchNearbyPinsData(), fetchWeather(), fetchEarthquakes()]);
    }
    setRefreshing(false);
  };

  const handlePinPress = (pin) => {
    setSelectedPin(pin);
    setPinModalVisible(true);
  };

  const renderWeatherCard = () => {
    if (loadingWeather && !weatherData) {
      return (
        <View style={styles.weatherCard}>
          <ActivityIndicator size="small" color="#e75e33" />
        </View>
      );
    }

    if (!weatherData) return null;

    const iconName = getWeatherIcon(weatherData.main, weatherData.icon);
    const windKmh = (weatherData.windSpeed * 3.6).toFixed(0);

    // ✅ Add wind warning color
    const getWindColor = (speed) => {
      if (speed >= 62) return '#e74c3c'; // Red - Tropical Storm+
      if (speed >= 45) return '#f39c12'; // Orange - Tropical Depression
      if (speed >= 30) return '#3498db'; // Blue - Moderate
      return '#49A5A2'; // Default
    };

    return (
      <View style={styles.weatherCard}>
        <View style={styles.weatherHeader}>
          <Icon name={iconName} size={48} color="#e75e33" />
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherTemp}>{weatherData.temperature}°C</Text>
            <Text style={styles.weatherDescription}>
              {weatherData.description.charAt(0).toUpperCase() +
                weatherData.description.slice(1)}
            </Text>
          </View>
        </View>

        {/* ✅ NEW: Prominent Wind Speed Display */}
        <View style={[styles.windSpeedBanner, { borderLeftColor: getWindColor(windKmh) }]}>
          <Icon name="speedometer-outline" size={24} color={getWindColor(windKmh)} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.windSpeedLabel}>Wind Speed</Text>
            <Text style={[styles.windSpeedText, { color: getWindColor(windKmh) }]}>
              {weatherData.windSpeed.toFixed(1)} m/s ({windKmh} km/h)
            </Text>
          </View>
        </View>

        <View style={styles.weatherDetails}>
          <View style={styles.weatherDetailItem}>
            <Icon name="water-outline" size={20} color="#49A5A2" />
            <Text style={styles.weatherDetailText}>{weatherData.humidity}%</Text>
          </View>
          <View style={styles.weatherDetailItem}>
            <Icon name="thermometer-outline" size={20} color="#49A5A2" />
            <Text style={styles.weatherDetailText}>
              Feels like {weatherData.feelsLike}°C
            </Text>
          </View>
          <View style={styles.weatherDetailItem}>
            <Icon name="eye-outline" size={20} color="#49A5A2" />
            <Text style={styles.weatherDetailText}>
              {weatherData.pressure} hPa
            </Text>
          </View>
        </View>
      </View>
    );
  };


  const renderEarthquakeCard = () => {
    if (loadingEarthquakes && earthquakes.length === 0) {
      return (
        <View style={styles.earthquakeCard}>
          <View style={styles.earthquakeHeader}>
            <Icon name="pulse" size={24} color="#e75e33" />
            <Text style={styles.earthquakeTitle}>Recent Earthquakes</Text>
          </View>
          <ActivityIndicator size="small" color="#e75e33" style={{ marginTop: 12 }} />
        </View>
      );
    }

    if (earthquakes.length === 0) {
      return (
        <View style={styles.earthquakeCard}>
          <View style={styles.earthquakeHeader}>
            <Icon name="pulse" size={24} color="#e75e33" />
            <Text style={styles.earthquakeTitle}>Recent Earthquakes</Text>
          </View>
          <View style={styles.noEarthquakeContainer}>
            <Icon name="checkmark-circle-outline" size={40} color="#66bb6a" />
            <Text style={styles.noEarthquakeText}>No recent earthquakes in your area</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.earthquakeCard}>
        <View style={styles.earthquakeHeader}>
          <Icon name="pulse" size={24} color="#e75e33" />
          <Text style={styles.earthquakeTitle}>Recent Earthquakes</Text>
          <Text style={styles.earthquakeCount}>{earthquakes.length}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.earthquakeScroll}
        >
          {earthquakes.map((quake) => (
            <View key={quake.id} style={styles.earthquakeItem}>
              <View
                style={[
                  styles.magnitudeBadge,
                  { backgroundColor: getMagnitudeColor(quake.magnitude) }
                ]}
              >
                <Text style={styles.magnitudeText}>{quake.magnitude.toFixed(1)}</Text>
                <Text style={styles.magnitudeLabel}>{getMagnitudeLabel(quake.magnitude)}</Text>
              </View>

              <Text style={styles.earthquakePlace} numberOfLines={2}>
                {quake.place}
              </Text>

              <View style={styles.earthquakeDetails}>
                <View style={styles.earthquakeDetailRow}>
                  <Icon name="time-outline" size={14} color="#666" />
                  <Text style={styles.earthquakeDetailText}>{quake.timeAgo}</Text>
                </View>
                <View style={styles.earthquakeDetailRow}>
                  <Icon name="arrow-down-outline" size={14} color="#666" />
                  <Text style={styles.earthquakeDetailText}>{quake.depth.toFixed(1)} km</Text>
                </View>
              </View>

              {quake.tsunami && (
                <View style={styles.tsunamiWarning}>
                  <Icon name="warning" size={14} color="#fff" />
                  <Text style={styles.tsunamiText}>Tsunami Warning</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.yourButtonStyle}
          onPress={handleTestAllNotifications}  // ← Change to this
        >
          {/* <Text style={styles.buttonText}>Test All Notifications</Text> */}
        </TouchableOpacity>
      </View>
    );
  };
  const renderNearbyResources = () => {
    if (loadingPins) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e75e33" />
          <Text style={styles.loadingText}>Finding nearby resources...</Text>
        </View>
      );
    }

    if (!currentLocation) {
      return (
        <View style={styles.noLocationContainer}>
          <Icon name="location-outline" size={48} color="#ccc" />
          <Text style={styles.noLocationText}>Location access required</Text>
          <Text style={styles.noLocationSubtext}>
            Please enable location to see nearby resources
          </Text>
        </View>
      );
    }

    if (nearbyPins.length === 0) {
      return (
        <View style={styles.noPinsContainer}>
          <Icon name="map-outline" size={48} color="#ccc" />
          <Text style={styles.noPinsText}>No nearby resources found</Text>
          <Text style={styles.noPinsSubtext}>
            Be the first to add a resource in your area!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.pinsContainer}>
        {nearbyPins.map((pin) => (
          <SimplePinCard key={pin.id} pin={pin} onPress={handlePinPress} />
        ))}

        {nearbyPins.length >= 10 && (
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={() => navigation.navigate("Map")}
          >
            <Text style={styles.viewMoreText}>View all on map</Text>
            <Icon name="chevron-forward" size={16} color="#e75e33" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={20} color="#fff" />
            <Text style={styles.locationText}>
              {placeName || locationMessage || "Fetching your location..."}
            </Text>
          </View>

          {/*Notification Button */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              setNotificationCount(0); // Clear badge when opening
              navigation.navigate('NotificationCenter', { username });
            }}
          >
            <Icon name="notifications-outline" size={24} color="#000" />
            {/* Red Badge for unread notifications */}
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Modal
            visible={notificationModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setNotificationModalVisible(false)}
          >
            <TouchableOpacity
              style={styles.bubbleOverlay}
              activeOpacity={1}
              onPressOut={() => setNotificationModalVisible(false)}
            >
              <View style={styles.bubbleWrapper}>
                {/* Pointer / Arrow */}
                <View style={styles.bubblePointer} />

                {/* Bubble Body */}
                <View style={styles.bubbleContainer}>
                  <Text style={styles.bubbleTitle}>Notifications</Text>
                  <View style={styles.bubbleContent}>
                    <Text style={styles.bubbleItem}>📌 New pin near you</Text>
                    <Text style={styles.bubbleItem}>
                      ✅ Your request was approved
                    </Text>
                    <Text style={styles.bubbleItem}>
                      ⚠️ Emergency alert in your area
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#e75e33"]}
              tintColor="#e75e33"
            />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeContainer}>
            <Image
              source={
                userInfo
                  ? userInfo.gender === "Female"
                    ? womanProfile
                    : userInfo.gender === "Male"
                      ? boyProfile
                      : userInfo.gender === "admin"
                        ? adminProfile
                        : userProfile
                  : userProfile
              }
              style={styles.profileImage}
            />
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {userInfo && userInfo.firstName
                  ? userInfo.firstName
                  : "Citizen"}
              </Text>
            </View>
          </View>

          {/* Carousel */}
          <View style={styles.carouselContainer}>
            <Swiper
              autoplay
              autoplayTimeout={3}
              showsPagination={true}
              dotStyle={{
                backgroundColor: "#fff",
                width: 5,
                height: 5,
                borderRadius: 5,
                marginHorizontal: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 2,
              }}
              activeDotStyle={{
                backgroundColor: "#e75e33",
                width: 8,
                height: 8,
                borderRadius: 7,
                marginHorizontal: 5,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.4,
                shadowRadius: 3,
                elevation: 3,
              }}
              paginationStyle={{
                bottom: 5,
              }}
            >
              <Image
                source={require("../assets/Emergency.jpg")}
                style={styles.carouselImage}
              />
              <Image
                source={require("../assets/poster2.jpg")}
                style={styles.carouselImage}
              />
              <Image
                source={require("../assets/Disaster 1.jpg")}
                style={styles.carouselImage}
              />
            </Swiper>
          </View>
          {/* Update Version Identifier */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Update Version: {updateVersion}</Text>
          </View>
          {/* Weather Card */}
          {renderWeatherCard()}
          {/* Earthquake Card */}
          {renderEarthquakeCard()}
          {/* Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.cardRow}>
              <TouchableOpacity
                style={styles.cardServices}
                onPress={() => navigation.navigate("FoodDistribution")}
              >
                <Image
                  source={require("../assets/distribution.jpg")}
                  style={styles.cardImage}
                />
                <Text style={styles.cardText}>Food Distribution Schedules</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardServices}
                onPress={() => navigation.navigate("MedicalSupport")}
              >
                <Image
                  source={require("../assets/medical.jpg")}
                  style={styles.cardImage}
                />
                <Text style={styles.cardText}>Medical Support Location</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardServices}
                onPress={() => navigation.navigate("EvacuationCenters")}
              >
                <Image
                  source={require("../assets/evacuation.jpg")}
                  style={styles.cardImage}
                />
                <Text style={styles.cardText}>Evacuation Centers</Text>
              </TouchableOpacity>
              <View style={styles.cardRow}>
                {/* Your 3 existing cards */}

                {/* <TouchableOpacity
                  style={styles.yourButtonStyle}
                  onPress={handleTestAllNotifications}
                >
                  <Icon name="notifications-outline" size={40} color="#fff" />
                  <Text style={styles.buttonText}>Test All Notifications</Text>
                </TouchableOpacity> */}
              </View>

            </View>
          </View>

          {/* Nearby Resources */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Resources</Text>
              {nearbyPins.length > 0 && (
                <TouchableOpacity
                  onPress={handleRefresh}
                  disabled={loadingPins}
                >
                  <Icon
                    name="refresh"
                    size={25}
                    color={loadingPins ? "#ccc" : "#e75e33"}
                  />
                </TouchableOpacity>
              )}
            </View>
            {renderNearbyResources()}
            {selectedPin && (
              <Modal
                visible={pinModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setPinModalVisible(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContainer}>
                    {/* Close Button */}
                    <TouchableOpacity
                      onPress={() => setPinModalVisible(false)}
                      style={styles.closeIcon}
                    >
                      <Icon name="close" size={22} color="#666" />
                    </TouchableOpacity>


                    {/* Content */}
                    <Text style={styles.modalTitle}>
                      {selectedPin.userFirstName}
                    </Text>
                    <Text style={styles.modalDescription}>
                      {selectedPin.description}
                    </Text>
                    <Text style={styles.modalCategory}>
                      {selectedPin.category}
                    </Text>
                    <Text style={styles.modalDistance}>
                      Distance: {selectedPin.formattedDistance}
                    </Text>
                    <Text style={styles.modalMeta}>
                      <Icon name="arrow-up-sharp" size={18} color="#49A5A2" />{" "}
                      {selectedPin.upvotes || 0}
                      {"   "}
                      <Icon
                        name="arrow-down-sharp"
                        size={18}
                        color="#e75e33"
                      />{" "}
                      {selectedPin.downvotes || 0}
                    </Text>

                    {/* View on Map Button */}
                    <TouchableOpacity
                      onPress={() => {
                        setPinModalVisible(false);
                        navigation.navigate("Map", {
                          focusPin: {
                            latitude: selectedPin.latitude,
                            longitude: selectedPin.longitude,
                            id: selectedPin.id,
                          },
                        });
                      }}
                      style={styles.viewMapButton}
                    >
                      <Icon
                        name="eye-outline"
                        size={20}
                        color="#fff"
                        style={styles.viewMapIcon}
                      />
                      <Text style={styles.viewMapText}>View on Map</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    height: hp("100%"),
    width: wp("100%"),
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#e75e33",
  },
  header: {
    backgroundColor: "#e75e33",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp("1.8%"),
    paddingBottom: hp("2%"),
    paddingHorizontal: wp("4%"),
  },
  notificationButton: {
    marginRight: 9,
    backgroundColor: "#fff",
    padding: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 48,
    paddingRight: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  bubbleContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    width: wp("80%"),
    maxWidth: 300,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  bubbleTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  bubbleContent: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  bubbleItem: {
    fontSize: 14,
    paddingVertical: 6,
    color: "#555",
  },
  bubbleWrapper: {
    alignItems: "flex-end",
  },
  bubblePointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 14,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#fff",
    marginRight: 20,
    marginBottom: -2,
    zIndex: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    color: "#fff",
    marginLeft: 4,
    alignSelf: "center",
    flexDirection: "column",
    fontWeight: "bold",
    fontSize: wp("4%"),
    flexShrink: 1,
  },
  carouselContainer: {
    width: "100%",
    height: hp("20%"),
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // Weather Card Styles
  weatherCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  weatherHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  weatherInfo: {
    marginLeft: 16,
    flex: 1,
  },
  weatherTemp: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  weatherDescription: {
    fontSize: 16,
    color: "#666",
    textTransform: "capitalize",
  },
  weatherDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  weatherDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weatherDetailText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: wp("4%"),
    paddingBottom: hp("0.5%"),
  },
  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: "#333",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  section: {
    marginBottom: hp("3%"),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  cardServices: {
    width: wp("44%"),
    height: wp("44%"),
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: wp("5%"),
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e1e1e1",
  },
  cardText: {
    fontSize: 13,
    textAlign: "center",
  },
  cardNearby: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 16,
    fontWeight: "600",
    color: "#e75e33",
  },
  cardDistance: {
    fontSize: 13,
    color: "#49A5A2",
    fontWeight: "500",
  },
  cardDescription: {
    fontSize: 14,
    color: "#444",
    marginBottom: 10,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardUser: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  voteText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
    color: "#333",
  },
  pinsContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("4%"),
  },
  loadingText: {
    marginTop: hp("1%"),
    fontSize: wp("3.5%"),
    color: "#666",
  },
  noLocationContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("4%"),
  },
  noLocationText: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#666",
    marginTop: hp("1%"),
  },
  noLocationSubtext: {
    fontSize: wp("3.2%"),
    color: "#999",
    textAlign: "center",
    marginTop: hp("0.5%"),
  },
  noPinsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("4%"),
  },
  noPinsText: {
    fontSize: wp("4%"),
    fontWeight: "600",
    color: "#666",
    marginTop: hp("1%"),
  },
  noPinsSubtext: {
    fontSize: wp("3.2%"),
    color: "#999",
    textAlign: "center",
    marginTop: hp("0.5%"),
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp("1.5%"),
    marginTop: hp("1%"),
  },
  viewMoreText: {
    fontSize: wp("3.5%"),
    color: "#e75e33",
    fontWeight: "600",
    marginRight: wp("1%"),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    elevation: 5,
    position: "relative",
  },
  closeIcon: {
    position: "absolute",
    top: 12,
    right: 10,
    padding: 2,
    backgroundColor: "#fff",
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginRight: 5,
  },
  modalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 8,
    alignItems: "center",
    textAlign: "center",
  },
  modalCategory: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
    color: "#EC6135",
    fontWeight: "600",
    backgroundColor: "#FFF3F0",
    paddingVertical: 7,
    borderRadius: 12,
  },
  modalDescription: {
    alignItems: "center",
    textAlign: "center",
    marginBottom: 12,
    color: "#333",
  },
  modalMeta: {
    marginBottom: 4,
    color: "#555",
    fontSize: 15,
    paddingLeft: 8,
    fontWeight: "500",
    alignSelf: "center",
  },
  modalDistance: {
    fontSize: 14,
    color: "#49A5A2",
    marginBottom: 12,
    fontWeight: 600,
    paddingLeft: 8,
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: "#e75e33",
  },
  viewMapIcon: {
    marginRight: 6,
  },
  viewMapText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  earthquakeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  earthquakeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  earthquakeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
    flex: 1,
  },
  earthquakeCount: {
    backgroundColor: "#e75e33",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "bold",
  },
  earthquakeScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  earthquakeItem: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: wp("65%"),
    borderLeftWidth: 4,
    borderLeftColor: "#e75e33",
  },
  magnitudeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  magnitudeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  magnitudeLabel: {
    fontSize: 10,
    color: "#fff",
    textAlign: "center",
    marginTop: 2,
  },
  earthquakePlace: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    lineHeight: 18,
  },
  earthquakeDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  earthquakeDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  earthquakeDetailText: {
    fontSize: 12,
    color: "#666",
  },
  tsunamiWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d32f2f",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
    gap: 4,
  },
  tsunamiText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  viewAllEarthquakesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  viewAllEarthquakesText: {
    fontSize: 14,
    color: "#e75e33",
    fontWeight: "600",
    marginRight: 4,
  },
  noEarthquakeContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noEarthquakeText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  windSpeedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderLeftWidth: 4,
  },
  windSpeedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  windSpeedText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Add these to your StyleSheet.create({ ... }) at the bottom
  yourButtonStyle: {
    width: wp("44%"),
    height: wp("44%"),
    backgroundColor: "#e75e33",  // Orange like your theme
    borderRadius: 12,
    padding: wp("5%"),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  buttonText: {
    fontSize: 13,
    textAlign: "center",
    color: "#fff",  // White text
    fontWeight: "600",
  },
  testButtonStandalone: {
    flexDirection: 'row',
    backgroundColor: '#e75e33',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
});