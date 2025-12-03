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

// Import functions individually to test
import { fetchNearbyPins } from "../services/PinService";
import boyProfile from "../assets/boy.png";
import womanProfile from "../assets/woman.png";
import userProfile from "../assets/user.png";
import adminProfile from "../assets/admin.png";
import Toast from 'react-native-toast-message';



const { width } = Dimensions.get("window");

// Cache key prefix (bump version if cache format changes)
const NEARBY_CACHE_PREFIX = "nearby_pins_cache_v1";
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
  const [notificationModalVisible, setNotificationModalVisible] =
    useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  // const colors = {
  //   background: isDarkMode ? "#121212" : "#fff",
  //   cardBg: isDarkMode ? "#1e1e1e" : "#fff",
  //   textPrimary: isDarkMode ? "#fff" : "#000",
  //   textSecondary: isDarkMode ? "#ccc" : "#666",
  //   placeholder: isDarkMode ? "#888" : "#999",
  //   accent: "#e75e33",
  //   highlight: "#49A5A2",
  // };

  // Test the import
  // useEffect(() => {
  //   console.log("fetchNearbyPins function:", fetchNearbyPins);
  //   console.log("typeof fetchNearbyPins:", typeof fetchNearbyPins);
  // }, []);

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
  // Replace your existing location useEffect (lines 155-180) with this:

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
          text2: "Please enable your device’s location services and try again.",
        });
      }
    })();
  }, []);

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
      const pins = await fetchNearbyPins(currentLocation, 50, 10); // 50km radius, max 10 pins
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
      }
    });
    return () => unsub();
  }, [currentLocation]);

  // Replace your handleRefresh function with this:

  const handleRefresh = async () => {
    setRefreshing(true);

    // Try to get location again if we don't have it
    if (!currentLocation || locationMessage) {
      try {
        // Check permission status first
        let { status } = await Location.getForegroundPermissionsAsync();

        // If permission not granted, request it again
        if (status !== "granted") {
          const permissionResult = await Location.requestForegroundPermissionsAsync();
          if (permissionResult.status !== "granted") {
            setLocationMessage("📍 Enable location to see nearby resources");
            setRefreshing(false);
            return;
          }
        }

        // Get location
        let loc = await Location.getCurrentPositionAsync({});
        setCurrentLocation(loc.coords);
        setLocationMessage(""); // Clear error message

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
        setLocationMessage("Location is turned off — please enable location services in Settings.");
        console.warn("Location refresh error:", error);
      }
    }

    // Fetch nearby pins if we have location
    if (currentLocation) {
      await fetchNearbyPinsData();
    }

    setRefreshing(false);
  };

  const handlePinPress = (pin) => {
    setSelectedPin(pin);
    setPinModalVisible(true);
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
            onPress={() => setNotificationModalVisible(true)}
          >
            <Icon name="notifications-outline" size={24} color="#000" />
            {/* Red Badge for new notifications */}
            <View style={styles.notificationBadge} />
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
                marginHorizontal: 5, // more spacing between dots
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
                elevation: 2,
              }}
              activeDotStyle={{
                backgroundColor: "#e75e33",
                width: 8, // slightly bigger
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
                bottom: 5, // moves dots a bit above the bottom edge
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
    // paddingTop: hp("2%"),
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
    backgroundColor: "#fff", // matches bubble
    padding: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  // notificationBadge: {
  //   position: "absolute",
  //   top: 8,
  //   right: 7,
  //   width: 7,
  //   height: 7,
  //   borderRadius: 5,
  //   backgroundColor: "red",
  // },
  bubbleOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 48, // push down under top bar
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
    borderBottomColor: "#fff", // same as bubble background
    marginRight: 20, // adjust so it lines up under bell icon
    marginBottom: -2, // overlap slightly with bubbleContainer
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
    height: hp("20%"), // adjust height as needed
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // ✅ ensures the whole image is visible
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: hp("2%"),
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
  },
  searchIcon: {
    padding: 6,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginLeft: 4,
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

  placeholder: {
    backgroundColor: "#e1e1e1",
  },
  // Nearby Resources Styles
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
});
