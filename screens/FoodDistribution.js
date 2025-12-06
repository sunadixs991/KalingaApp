import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { supabase } from "../services/supabaseClient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import NetInfo from "@react-native-community/netinfo";
import Toast from "react-native-toast-message";

// Cache configuration
const SCHEDULES_CACHE_KEY = "food_schedules_cache_v1";
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

export default function FoodDistribution({ navigation, route }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [schedulesList, setSchedulesList] = useState([]);
  const [filteredSchedules, setFilteredSchedules] = useState([]);
  const [selectedFileUrl, setSelectedFileUrl] = useState(null);
  const [fileViewerVisible, setFileViewerVisible] = useState(false);
  const [excelContent, setExcelContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [username, setUsername] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Get highlighted schedule from notification (if any)
  const highlightScheduleId = route?.params?.highlightSchedule;

  // Cache functions
  const saveSchedulesToCache = async (schedules, userLoc) => {
    try {
      const cacheData = {
        schedules,
        userLocation: userLoc,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(SCHEDULES_CACHE_KEY, JSON.stringify(cacheData));
      console.log('✅ Schedules cached successfully');
    } catch (error) {
      console.warn('Failed to cache schedules:', error);
    }
  };

  const loadSchedulesFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(SCHEDULES_CACHE_KEY);
      if (!cached) return null;

      const { schedules, userLocation, timestamp } = JSON.parse(cached);

      // Check if cache is expired
      if (Date.now() - timestamp > CACHE_EXPIRY_TIME) {
        console.log('⏰ Cache expired');
        return null;
      }

      console.log('✅ Loaded schedules from cache');
      return { schedules, userLocation };
    } catch (error) {
      console.warn('Failed to load cache:', error);
      return null;
    }
  };

  const clearSchedulesCache = async () => {
    try {
      await AsyncStorage.removeItem(SCHEDULES_CACHE_KEY);
      console.log('🗑️ Cache cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  };

  useEffect(() => {
    initializeUser();

    // Monitor network status
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
      
      // When network returns, refresh schedules
      if (state.isConnected && username && userLocation) {
        fetchSchedules(userLocation, false);
      }
    });

    return () => unsubscribe();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (username && userLocation) {
        fetchSchedules(userLocation, false);
      }
    }, [username, userLocation])
  );

  const initializeUser = async () => {
    setLoading(true);
    try {
      // Get username from AsyncStorage
      const storedUsername = await AsyncStorage.getItem("user");
      
      if (!storedUsername) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setUsername(storedUsername);
      setIsLoggedIn(true);

      // Get user's barangay and purok from Firestore
      const userLocationData = await getUserLocation(storedUsername);
      
      if (userLocationData) {
        setUserLocation(userLocationData);

        // Try to load from cache first
        const cached = await loadSchedulesFromCache();
        
        if (cached && 
            cached.userLocation.barangay === userLocationData.barangay &&
            cached.userLocation.purok === userLocationData.purok) {
          // Use cached data
          const filtered = cached.schedules.filter(
            (schedule) =>
              schedule.title?.toLowerCase() === userLocationData.barangay?.toLowerCase() &&
              schedule.purok?.toLowerCase() === userLocationData.purok?.toLowerCase()
          );
          setSchedulesList(cached.schedules);
          setFilteredSchedules(filtered);
          setLoading(false);

          // Fetch fresh data in background
          fetchSchedules(userLocationData, true);
        } else {
          // No cache or location changed, fetch fresh
          await fetchSchedules(userLocationData, false);
        }
      } else {
        setLoading(false);
        Alert.alert(
          "Location Not Set",
          "Please update your barangay and purok in your profile to view schedules."
        );
      }
    } catch (error) {
      console.error("Error initializing user:", error);
      setIsLoggedIn(false);
      setLoading(false);
    }
  };

  const getUserLocation = async (username) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const userData = snapshot.docs[0].data();
      return {
        barangay: userData.barangay || null,
        purok: userData.purok || null,
      };
    } catch (error) {
      console.error("Error getting user location:", error);
      return null;
    }
  };

  const fetchSchedules = async (location = userLocation, isBackgroundFetch = false) => {
    if (!isBackgroundFetch) {
      setLoading(true);
    }

    try {
      if (!location || !location.barangay || !location.purok) {
        setFilteredSchedules([]);
        setLoading(false);
        return;
      }

      // Check network connectivity
      const netState = await NetInfo.fetch();
      
      if (!netState.isConnected) {
        // Offline - try to load from cache
        const cached = await loadSchedulesFromCache();
        
        if (cached) {
          const filtered = cached.schedules.filter(
            (schedule) =>
              schedule.title?.toLowerCase() === location.barangay?.toLowerCase() &&
              schedule.purok?.toLowerCase() === location.purok?.toLowerCase()
          );
          setSchedulesList(cached.schedules);
          setFilteredSchedules(filtered);

          Toast.show({
            type: 'info',
            text1: 'Offline Mode',
            text2: 'Showing cached schedules',
            visibilityTime: 3000,
          });
        } else {
          Toast.show({
            type: 'warning',
            text1: 'No Connection',
            text2: 'Unable to load schedules offline',
            visibilityTime: 3000,
          });
          setFilteredSchedules([]);
        }
        
        setLoading(false);
        return;
      }

      // Online - fetch from Supabase
      const { data, error } = await supabase
        .from("food_schedules")
        .select("*")
        .order("date", { ascending: true });

      if (error) throw error;

      // Map schedules
      const allSchedules = data.map((item) => ({
        id: item.id,
        title: item.title,
        date: new Date(item.date).toLocaleDateString(),
        time: item.time,
        location: item.location,
        purok: item.purok,
        fileUrl: item.file_url,
        fileName: item.file_name,
        createdAt: item.created_at,
      }));

      // Filter schedules matching user's barangay and purok
      const filtered = allSchedules.filter(
        (schedule) =>
          schedule.title?.toLowerCase() === location.barangay?.toLowerCase() &&
          schedule.purok?.toLowerCase() === location.purok?.toLowerCase()
      );

      setSchedulesList(allSchedules);
      setFilteredSchedules(filtered);

      // Save to cache
      await saveSchedulesToCache(allSchedules, location);

      if (!isBackgroundFetch) {
        console.log('✅ Schedules loaded from network');
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
      
      // Try to load from cache on error
      const cached = await loadSchedulesFromCache();
      if (cached) {
        const filtered = cached.schedules.filter(
          (schedule) =>
            schedule.title?.toLowerCase() === location.barangay?.toLowerCase() &&
            schedule.purok?.toLowerCase() === location.purok?.toLowerCase()
        );
        setSchedulesList(cached.schedules);
        setFilteredSchedules(filtered);

        Toast.show({
          type: 'info',
          text1: 'Using Cached Data',
          text2: 'Could not fetch latest schedules',
          visibilityTime: 3000,
        });
      } else {
        Alert.alert("Error", "Failed to load schedules");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (!isOnline) {
      Toast.show({
        type: 'warning',
        text1: 'Offline',
        text2: 'Cannot refresh while offline',
        visibilityTime: 2000,
      });
      return;
    }

    setRefreshing(true);
    await fetchSchedules(userLocation, false);
  };

  const parseExcelFile = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const XLSX = require("xlsx");
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        setExcelContent(jsonData);
      };

      reader.readAsArrayBuffer(blob);
    } catch (error) {
      console.error("Error parsing Excel:", error);
      Alert.alert("Error", "Failed to read Excel file");
    }
  };

  const renderLoginPrompt = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.iconCircle}>
        <Icon name="person-outline" size={60} color="#e75e33" />
      </View>
      <Text style={styles.emptyTitle}>Sign In Required</Text>
      <Text style={styles.emptySubtext}>
        Please sign in to view food distribution schedules for your area
      </Text>
      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => navigation.navigate("LoginScreen")}
      >
        <Icon name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoLocationPrompt = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.iconCircle}>
        <Icon name="location-outline" size={60} color="#e75e33" />
      </View>
      <Text style={styles.emptyTitle}>Location Not Set</Text>
      <Text style={styles.emptySubtext}>
        Please update your barangay and purok in your profile to view schedules
      </Text>
      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => navigation.navigate("AccountInfoScreen")}
      >
        <Icon name="settings-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.signInButtonText}>Update Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNoSchedules = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.iconCircle}>
        <Icon name="calendar-outline" size={60} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>No Schedules Available</Text>
      <Text style={styles.emptySubtext}>
        There are currently no food distribution schedules for{"\n"}
        <Text style={styles.locationHighlight}>
          {userLocation?.barangay}, {userLocation?.purok}
        </Text>
      </Text>
      <Text style={styles.checkBackText}>Check back later for updates</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Food Distribution Schedules</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e75e33" />
          <Text style={styles.loadingText}>Loading schedules...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Food Distribution Schedules</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.container}>
        {!isLoggedIn ? (
          renderLoginPrompt()
        ) : !userLocation || !userLocation.barangay || !userLocation.purok ? (
          renderNoLocationPrompt()
        ) : filteredSchedules.length === 0 ? (
          renderNoSchedules()
        ) : (
          <>
            <View style={styles.locationBanner}>
              <Icon name="location" size={20} color="#e75e33" />
              <Text style={styles.locationText}>
                Showing schedules for {userLocation.barangay}, {userLocation.purok}
              </Text>
              {!isOnline && (
                <View style={styles.offlineBadge}>
                  <Icon name="cloud-offline" size={14} color="#666" />
                  <Text style={styles.offlineBadgeText}>Offline</Text>
                </View>
              )}
            </View>

            <FlatList
              data={filteredSchedules}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 16 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={["#e75e33"]}
                  tintColor="#e75e33"
                />
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.cardRow,
                    highlightScheduleId === item.id && styles.highlightedCard,
                  ]}
                >
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardText}>📅 {item.date}</Text>
                    <Text style={styles.cardText}>⏰ {item.time}</Text>
                    <Text style={styles.cardText}>📍 {item.location}</Text>
                    {item.purok && (
                      <Text style={styles.cardText}>🏘️ Purok: {item.purok}</Text>
                    )}
                    {item.fileUrl && (
                      <TouchableOpacity
                        style={styles.fileLink}
                        onPress={() => {
                          setSelectedFileUrl(item.fileUrl);
                          setFileViewerVisible(true);
                          parseExcelFile(item.fileUrl);
                        }}
                      >
                        <Icon name="document-text" size={16} color="#e75e33" />
                        <Text style={styles.fileLinkText}>View List of Names</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            />
          </>
        )}

        {fileViewerVisible && selectedFileUrl && (
          <Modal
            animationType="fade"
            transparent={true}
            visible={fileViewerVisible}
            onRequestClose={() => setFileViewerVisible(false)}
          >
            <View style={styles.fileViewerModal}>
              <View style={styles.fileViewerHeader}>
                <Text style={styles.fileViewerTitle}>Beneficiaries List</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFileViewerVisible(false);
                    setExcelContent(null);
                  }}
                >
                  <Icon name="close-outline" size={28} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.excelContainer}>
                {excelContent ? (
                  <ScrollView style={styles.excelContent}>
                    {excelContent.map((row, rowIndex) => (
                      <View
                        key={rowIndex}
                        style={[
                          styles.excelRow,
                          rowIndex === 0 && styles.headerRow,
                        ]}
                      >
                        {row.map((cell, cellIndex) => (
                          <Text
                            key={`${rowIndex}-${cellIndex}`}
                            style={[
                              styles.excelCell,
                              rowIndex === 0 && styles.excelHeader,
                              cellIndex === 0 && styles.firstColumn,
                            ]}
                          >
                            {cell}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#e75e33" />
                    <Text style={styles.loadingText}>Loading list...</Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
    marginRight: 6,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
  },
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff9f8",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#e75e33",
  },
  locationText: {
    fontSize: 14,
    color: "#333",
    marginLeft: 8,
    fontWeight: "500",
    flex: 1,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  offlineBadgeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    borderWidth: 0.5,
    borderColor: "#d9d9d9",
    justifyContent: "space-between",
  },
  highlightedCard: {
    borderColor: "#e75e33",
    borderWidth: 2,
    backgroundColor: "#fff9f8",
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  fileLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  fileLinkText: {
    color: "#3378e7",
    marginLeft: 4,
    textDecorationLine: "underline",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff9f8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#ffe8e5",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  locationHighlight: {
    fontWeight: "600",
    color: "#e75e33",
  },
  checkBackText: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
    fontStyle: "italic",
  },
  signInButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e75e33",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginTop: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  fileViewerModal: {
    flex: 1,
    backgroundColor: "#fff",
    marginTop: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  fileViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#e75e33",
    elevation: 2,
  },
  fileViewerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  excelContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  excelContent: {
    flex: 1,
  },
  excelRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  excelCell: {
    flex: 1,
    fontSize: 15,
    color: "#444",
    paddingHorizontal: 8,
  },
  excelHeader: {
    fontWeight: "600",
    color: "#e75e33",
  },
  headerRow: {
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  firstColumn: {
    minWidth: 50,
  },
});