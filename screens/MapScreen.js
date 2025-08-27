// ../screens/MapScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps"; // <-- Add Polyline
import * as Location from "expo-location";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { supabase } from "../services/supabaseClient";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { getUserInfo } from "../services/getinfo";
import MapPinModal from "../components/MapPinModal";
import FloatingButtons from "../components/FloatingButtons";
import { deletePinCompletely } from "../services/deletepins";
// Try importing with explicit names
import {
  castVote,
  getUserVoteStatus,
  getUpdatedPinData,
} from "../services/VotesHandler";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { FontAwesome5 } from "@expo/vector-icons"; // Expo
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Video } from "expo-av";

import { Image } from "react-native";
import { notifyUsers } from '../services/notification';

// Debug: Log the imports immediately
// console.log("=== IMPORT DEBUG ===");
// console.log("castVote import:", castVote);
// console.log("getUserVoteStatus import:", getUserVoteStatus);
// console.log("getUpdatedPinData import:", getUpdatedPinData);
// console.log("===================");

export default function MapScreen({ route }) {
  // Get focusPin from route params
  const focusPin = route?.params?.focusPin;

  const [location, setLocation] = useState(null);
  const [pin, setPin] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [userFirstName, setUserFirstName] = useState(null);
  const [allPins, setAllPins] = useState([]);
  const [descModalVisible, setDescModalVisible] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const [pinModalVisible, setPinModalVisible] = useState(false);

  // PIN INFO MODAL STATES
  const [pinInfoModalVisible, setPinInfoModalVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [userVoteStatus, setUserVoteStatus] = useState({
    hasVoted: false,
    voteType: null,
  });
  const [isVoting, setIsVoting] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]); // <-- Add this state
  const [media, setMedia] = useState(null); // Add this with your other state declarations
  const [showMedia, setShowMedia] = useState(false); // Add this state near your other useState declarations

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const user = await AsyncStorage.getItem("user");
      setUserInfo(user);

      // Fetch firstName from Firestore
      if (user) {
        const info = await getUserInfo(user);
        setUserFirstName(info?.firstName || null);
      }

      try {
        const querySnapshot = await getDocs(collection(db, "pins"));
        const pins = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.latitude && data.longitude) {
            pins.push({
              id: doc.id,
              latitude: data.latitude,
              longitude: data.longitude,
              userId: data.userId,
              userFirstName: data.userFirstName || "anonymous",
              description: data.description,
              category: data.category || "Unknown",
              media: data.media || [],
              createdAt: data.createdAt,
              upvotes: data.upvotes || 0,
              downvotes: data.downvotes || 0,
            });
          }
        });
        setAllPins(pins);
      } catch (error) {
        console.error("Error fetching pins:", error);
      }
    })();
  }, []);

  // Handle focusPin when map is ready and pins are loaded
  useEffect(() => {
    if (focusPin && mapRef.current && allPins.length > 0) {
      // Focus on the specific pin
      setTimeout(() => {
        console.log("Focusing on pin:", focusPin);
        mapRef.current.animateToRegion(
          {
            latitude: focusPin.latitude,
            longitude: focusPin.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          },
          1000
        );

        // Find and show the pin info modal for the focused pin
        const targetPin = allPins.find((pin) => pin.id === focusPin.id);
        if (targetPin) {
          console.log("Found target pin, opening modal:", targetPin);
          setTimeout(() => {
            handlePinMarkerPress(targetPin);
          }, 1500); // Delay to let the map animation complete
        }
      }, 500); // Small delay to ensure map is ready
    }
  }, [focusPin, allPins]);

  const goToMyLocation = () => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000
    );
  };

  const handlePinButton = () => {
    if (userInfo) {
      setPinMode(true);
      Alert.alert("Pin Mode", "Long press on the map to pin a location.");
    } else {
      Alert.alert(
        "Sign in required",
        "You need to sign in to pin a location.",
        [
          { text: "No thanks!", style: "cancel" },
          {
            text: "Sign in",
            onPress: () => navigation.navigate("LoginScreen"),
          },
        ]
      );
    }
  };

  const handleLongPress = (e) => {
    if (pinMode && userInfo) {
      setPendingPin(e.nativeEvent.coordinate);
      setDescModalVisible(true);
    }
  };

  // HANDLE PIN MARKER PRESS
  const handlePinMarkerPress = async (pin) => {
    console.log("Pin marker pressed:", pin.id);
    setSelectedPin(pin);
    setPinInfoModalVisible(true);

    // Get user's vote status for this pin
    if (userInfo) {
      try {
        console.log("Getting vote status for pin:", pin.id, "user:", userInfo);
        console.log(
          "getUserVoteStatus function check:",
          typeof getUserVoteStatus
        );

        if (typeof getUserVoteStatus !== "function") {
          console.error("getUserVoteStatus is not a function!");
          setUserVoteStatus({ hasVoted: false, voteType: null });
          return;
        }

        const voteStatus = await getUserVoteStatus(pin.id, userInfo);
        // console.log('Vote status result:', voteStatus);
        setUserVoteStatus(voteStatus);
      } catch (error) {
        console.error("Error getting vote status:", error);
        setUserVoteStatus({ hasVoted: false, voteType: null });
      }
    } else {
      setUserVoteStatus({ hasVoted: false, voteType: null });
    }
  };

  // CLOSE PIN INFO MODAL
  const closePinInfoModal = () => {
    setPinInfoModalVisible(false);
    setSelectedPin(null);
    setUserVoteStatus({ hasVoted: false, voteType: null });
  };

  // HANDLE VOTING
  const handleVote = async (voteType) => {
    console.log("handleVote called with:", voteType);
    console.log("castVote function check:", typeof castVote);

    if (typeof castVote !== "function") {
      console.error("castVote is not a function:", castVote);
      Alert.alert(
        "Error",
        "Voting function not available. Please restart the app."
      );
      return;
    }

    if (!userInfo) {
      Alert.alert("Sign in required", "You need to sign in to vote.", [
        { text: "No thanks!", style: "cancel" },
        {
          text: "Sign in",
          onPress: () => {
            closePinInfoModal();
            navigation.navigate("LoginScreen");
          },
        },
      ]);
      return;
    }

    if (!selectedPin) {
      console.log("No selected pin");
      return;
    }

    setIsVoting(true);
    // Determine the next voteType for the user
    let nextVoteType;
    if (userVoteStatus.voteType === voteType) {
      // Unvote
      nextVoteType = null;
    } else {
      // New vote or switch
      nextVoteType = voteType;
    }

    // OPTIMISTIC UPDATE
    setAllPins((prevPins) =>
      prevPins.map((pin) => {
        if (pin.id !== selectedPin.id) return pin;

        let upvotes = pin.upvotes || 0;
        let downvotes = pin.downvotes || 0;

        if (userVoteStatus.voteType === "upvote" && voteType === "downvote") {
          upvotes = upvotes - 1;
          downvotes = downvotes + 1;
        } else if (
          userVoteStatus.voteType === "downvote" &&
          voteType === "upvote"
        ) {
          downvotes = downvotes - 1;
          upvotes = upvotes + 1;
        } else if (userVoteStatus.voteType === voteType) {
          // Unvote (toggle off)
          if (voteType === "upvote") upvotes = upvotes - 1;
          if (voteType === "downvote") downvotes = downvotes - 1;
        } else {
          // New vote
          if (voteType === "upvote") upvotes = upvotes + 1;
          if (voteType === "downvote") downvotes = downvotes + 1;
        }

        return {
          ...pin,
          upvotes,
          downvotes,
        };
      })
    );

    setSelectedPin((prev) => {
      if (!prev) return prev;

      let upvotes = prev.upvotes || 0;
      let downvotes = prev.downvotes || 0;

      if (userVoteStatus.voteType === "upvote" && voteType === "downvote") {
        upvotes = upvotes - 1;
        downvotes = downvotes + 1;
      } else if (
        userVoteStatus.voteType === "downvote" &&
        voteType === "upvote"
      ) {
        downvotes = downvotes - 1;
        upvotes = upvotes + 1;
      } else if (userVoteStatus.voteType === voteType) {
        if (voteType === "upvote") upvotes = upvotes - 1;
        if (voteType === "downvote") downvotes = downvotes - 1;
      } else {
        if (voteType === "upvote") upvotes = upvotes + 1;
        if (voteType === "downvote") downvotes = downvotes + 1;
      }

      return {
        ...prev,
        upvotes,
        downvotes,
      };
    });

    // Optimistically update userVoteStatus for instant color feedback
    setUserVoteStatus({
      hasVoted: !!nextVoteType,
      voteType: nextVoteType,
    });
    // --- OPTIMISTIC UPDATE END ---

    try {
      console.log("Calling castVote with:", selectedPin.id, userInfo, voteType);
      await castVote(selectedPin.id, userInfo, voteType, closePinInfoModal);

      // Get updated pin data
      // console.log('Getting updated pin data...');
      // console.log('getUpdatedPinData function check:', typeof getUpdatedPinData);

      if (typeof getUpdatedPinData === "function") {
        const updatedPin = await getUpdatedPinData(selectedPin.id);
        // console.log('Updated pin data:', updatedPin);

        if (updatedPin) {
          // Update selected pin
          setSelectedPin(updatedPin);

          // Update the pin in allPins array
          setAllPins((prevPins) =>
            prevPins.map((pin) =>
              pin.id === selectedPin.id
                ? {
                  ...pin,
                  upvotes: updatedPin.upvotes,
                  downvotes: updatedPin.downvotes,
                }
                : pin
            )
          );
        }
      }

      // Update user vote status
      if (typeof getUserVoteStatus === "function") {
        const newVoteStatus = await getUserVoteStatus(selectedPin.id, userInfo);
        console.log("New vote status:", newVoteStatus);
        setUserVoteStatus(newVoteStatus);
      }
      try {
        const querySnapshot = await getDocs(collection(db, "pins"));
        const pins = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.latitude && data.longitude) {
            pins.push({
              id: doc.id,
              latitude: data.latitude,
              longitude: data.longitude,
              userId: data.userId,
              userFirstName: data.userFirstName || "anonymous",
              description: data.description,
              category: data.category || "Unknown",
              media: data.media || [],
              createdAt: data.createdAt,
              upvotes: data.upvotes || 0,
              downvotes: data.downvotes || 0,
            });
          }
        });
        setAllPins(pins);
      } catch (error) {
        console.error("Error fetching pins:", error);
      }
    } catch (error) {
      console.error("Error voting:", error);
      Alert.alert("Error", "Failed to record vote. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

  // Updated handleSavePin function - Hybrid approach
  const handleSavePin = async () => {
    if (!selectedCategory.trim()) {
      Alert.alert("Category required", "Please select a category.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Description required", "Please enter a description.");
      return;
    }

    try {
      let mediaUrls = [];

      // 1. Upload media files to SUPABASE STORAGE
      if (media && media.length > 0) {
        Alert.alert("Uploading", "Uploading media files...");

        for (let i = 0; i < media.length; i++) {
          const mediaItem = media[i];
          const fileName = `pins/${Date.now()}_${i}_${mediaItem.fileName || 'media'}`;

          try {
            console.log(`Starting upload ${i + 1}/${media.length}:`, mediaItem.uri);

            // Method 1: Try with FormData (recommended for React Native)
            const formData = new FormData();
            formData.append('file', {
              uri: mediaItem.uri,
              type: mediaItem.type,
              name: mediaItem.fileName || `media_${i}.jpg`
            });

            // Upload to Supabase Storage using FormData
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('pin-media')
              .upload(fileName, formData, {
                contentType: mediaItem.type,
                cacheControl: '3600',
                upsert: true // Allow overwriting if file exists
              });

            if (uploadError) {
              console.error('FormData upload failed, trying blob method:', uploadError);

              // Method 2: Fallback to blob method
              try {
                const response = await fetch(mediaItem.uri);
                if (!response.ok) {
                  throw new Error(`Failed to fetch media: ${response.status}`);
                }

                const blob = await response.blob();
                console.log('Blob created, size:', blob.size);

                const { data: blobUploadData, error: blobUploadError } = await supabase.storage
                  .from('pin-media')
                  .upload(fileName, blob, {
                    contentType: mediaItem.type,
                    cacheControl: '3600',
                    upsert: true
                  });

                if (blobUploadError) throw blobUploadError;
                uploadData = blobUploadData;

              } catch (blobError) {
                console.error('Blob upload also failed:', blobError);
                throw new Error(`Both upload methods failed: ${uploadError.message} | ${blobError.message}`);
              }
            }

            // Get public URL from Supabase
            const { data: urlData } = supabase.storage
              .from('pin-media')
              .getPublicUrl(uploadData.path);

            mediaUrls.push({
              url: urlData.publicUrl,
              type: mediaItem.type,
              fileName: mediaItem.fileName,
              path: uploadData.path
            });

            console.log(`Successfully uploaded: ${i + 1}/${media.length}`);

          } catch (uploadError) {
            console.error(`Error uploading media ${i + 1}:`, uploadError);

            // Continue with other uploads instead of failing completely
            Alert.alert(
              "Upload Warning",
              `Failed to upload media file ${i + 1}: ${uploadError.message}. Continuing with other files...`
            );
          }
        }
      }

      // 2. Save pin data (including Supabase URLs) to FIRESTORE
      const pinRef = await addDoc(collection(db, "pins"), {
        latitude: pendingPin.latitude,
        longitude: pendingPin.longitude,
        userId: userInfo || "anonymous",
        userFirstName: userFirstName || "anonymous",
        description: description.trim(),
        category: selectedCategory.trim(),
        media: mediaUrls, // URLs from Supabase Storage
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
      });

      // Send notifications after successful pin creation
      try {
        // Prepare notification content
        const title = `New ${selectedCategory} Location`;
        const message = `${userFirstName || 'Someone'} marked: ${description.trim()}`;

        // Send both in-app and SMS notifications
        const notificationResult = await notifyUsers(
          title,
          message,
          [] // Empty array means send to all users
        );

        if (!notificationResult.inAppSuccess) {
          console.warn('Failed to send in-app notifications');
        }
        if (!notificationResult.smsSuccess) {
          console.warn('Failed to send SMS notifications');
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't throw error here - we still want to complete the pin creation
      }

      // Reset states
      setDescModalVisible(false);
      setDescription("");
      setSelectedCategory("");
      setMedia(null);
      setPinMode(false);
      setPendingPin(null);

      const successMessage = mediaUrls.length > 0
        ? `Your location has been pinned successfully with ${mediaUrls.length} media file(s).`
        : "Your location has been pinned successfully.";

      Alert.alert("Location pinned!", successMessage);

      // 3. Refresh pins from FIRESTORE
      const querySnapshot = await getDocs(collection(db, "pins"));
      const pins = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude) {
          pins.push({
            id: doc.id,
            latitude: data.latitude,
            longitude: data.longitude,
            userId: data.userId,
            userFirstName: data.userFirstName || "anonymous",
            description: data.description,
            category: data.category || "Unknown",
            media: data.media || [],
            createdAt: data.createdAt,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
          });
        }
      });
      setAllPins(pins);

    } catch (error) {
      console.error('Error saving pin:', error);
      Alert.alert(
        "Error",
        `There was an error pinning your location: ${error.message}. Please try again.`
      );
    }
  };

  // --- Add this function inside your component ---
  const fetchRoute = async (startLoc, destLoc) => {
    const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZhZDQ4YmVlNmQ3ODRiMjM5NWQxMDQ4ZTUxMTQ3MTE2IiwiaCI6Im11cm11cjY0In0=";
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${startLoc.longitude},${startLoc.latitude}&end=${destLoc.longitude},${destLoc.latitude}`;

    try {
      const response = await fetch(url);
      const json = await response.json();
      if (
        json &&
        json.features &&
        json.features.length > 0 &&
        json.features[0].geometry &&
        json.features[0].geometry.coordinates
      ) {
        // Convert [lng, lat] to {latitude, longitude}
        const coords = json.features[0].geometry.coordinates.map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setRouteCoords(coords);
      } else {
        Alert.alert("No route found");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to fetch route");
    }
  };

  // --- Polyline decoder ---
  function decodePolyline(encoded) {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  }
  // --- End polyline decoder ---

  if (!location) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#EC6135" />
      </View>
    );
  }

  // Determine initial region based on focusPin or user location
  const getInitialRegion = () => {
    if (focusPin) {
      return {
        latitude: focusPin.latitude,
        longitude: focusPin.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
    }
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };


  const clearRoute = () => {
    setRouteCoords([]);
  };

  const categoryStyles = {
    "Clean Drinking Water": { color: "#2196F3", icon: "tint" },
    "Medical Aid": { color: "#F44336", icon: "hospital" },
    "First Aid Kit": { color: "#FF9800", icon: "briefcase-medical" },
    "Charging Station": { color: "#9C27B0", icon: "charging-station" },
    "Free Wi-Fi Access": { color: "#00BCD4", icon: "wifi" },
    "Clothing Supply": { color: "#795548", icon: "tshirt" },
    "Blankets Supply": { color: "#607D8B", icon: "bed" },
    "Animal Shelter": { color: "#8BC34A", icon: "paw" },
    "Temporary Shelter": { color: "#FF5722", icon: "home" },
    "Rescue Equipment": { color: "#E91E63", icon: "life-ring" },
    "Sanitation Facility": { color: "#009688", icon: "shower" },
    "Portable Toilets": { color: "#3F51B5", icon: "toilet" },
    "Others": { color: "#2c352aff", icon: "list" },
  };
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={getInitialRegion()}
        onLongPress={handleLongPress}
        mapPadding={{ top: 0, right: 0, bottom: 0, left: 0 }}
        mapType="standard"
        zoomControlEnabled={false}     // Hides zoom controls
        mapToolbarEnabled={false}      // Hides toolbar (Android)
        showsCompass={false}           // Hides compass
        showsMyLocationButton={false}  // Hides the default location button
        showsScale={false}             // Hides scale indicator
        showsBuildings={false}         // Hides 3D buildings
        showsTraffic={false}           // Hides traffic indicators
        showsIndoors={false}           // Hides indoor maps
        toolbarEnabled={false}         // Hides toolbar completely
      >
        {/* RENDER ALL PIN MARKERS */}

        {allPins.map((pin) => {
          const categoryKey = (pin.category || "").trim();
          const category = categoryStyles[categoryKey] || categoryStyles["Others"];
          const isFocused = focusPin && pin.id === focusPin.id;

          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              onPress={() => handlePinMarkerPress(pin)}
            >
              <FontAwesome5
                name={category.icon}
                size={27}
                color={isFocused ? "#FF6B35" : category.color}
              />
            </Marker>
          );
        })}

        {/* CURRENT LOCATION MARKER */}
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
        >
          <MaterialIcons name="location-history" size={37} color="#EC6135" />

        </Marker>

        {/* --- Draw the route polyline if available --- */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={7} // Thicker line
            strokeColor="#EC6135" // Orange color
          />
        )}
      </MapView>

      <FloatingButtons
        onClear={clearRoute}
        onPin={handlePinButton}
        onLocate={goToMyLocation}
        hasRoute={routeCoords.length > 0}
      />

      {/* PIN CREATION MODAL WITH CATEGORY */}
      <MapPinModal
        visible={descModalVisible}
        description={description}
        onChangeDescription={setDescription}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onCancel={() => {
          setDescModalVisible(false);
          setDescription("");
          setSelectedCategory("");
          setPendingPin(null);
          setMedia(null); // Clear media when canceling
        }}
        onSave={handleSavePin}
        media={media}     // Add this
        setMedia={setMedia} // Add this
      />

      {/* PIN INFO MODAL WITH VOTING */}
      <Modal
        visible={pinInfoModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closePinInfoModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Fixed Close Button - Always at top right */}
            <TouchableOpacity
              onPress={closePinInfoModal}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            {selectedPin && (
              <>
                {/* Title */}
                <Text style={styles.modalTitle} numberOfLines={0}>
                  {selectedPin.description || "User"}
                </Text>

                {/* Category */}
                <Text style={styles.modalCategory} numberOfLines={0}>
                  {selectedPin.category}
                </Text>

                {/* User */}
                <Text style={styles.modalUser} numberOfLines={0}>
                  {selectedPin.userFirstName}
                </Text>
                <Text style={styles.modalTime}>
                  {getHoursAgo(selectedPin.createdAt)}
                </Text>

                {/* Vote Counts */}
                <View
                  style={[
                    styles.votingContainer,
                    userVoteStatus.voteType === "upvote" &&
                    styles.containerUpvoted,
                    userVoteStatus.voteType === "downvote" &&
                    styles.containerDownvoted,
                  ]}
                >
                  {/* Upvote Button */}
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      userVoteStatus.voteType === "upvote" && styles.activeUpvote,
                    ]}
                    onPress={() => handleVote("upvote")}
                    disabled={isVoting}
                  >
                    <Text
                      style={[
                        styles.arrowText,
                        userVoteStatus.voteType === "upvote" &&
                        styles.activeUpvoteText,
                      ]}
                    >
                      ⇧
                    </Text>
                  </TouchableOpacity>

                  {/* Net Score Display */}
                  <Text
                    style={[
                      styles.scoreText,
                      userVoteStatus.voteType === "upvote" && styles.upvotedScore,
                      userVoteStatus.voteType === "downvote" && styles.downvotedScore,
                    ]}
                  >
                    {(selectedPin.upvotes || 0) - (selectedPin.downvotes || 0)}
                  </Text>

                  {/* Downvote Button */}
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      userVoteStatus.voteType === "downvote" && styles.activeDownvote,
                    ]}
                    onPress={() => handleVote("downvote")}
                    disabled={isVoting}
                  >
                    <Text
                      style={[
                        styles.arrowText,
                        userVoteStatus.voteType === "downvote" && styles.activeDownvoteText,
                      ]}
                    >
                      ⇩
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* New "Go To" button */}
                <View style={{ alignItems: "center", marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => {
                      fetchRoute(
                        location,
                        {
                          latitude: selectedPin.latitude,
                          longitude: selectedPin.longitude,
                        }
                      );
                      setPinInfoModalVisible(false);
                    }}
                  >
                    <MaterialCommunityIcons name="navigation" size={28} color="#1976D2" />
                    <Text style={{ fontSize: 12, color: "#1976D2" }}>Go To</Text>
                  </TouchableOpacity>
                </View>

                {/* Media Preview - New Section */}
                {selectedPin && (
                  <View style={styles.mediaSection}>
                    <TouchableOpacity
                      style={[
                        styles.mediaToggle,
                        (!selectedPin.media || selectedPin.media.length === 0) && styles.mediaToggleDisabled
                      ]}
                      onPress={() => setShowMedia(!showMedia)}
                      disabled={!selectedPin.media || selectedPin.media.length === 0}
                    >
                      <Text style={styles.mediaToggleText}>
                        {!selectedPin.media || selectedPin.media.length === 0
                          ? 'No Media Attached'
                          : showMedia
                            ? 'Hide Media'
                            : `Show Media (${selectedPin.media.length})`
                        }
                      </Text>
                    </TouchableOpacity>

                    {showMedia && selectedPin.media && selectedPin.media.length > 0 && (
                      <View style={styles.mediaContainer}>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.mediaScrollContent}
                          style={styles.mediaScroller}
                        >
                          {selectedPin.media.map((mediaItem, index) => {
                            console.log(`Media ${index}:`, mediaItem.type, mediaItem.url); // Debug log

                            return (
                              <View key={index} style={styles.mediaWrapper}>
                                {mediaItem.type && mediaItem.type.startsWith('image') ? (
                                  // Render Image
                                  <Image
                                    source={{ uri: mediaItem.url }}
                                    style={styles.mediaPreview}
                                    resizeMode="cover"
                                    onError={(e) => {
                                      console.log(`Image ${index} failed to load:`, e.nativeEvent.error);
                                    }}
                                    onLoad={() => {
                                      console.log(`Image ${index} loaded successfully`);
                                    }}
                                  />
                                ) : mediaItem.type && mediaItem.type.startsWith('video') ? (
                                  // Render Video
                                  <Video
                                    source={{ uri: mediaItem.url }}
                                    style={styles.mediaPreview}
                                    useNativeControls={true}
                                    resizeMode="contain"
                                    shouldPlay={false}
                                    isMuted={false}
                                    onError={(error) => {
                                      console.log(`Video ${index} error:`, error);
                                    }}
                                    onPlaybackStatusUpdate={(status) => {
                                      if (status.error) {
                                        console.log(`Video ${index} playback error:`, status.error);
                                      }
                                    }}
                                  />
                                ) : (
                                  // Fallback for unknown media types
                                  <View style={[styles.mediaPreview, styles.mediaError]}>
                                    <FontAwesome5 name="exclamation-triangle" size={20} color="#666" />
                                    <Text style={styles.mediaErrorText}>
                                      Unsupported media type: {mediaItem.type || 'unknown'}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}



              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getHoursAgo(createdAt) {
  if (!createdAt) return "";
  // Firestore timestamp: createdAt.seconds
  const pinTime = createdAt.seconds
    ? createdAt.seconds * 1000
    : new Date(createdAt).getTime();
  const now = Date.now();
  const diffMs = now - pinTime;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours === 0) {
    return "Just now";
  }

  if (diffHours >= 24) {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} Day${diffDays !== 1 ? "s" : ""} ago`;
  }

  return `${diffHours} Hour${diffHours !== 1 ? "s" : ""} ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "85%",
    maxWidth: 400,
    maxHeight: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
  },
  modalCategory: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
    color: "#EC6135",
    fontWeight: "600",
    backgroundColor: "#FFF3F0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalUser: {
    fontSize: 16,
    marginBottom: 4,
    textAlign: "center",
    color: "#666",
  },
  modalTime: {
    fontSize: 13,
    color: "#999",
    marginBottom: 15,
    textAlign: "center",
  },
  modalVotes: {
    fontSize: 16,
    textAlign: "center",
    color: "#888",
  },
  focusedPinBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  focusedPinText: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "600",
  },
  votesContainer: {
    marginBottom: 20,
  },

  votingButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 20,
  },
  voteButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    marginHorizontal: 10,
    minWidth: 100,
  },
  upvoteButton: {
    borderColor: "#4CAF50",
    backgroundColor: "transparent",
  },
  downvoteButton: {
    borderColor: "#F44336",
    backgroundColor: "transparent",
  },
  activeVoteButton: {
    opacity: 0.8,
  },
  voteButtonText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  activeVoteButtonText: {
    fontWeight: "bold",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },

  votingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: 0,
    minWidth: 120,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "transparent",
    borderColor: "rgba(14, 14, 14, 0.3)",
  },
  containerUpvoted: {
    backgroundColor: "rgba(255, 139, 96, 0.15)", // Transparent orange
    borderColor: "rgba(255, 139, 96, 0.3)",
  },
  containerDownvoted: {
    backgroundColor: "rgba(148, 148, 255, 0.15)", // Transparent blue
    borderColor: "rgba(148, 148, 255, 0.3)",
  },
  voteButton: {
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 90,
    marginHorizontal: 0,
    paddingBottom: 5,
  },
  activeUpvote: {
    backgroundColor: "#FF8B60", // Reddit's upvote orange
  },
  activeDownvote: {
    backgroundColor: "#9494FF", // Reddit's downvote blue
  },
  arrowText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#878A8C", // Default gray
  },
  activeUpvoteText: {
    color: "#FFFFFF",
  },
  activeDownvoteText: {
    color: "#FFFFFF",
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1B", // Default dark text
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: "center",
  },
  upvotedScore: {
    color: "#FF8B60", // Orange when upvoted
  },
  downvotedScore: {
    color: "#9494FF", // Blue when downvoted
  },
  mediaContainer: {
    width: "100%",
    maxHeight: 200,
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  mediaScroller: {
    paddingVertical: 10,
  },
  mediaWrapper: {
    width: 120,
    height: 120,
    borderRadius: 10,
    overflow: "hidden",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
 mediaError: {
  color: '#666',
  textAlign: 'center',
  padding: 10,
},
mediaPreview: {
  width: '100%',
  height: '100%',
  backgroundColor: '#f0f0f0',
},
  // Add to your existing styles
  mediaSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 15,
  },
  mediaToggle: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  mediaToggleText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  mediaContainer: {
    width: '100%',
  },
  mediaScroller: {
    width: '100%',
  },
  mediaScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  mediaWrapper: {
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    width: 250,  // Made larger
    height: 250, // Made larger
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  mediaToggleDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.7,
  },
});