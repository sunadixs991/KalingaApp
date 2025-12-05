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
            // no user context: still fetch broadcasts ("all")
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
  }, []);

  const fetchNotifications = async (usernameToUse) => {
    setLoading(true);
    try {
      let combined = [];

      // If we have a specific user, fetch personal notifications
      if (usernameToUse) {
        const personal = await getNotificationHistory(usernameToUse);
        if (Array.isArray(personal)) combined = combined.concat(personal);
      }

      // Always fetch broadcast notifications saved under 'all' (if any)
      try {
        const broadcast = await getNotificationHistory('all');
        if (Array.isArray(broadcast)) combined = combined.concat(broadcast);
      } catch (e) {
        // if the service throws for 'all' ignore
        console.debug('No broadcast notifications or failed to fetch them', e);
      }

      // If neither yielded anything and usernameToUse is falsy, try fetching 'all' only
      if (!usernameToUse && combined.length === 0) {
        const broadcastOnly = await getNotificationHistory('all');
        if (Array.isArray(broadcastOnly)) combined = combined.concat(broadcastOnly);
      }

      // Deduplicate by id (some notifications might appear twice)
      const uniqueById = {};
      combined.forEach((n) => {
        if (!n) return;
        uniqueById[n.id] = n;
      });
      const merged = Object.values(uniqueById);

      // Sort by createdAt descending (handle timestamps that may be numbers or Date objects)
      merged.sort((a, b) => {
        const ta = a?.createdAt ? (typeof a.createdAt === 'object' ? a.createdAt : new Date(a.createdAt)) : 0;
        const tb = b?.createdAt ? (typeof b.createdAt === 'object' ? b.createdAt : new Date(b.createdAt)) : 0;
        return tb - ta;
      });

      setNotifications(merged);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not load notifications',
      });
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
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
      );
    }

    if (notification.data?.type === 'earthquake') {
      navigation.navigate('Earthquake');
    } else if (notification.data?.type === 'incident') {
      navigation.navigate('IncidentsList');
    } else if (notification.data?.type === 'weather' || notification.data?.type === 'typhoon') {
      navigation.navigate('Home');
    } else if (notification.data?.type === 'food_schedule' || notification.data?.type === 'schedule' || notification.data?.type === 'food') {
      // if it's a schedule, navigate to Home or schedules screen as desired
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
        You'll receive alerts about earthquakes, weather, and incidents here
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