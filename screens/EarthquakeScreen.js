// screens/EarthquakeScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import {
  fetchNearbyEarthquakes,
  getMagnitudeColor,
  getMagnitudeLabel,
  calculateDistance,
} from "../services/EarthquakeService";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";
import NetInfo from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Cache configuration
const EARTHQUAKE_CACHE_PREFIX = "earthquake_cache_v1";
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

export default function EarthquakeScreen({ navigation }) {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("nearby");
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    getLocationAndFetch();
  }, []);

  useEffect(() => {
    if (currentLocation) {
      fetchEarthquakeData();
    }
  }, [selectedFilter, currentLocation]);

  const getLocationAndFetch = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "warning",
          text1: "Location Permission",
          text2: "Enable location for nearby earthquakes",
        });
        setCurrentLocation({ latitude: 14.5995, longitude: 120.9842 });
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc.coords);
    } catch (error) {
      console.error("Location error:", error);
      setCurrentLocation({ latitude: 14.5995, longitude: 120.9842 });
    }
  };

  // Generate cache key based on filter and location
  const getCacheKey = (filter, location) => {
    return `${EARTHQUAKE_CACHE_PREFIX}_${filter}_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`;
  };

  // Save earthquakes to cache
  const saveToCache = async (filter, location, data) => {
    try {
      const cacheKey = getCacheKey(filter, location);
      const cacheData = {
        timestamp: Date.now(),
        data: data,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`✅ Saved ${data.length} earthquakes to cache`);
    } catch (error) {
      console.warn("Failed to save to cache:", error);
    }
  };

  // Load earthquakes from cache
  const loadFromCache = async (filter, location) => {
    try {
      const cacheKey = getCacheKey(filter, location);
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (!cached) {
        console.log("📦 No cache found");
        return null;
      }

      const { timestamp, data } = JSON.parse(cached);
      const age = Date.now() - timestamp;

      if (age > CACHE_EXPIRY_TIME) {
        console.log("⏰ Cache expired");
        return null;
      }

      console.log(`✅ Loaded ${data.length} earthquakes from cache (${Math.round(age/1000)}s old)`);
      return data;
    } catch (error) {
      console.warn("Failed to load from cache:", error);
      return null;
    }
  };

  const fetchEarthquakeData = async () => {
    if (!currentLocation) return;

    setLoading(true);
    setUsingCache(false);

    // Try to load from cache first
    const cachedData = await loadFromCache(selectedFilter, currentLocation);
    if (cachedData && cachedData.length > 0) {
      setEarthquakes(cachedData);
      setUsingCache(true);
      setLoading(false);
    }

    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        if (cachedData) {
          Toast.show({
            type: "info",
            text1: "Offline Mode",
            text2: "Showing cached earthquake data",
          });
          setLoading(false);
          return;
        } else {
          Toast.show({
            type: "error",
            text1: "Offline",
            text2: "No cached data available",
          });
          setLoading(false);
          return;
        }
      }

      let quakes = [];
      let radiusKm, minMagnitude, limit;

      switch (selectedFilter) {
        case "nearby":
          radiusKm = 500;
          minMagnitude = 2.0;
          limit = 100;
          quakes = await fetchNearbyEarthquakes(
            currentLocation.latitude,
            currentLocation.longitude,
            radiusKm,
            minMagnitude,
            limit,
            30
          );
          break;

        case "all":
          radiusKm = 2000;
          minMagnitude = 2.0;
          limit = 150;
          quakes = await fetchNearbyEarthquakes(
            currentLocation.latitude,
            currentLocation.longitude,
            radiusKm,
            minMagnitude,
            limit,
            30
          );
          break;

        case "significant":
          radiusKm = 3000;
          minMagnitude = 4.5;
          limit = 100;
          quakes = await fetchNearbyEarthquakes(
            currentLocation.latitude,
            currentLocation.longitude,
            radiusKm,
            minMagnitude,
            limit,
            30
          );
          break;
      }

      // Calculate distance for each earthquake if not already calculated
      const quakesWithDistance = quakes.map((quake) => ({
        ...quake,
        distanceKm: quake.distanceKm || calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          quake.latitude,
          quake.longitude
        ),
      }));

      // Sort by time (most recent first)
      quakesWithDistance.sort((a, b) => b.time - a.time);

      setEarthquakes(quakesWithDistance);
      setUsingCache(false);

      // Save to cache
      await saveToCache(selectedFilter, currentLocation, quakesWithDistance);

    } catch (error) {
      console.error("Error fetching earthquakes:", error);
      
      // If fetch failed but we have cache, keep showing cache
      if (cachedData) {
        Toast.show({
          type: "warning",
          text1: "Using Cached Data",
          text2: "Could not fetch fresh data",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Could not load earthquake data",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEarthquakeData();
    setRefreshing(false);
  };

  const openEarthquakeDetails = (quake) => {
    if (quake.url) {
      Linking.openURL(quake.url).catch(() => {
        Alert.alert("Error", "Could not open earthquake details");
      });
    }
  };

  const renderFilterButton = (filter, label, icon) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === filter && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter)}
    >
      <Icon
        name={icon}
        size={18}
        color={selectedFilter === filter ? "#fff" : "#666"}
      />
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter && styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEarthquakeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.earthquakeCard}
      onPress={() => openEarthquakeDetails(item)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.magnitudeBadge,
          { backgroundColor: getMagnitudeColor(item.magnitude) },
        ]}
      >
        <Text style={styles.magnitudeText}>{item.magnitude.toFixed(1)}</Text>
        <Text style={styles.magnitudeLabel}>
          {getMagnitudeLabel(item.magnitude)}
        </Text>
      </View>

      <View style={styles.earthquakeInfo}>
        <Text style={styles.earthquakePlace} numberOfLines={2}>
          {item.place}
        </Text>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Icon name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.timeAgo}</Text>
          </View>

          <View style={styles.detailItem}>
            <Icon name="location-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {item.distanceKm ? `${item.distanceKm.toFixed(0)} km away` : "N/A"}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Icon name="arrow-down-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Depth: {item.depth.toFixed(1)} km</Text>
          </View>

          {item.felt > 0 && (
            <View style={styles.detailItem}>
              <Icon name="people-outline" size={16} color="#e75e33" />
              <Text style={styles.detailTextBold}>{item.felt} felt reports</Text>
            </View>
          )}
        </View>

        {item.tsunami && (
          <View style={styles.tsunamiWarning}>
            <Icon name="warning" size={16} color="#fff" />
            <Text style={styles.tsunamiText}>Tsunami Warning</Text>
          </View>
        )}

        {item.alert && (
          <View
            style={[
              styles.alertBadge,
              { backgroundColor: getAlertColor(item.alert) },
            ]}
          >
            <Text style={styles.alertText}>
              Alert: {item.alert.toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <Icon name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  const getAlertColor = (alert) => {
    switch (alert?.toLowerCase()) {
      case "red":
        return "#d32f2f";
      case "orange":
        return "#f57c00";
      case "yellow":
        return "#fdd835";
      case "green":
        return "#66bb6a";
      default:
        return "#9e9e9e";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Earthquake Monitor</Text>
        <TouchableOpacity onPress={handleRefresh} disabled={loading}>
          <Icon
            name="refresh"
            size={24}
            color={loading ? "#ccc" : "#fff"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton("nearby", "Nearby", "locate")}
        {renderFilterButton("all", "All", "list")}
        {renderFilterButton("significant", "Significant", "alert-circle")}
      </View>

      <View style={styles.infoBanner}>
        <Icon name="information-circle-outline" size={20} color="#49A5A2" />
        <Text style={styles.infoText}>
          {selectedFilter === "nearby" && "Showing earthquakes 2.0+ within 500km"}
          {selectedFilter === "all" && "Showing earthquakes 2.0+ within 2000km"}
          {selectedFilter === "significant" && "Showing earthquakes 4.5+ worldwide"}
          {usingCache && " (cached)"}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e75e33" />
          <Text style={styles.loadingText}>Loading earthquake data...</Text>
        </View>
      ) : earthquakes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="checkmark-circle-outline" size={80} color="#66bb6a" />
          <Text style={styles.emptyTitle}>No Earthquakes Found</Text>
          <Text style={styles.emptySubtext}>
            {selectedFilter === "nearby"
              ? "No recent earthquakes in your area"
              : "No earthquakes match your filter"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={earthquakes}
          renderItem={renderEarthquakeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#e75e33"]}
              tintColor="#e75e33"
            />
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Data provided by {usingCache ? "Cache" : "USGS/EMSC"} Earthquake Data
              </Text>
              <Text style={styles.footerSubtext}>
                Tap any earthquake for more details
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// [Keep all your existing styles - they're perfect!]
const styles = StyleSheet.create({
  // ... paste all your existing styles here ...

  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#e75e33",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("2%"),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginLeft: 12,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: wp("4%"),
    paddingVertical: hp("1.5%"),
    gap: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: "#e75e33",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterTextActive: {
    color: "#fff",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5f4",
    paddingHorizontal: wp("4%"),
    paddingVertical: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#49A5A2",
    flex: 1,
  },
  listContainer: {
    padding: wp("4%"),
    paddingBottom: hp("2%"),
  },
  earthquakeCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#e75e33",
  },
  magnitudeBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  magnitudeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  magnitudeLabel: {
    fontSize: 9,
    color: "#fff",
    marginTop: 2,
  },
  earthquakeInfo: {
    flex: 1,
  },
  earthquakePlace: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#666",
  },
  detailTextBold: {
    fontSize: 12,
    color: "#e75e33",
    fontWeight: "600",
  },
  tsunamiWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d32f2f",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
    gap: 4,
  },
  tsunamiText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  alertText: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp("10%"),
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingTop: 30,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  footerSubtext: {
    fontSize: 11,
    color: "#bbb",
    textAlign: "center",
    marginTop: 4,
  },
});