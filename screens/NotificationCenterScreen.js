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


export default function NotificationCenterScreen({ navigation, route }) {
  const { username } = route.params || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
    dismissAllNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const history = await getNotificationHistory(username);
      history.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt - a.createdAt;
      });
      setNotifications(history);
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
    await fetchNotifications();
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
    } else if (notification.data?.type === 'weather' || notification.data?.type === 'typhoon') {  // UPDATE THIS LINE
      navigation.navigate('Home');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead(username);
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
      case 'typhoon':  // ADD THIS
        return { name: 'thunderstorm', color: '#8B0000' };  // ADD THIS
      case 'incident':
        return { name: 'alert-circle', color: '#e75e33' };
      default:
        return { name: 'notifications', color: '#7f8c8d' };
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Unknown time';

    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
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
            await saveNotificationToHistory(username, {
              title: '🚨 Earthquake Alert - Magnitude 5.8',
              body: 'Earthquake detected in Cebu City, Philippines. Stay safe and follow emergency procedures.',
              data: { type: 'earthquake', magnitude: 5.8, location: 'Cebu City, Philippines' }
            });
            // Refresh the list
            fetchNotifications();
          },
        },
        {
          text: 'Weather Alert',
          onPress: async () => {
            await sendWeatherAlert('Typhoon Warning', 'Typhoon approaching. Prepare for heavy rain and strong winds.');
            // Save to history
            await saveNotificationToHistory(username, {
              title: '⚠️ Weather Alert: Typhoon Warning',
              body: 'Typhoon approaching. Prepare for heavy rain and strong winds.',
              data: { type: 'weather', alertType: 'Typhoon Warning' }
            });
            fetchNotifications();
          },
        },
        {
          text: 'Incident Alert',
          onPress: async () => {
            await sendIncidentAlert('Flood', '2.5 km');
            // Save to history
            await saveNotificationToHistory(username, {
              title: '📍 New Incident Near You',
              body: 'Flood reported 2.5 km away. Tap to view details.',
              data: { type: 'incident', incidentType: 'Flood' }
            });
            fetchNotifications();
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

      {/* <TouchableOpacity style={styles.testButton} onPress={showTestMenu}>
        <Icon name="flask-outline" size={20} color="#fff" />
        <Text style={styles.testButtonText}>Send Test Notification</Text>
      </TouchableOpacity> */}
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
          // ListFooterComponent={
          //   <TouchableOpacity style={styles.testButtonBottom} onPress={showTestMenu}>
          //     <Icon name="flask-outline" size={18} color="#e75e33" />
          //     <Text style={styles.testButtonBottomText}>Send Test Notification</Text>
          //   </TouchableOpacity>
          // }
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
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#49A5A2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  testButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  testButtonBottomText: {
    color: '#e75e33',
    fontWeight: '600',
    fontSize: 13,
  },
});