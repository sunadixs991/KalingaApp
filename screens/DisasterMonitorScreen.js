// screens/DisasterMonitorScreen.js
// Example screen showing disaster monitoring status
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  checkMonitoringStatus,
  triggerManualDisasterCheck,
  getRecentDisasterSummary,
  getDisasterStatistics,
  testDisasterNotification,
} from '../services/DisasterNotificationService';
import { SafeAreaView } from 'react-native-safe-area-context'; 

export default function DisasterMonitorScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoringStatus, setMonitoringStatus] = useState(null);
  const [recentSummary, setRecentSummary] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [checkingNow, setCheckingNow] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [status, summary, stats] = await Promise.all([
        checkMonitoringStatus(),
        getRecentDisasterSummary(),
        getDisasterStatistics(30),
      ]);

      setMonitoringStatus(status);
      setRecentSummary(summary);
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading disaster monitor data:', error);
      Alert.alert('Error', 'Failed to load monitoring status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleManualCheck = async () => {
    try {
      setCheckingNow(true);
      
      Alert.alert(
        'Manual Check',
        'This will trigger the server to check for new earthquakes and weather alerts. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Check Now',
            onPress: async () => {
              const result = await triggerManualDisasterCheck();
              
              if (result.success) {
                Alert.alert(
                  'Check Complete',
                  `Earthquakes: ${result.earthquakeNotifications}\n` +
                  `Weather: ${result.weatherNotifications}\n` +
                  `Total notifications: ${result.totalNotifications}`,
                  [{ text: 'OK', onPress: loadData }]
                );
              } else {
                Alert.alert('Error', result.error || 'Check failed');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger manual check');
    } finally {
      setCheckingNow(false);
    }
  };

  const handleTestNotification = (type) => {
    Alert.alert(
      'Test Notification',
      `Send a test ${type} notification to this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Test',
          onPress: async () => {
            const success = await testDisasterNotification(type);
            if (success) {
              Alert.alert('Success', 'Test notification sent!');
            } else {
              Alert.alert('Error', 'Failed to send test notification');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e75e33" />
        <Text style={styles.loadingText}>Loading monitoring status...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={48} color="#e75e33" />
          <Text style={styles.headerTitle}>Disaster Monitoring</Text>
          <Text style={styles.headerSubtitle}>Server-side 24/7 monitoring</Text>
        </View>

        {/* Monitoring Status */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={monitoringStatus?.active ? "checkmark-circle" : "alert-circle"} 
              size={24} 
              color={monitoringStatus?.active ? "#4CAF50" : "#f44336"} 
            />
            <Text style={styles.cardTitle}>System Status</Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Server Monitoring:</Text>
            <Text style={[
              styles.statusValue,
              { color: monitoringStatus?.active ? "#4CAF50" : "#f44336" }
            ]}>
              {monitoringStatus?.active ? "Active ✓" : "Offline ✗"}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Earthquake Checks:</Text>
            <Text style={styles.statusValue}>Every 5 minutes</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Weather Checks:</Text>
            <Text style={styles.statusValue}>Every 15 minutes</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Alert Radius:</Text>
            <Text style={styles.statusValue}>250 km</Text>
          </View>

          <TouchableOpacity
            style={styles.manualCheckButton}
            onPress={handleManualCheck}
            disabled={checkingNow}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.manualCheckText}>
              {checkingNow ? 'Checking...' : 'Trigger Manual Check'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time" size={24} color="#e75e33" />
            <Text style={styles.cardTitle}>Recent Activity (7 days)</Text>
          </View>

          {recentSummary && (
            <>
              <View style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name="earth" size={32} color="#e67e22" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Earthquakes</Text>
                  <Text style={styles.activityCount}>{recentSummary.earthquakes.count} alerts</Text>
                  {recentSummary.earthquakes.maxMagnitude > 0 && (
                    <Text style={styles.activityDetail}>
                      Max magnitude: {recentSummary.earthquakes.maxMagnitude.toFixed(1)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Ionicons name="cloud" size={32} color="#3498db" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>Weather Alerts</Text>
                  <Text style={styles.activityCount}>{recentSummary.weatherAlerts.count} alerts</Text>
                  {recentSummary.weatherAlerts.types.length > 0 && (
                    <Text style={styles.activityDetail}>
                      Types: {recentSummary.weatherAlerts.types.join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.totalAlertsBox}>
                <Text style={styles.totalAlertsText}>
                  Total Alerts: {recentSummary.totalAlerts}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Statistics */}
        {statistics && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bar-chart" size={24} color="#e75e33" />
              <Text style={styles.cardTitle}>Statistics (30 days)</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{statistics.totalEvents}</Text>
                <Text style={styles.statLabel}>Total Events</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{statistics.earthquakes}</Text>
                <Text style={styles.statLabel}>Earthquakes</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{statistics.weatherAlerts}</Text>
                <Text style={styles.statLabel}>Weather Alerts</Text>
              </View>
            </View>

            {statistics.earthquakes > 0 && (
              <>
                <Text style={styles.subsectionTitle}>Earthquakes by Magnitude</Text>
                <View style={styles.magnitudeBar}>
                  <MagnitudeRow label="Major (7.0+)" count={statistics.byMagnitude.major} color="#c0392b" />
                  <MagnitudeRow label="Strong (6.0-6.9)" count={statistics.byMagnitude.strong} color="#e67e22" />
                  <MagnitudeRow label="Moderate (5.0-5.9)" count={statistics.byMagnitude.moderate} color="#f39c12" />
                  <MagnitudeRow label="Light (4.0-4.9)" count={statistics.byMagnitude.light} color="#f1c40f" />
                  <MagnitudeRow label="Minor (<4.0)" count={statistics.byMagnitude.minor} color="#95a5a6" />
                </View>
              </>
            )}
          </View>
        )}

        {/* Test Notifications */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flask" size={24} color="#e75e33" />
            <Text style={styles.cardTitle}>Test Notifications</Text>
          </View>

          <Text style={styles.testDescription}>
            Send test notifications to verify your device receives disaster alerts correctly.
          </Text>

          <View style={styles.testButtons}>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#e67e22' }]}
              onPress={() => handleTestNotification('earthquake')}
            >
              <Ionicons name="earth" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Earthquake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#3498db' }]}
              onPress={() => handleTestNotification('weather')}
            >
              <Ionicons name="cloud" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Weather</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: '#8B0000' }]}
              onPress={() => handleTestNotification('typhoon')}
            >
              <Ionicons name="thunderstorm" size={20} color="#fff" />
              <Text style={styles.testButtonText}>Typhoon</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <Text style={styles.infoText}>
            This system monitors earthquakes, weather conditions, and typhoons 24/7 using server-side processing. 
            You'll receive alerts when disasters occur within 250km of your location.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for magnitude rows
function MagnitudeRow({ label, count, color }) {
  return (
    <View style={styles.magnitudeRow}>
      <View style={[styles.magnitudeColor, { backgroundColor: color }]} />
      <Text style={styles.magnitudeLabel}>{label}</Text>
      <Text style={styles.magnitudeCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  manualCheckButton: {
    flexDirection: 'row',
    backgroundColor: '#e75e33',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  manualCheckText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activityCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  activityDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  totalAlertsBox: {
    backgroundColor: '#e75e33',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  totalAlertsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e75e33',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  magnitudeBar: {
    marginTop: 8,
  },
  magnitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  magnitudeColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
    marginRight: 8,
  },
  magnitudeLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  magnitudeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  testDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  testButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  testButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
  },
  safeArea: {
  flex: 1,
  backgroundColor: '#fff',
},
});