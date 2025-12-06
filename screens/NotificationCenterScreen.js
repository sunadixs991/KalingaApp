// screens/NotificationCenterScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissAllNotifications,
  sendEarthquakeAlert,
  sendWeatherAlert,
  sendIncidentAlert,
} from '../services/NotificationService';
import Toast from 'react-native-toast-message';
import { saveNotificationToHistory } from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationCenterScreen({ navigation, route }) {
  const routeUsername = route?.params?.username;
  const [resolvedUsername, setResolvedUsername] = useState(routeUsername || null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Resolve username from route params or AsyncStorage then load notifications
    const resolveAndFetch = async () => {
      try {
        // Clear previous notifications first to prevent showing old user's data
        setNotifications([]);
        
        if (routeUsername) {
          setResolvedUsername(routeUsername);
          await fetchNotifications(routeUsername);
        } else {
          // Try AsyncStorage 'user' (string or JSON) then 'userInfo'
          let userVal = null;
          try {
            userVal = await AsyncStorage.getItem('user');
          } catch (e) {
            userVal = null;
          }

          let usernameCandidate = null;
          if (userVal) {
            try {
              // Some places store JSON; some store plain username string
              const parsed = JSON.parse(userVal);
              if (parsed && typeof parsed === 'object') {
                usernameCandidate = parsed.username || parsed?.email || parsed?.uid || null;
              } else if (typeof parsed === 'string') {
                usernameCandidate = parsed;
              }
            } catch {
              // not JSON, probably plain string
              usernameCandidate = userVal;
            }
          }

          if (!usernameCandidate) {
            // try alternate key
            try {
              const userInfoStr = await AsyncStorage.getItem('userInfo');
              if (userInfoStr) {
                const userInfo = JSON.parse(userInfoStr);
                usernameCandidate = userInfo.username || userInfo.email || userInfo.uid || null;
              }
            } catch {
              // ignore
            }
          }

          if (usernameCandidate) {
            setResolvedUsername(usernameCandidate);
            await fetchNotifications(usernameCandidate);
          } else {
            // No user logged in - show only public notifications (earthquake/weather)
            setResolvedUsername(null);
            await fetchNotifications(null);
          }
        }
      } catch (err) {
        console.error('Failed to resolve username for notifications:', err);
        await fetchNotifications(routeUsername || null);
      } finally {
        try {
          // Clear any system/pending notifications
          dismissAllNotifications();
        } catch {}
      }
    };

    resolveAndFetch();
  }, [routeUsername]); // Re-run when routeUsername changes

  const fetchNotifications = async (usernameToUse) => {
    setLoading(true);
    try {
      let combined = [];

      console.log('🔍 Fetching notifications...');
      console.log('   Current user:', usernameToUse || 'NOT LOGGED IN');

      // ALWAYS fetch public/broadcast notifications (earthquake, weather, typhoon)
      // These should be visible to everyone, logged in or not
      try {
        const publicNotifications = await getNotificationHistory('all');
        if (Array.isArray(publicNotifications)) {
          // Filter to only show public notification types
          const filtered = publicNotifications.filter(n => {
            const type = n.data?.type || n.type;
            return type === 'earthquake' || type === 'weather' || type === 'typhoon';
          });
          combined = combined.concat(filtered);
          console.log(`   📢 Public notifications: ${filtered.length}`);
        }
      } catch (e) {
        console.debug('No public notifications available', e);
      }

      // If user is logged in, ALSO fetch their personal notifications (schedules, incidents)
      if (usernameToUse) {
        try {
          const personalNotifications = await getNotificationHistory(usernameToUse);
          if (Array.isArray(personalNotifications)) {
            // Include all personal notifications for the logged-in user
            combined = combined.concat(personalNotifications);
            console.log(`   👤 Personal notifications: ${personalNotifications.length}`);
          }
        } catch (e) {
          console.debug('No personal notifications available', e);
        }
      } else {
        console.log('   👋 Not logged in - showing only public notifications');
      }

      // Deduplicate by id
      const uniqueById = {};
      combined.forEach((n) => {
        if (!n) return;
        uniqueById[n.id] = n;
      });
      let merged = Object.values(uniqueById);

      // ✅ CRITICAL FIX: Filter notifications based on login status
      merged = merged.filter(n => {
        const type = n.data?.type || n.type;
        const isScheduleNotification = type === 'food_schedule' || type === 'schedule' || type === 'food';
        const isPublicNotification = type === 'earthquake' || type === 'weather' || type === 'typhoon';
        
        // If not logged in, only show public notifications
        if (!usernameToUse) {
          if (isScheduleNotification) {
            console.log('   🚫 Filtered out schedule notification (not logged in):', n.title);
            return false;
          }
          return isPublicNotification;
        }
        
        // If logged in, show all notifications
        return true;
      });

      // Sort by createdAt descending
      merged.sort((a, b) => {
        const ta = a?.createdAt ? (typeof a.createdAt === 'object' ? a.createdAt : new Date(a.createdAt)) : 0;
        const tb = b?.createdAt ? (typeof b.createdAt === 'object' ? b.createdAt : new Date(b.createdAt)) : 0;
        return tb - ta;
      });

      console.log(`   ✅ Final notifications displayed: ${merged.length}`);
      setNotifications(merged);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not load notifications',
      });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications(resolvedUsername);
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }

    // Navigate based on notification type
    const notificationType = notification.data?.type;

    if (notificationType === 'earthquake') {
      navigation.navigate('Earthquake');
    } else if (notificationType === 'incident') {
      navigation.navigate('IncidentsList');
    } else if (notificationType === 'weather' || notificationType === 'typhoon') {
      navigation.navigate('Home');
    } else if (notificationType === 'food_schedule' || notificationType === 'schedule' || notificationType === 'food') {
      // ✅ Only navigate to FoodDistribution if user is logged in
      if (resolvedUsername) {
        navigation.navigate('FoodDistribution', {
          scheduleData: notification.data,
          highlightSchedule: notification.data?.scheduleId,
        });
      } else {
        // This shouldn't happen due to filtering, but just in case
        Toast.show({
          type: 'info',
          text1: 'Login Required',
          text2: 'Please log in to view schedule details',
        });
      }
    } else {
      // Default: go to Home if type is unknown
      navigation.navigate('Home');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // mark for resolved user; if none, attempt marking 'all' (broadcast)
      const target = resolvedUsername || 'all';
      await markAllNotificationsAsRead(target);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      Toast.show({
        type: 'success',
        text1: 'All notifications marked as read',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not mark all as read',
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'earthquake':
        return { name: 'pulse', color: '#e67e22' };
      case 'weather':
        return { name: 'cloud', color: '#3498db' };
      case 'typhoon':
        return { name: 'thunderstorm', color: '#8B0000' };
      case 'incident':
        return { name: 'alert-circle', color: '#e75e33' };
      case 'food_schedule':
      case 'schedule':
      case 'food':
        return { name: 'calendar', color: '#49A5A2' };
      default:
        return { name: 'notifications', color: '#7f8c8d' };
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Unknown time';

    const d = typeof date === 'number' ? new Date(date) : (date instanceof Date ? date : new Date(date));
    const seconds = Math.floor((new Date() - d) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return d.toLocaleDateString();
  };

  const showTestMenu = () => {
    Alert.alert(
      'Send Test Notification',
      'Choose a notification type to test',
      [
        {
          text: 'Earthquake Alert',
          onPress: async () => {
            await sendEarthquakeAlert(5.8, 'Cebu City, Philippines');
            // Save to history so it appears in the list
            await saveNotificationToHistory(resolvedUsername || 'all', {
              title: '🚨 Earthquake Alert - Magnitude 5.8',
              body: 'Earthquake detected in Cebu City, Philippines. Stay safe and follow emergency procedures.',
              data: { type: 'earthquake', magnitude: 5.8, location: 'Cebu City, Philippines' }
            });
            fetchNotifications(resolvedUsername);
          },
        },
        {
          text: 'Weather Alert',
          onPress: async () => {
            await sendWeatherAlert('Typhoon Warning', 'Typhoon approaching. Prepare for heavy rain and strong winds.');
            // Save to history
            await saveNotificationToHistory(resolvedUsername || 'all', {
              title: '⚠️ Weather Alert: Typhoon Warning',
              body: 'Typhoon approaching. Prepare for heavy rain and strong winds.',
              data: { type: 'weather', alertType: 'Typhoon Warning' }
            });
            fetchNotifications(resolvedUsername);
          },
        },
        {
          text: 'Incident Alert',
          onPress: async () => {
            await sendIncidentAlert('Flood', '2.5 km');
            // Save to history
            await saveNotificationToHistory(resolvedUsername || 'all', {
              title: '📍 New Incident Near You',
              body: 'Flood reported 2.5 km away. Tap to view details.',
              data: { type: 'incident', incidentType: 'Flood' }
            });
            fetchNotifications(resolvedUsername);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderNotificationItem = ({ item }) => {
    const icon = getNotificationIcon(item.data?.type);

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: icon.color }]}>
          <Icon name={icon.name} size={24} color="#fff" />
        </View>

        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>{getTimeAgo(item.createdAt)}</Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="notifications-off-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptySubtext}>
        {resolvedUsername 
          ? "You'll receive alerts about earthquakes, weather, schedules, and incidents here"
          : "You'll receive alerts about earthquakes and weather here. Log in to see schedule notifications."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={handleMarkAllAsRead}
          disabled={notifications.length === 0}
        >
          <Icon
            name="checkmark-done"
            size={24}
            color={notifications.length === 0 ? '#ccc' : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e75e33" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#e75e33']}
              tintColor="#e75e33"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#e75e33',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('2%'),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  listContainer: {
    padding: wp('4%'),
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e75e33',
    backgroundColor: '#fff9f8',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e75e33',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('10%'),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
});