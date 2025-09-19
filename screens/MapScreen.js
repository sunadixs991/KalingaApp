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
  TextInput
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps"; // <-- Add Polyline
import * as Location from "expo-location";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { db } from "../firebase";
import { supabase } from "../services/supabaseClient";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  updateDoc,
  deleteField
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
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FontAwesome5 } from "@expo/vector-icons"; // Expo
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
// import { Video } from "expo-av";
import { WebView } from "react-native-webview";

import { Image } from "react-native";
import EvacuationPinModal from "../components/EvacuationPinModal"; // <-- Import your new modal
import useEvacuationPins from "../hooks/useEvacuationPins";
import getMapHtml from "../utils/getMapHtml";
import MedicalPinModal from "../components/MedicalPinModal";
import { handleSaveEvacPin, handleSavePin, handleSaveMedicalPin } from "../utils/pinHandlers";

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
  const [categoryStyles, setCategoryStyles] = useState({});
  const mapRef = useRef(null);
  const webviewRef = useRef(null);
  // keep a ref to pinMode to avoid stale closures in WebView onMessage handler
  const pinModeRef = useRef(pinMode);
  const [evacPinMode, setEvacPinMode] = useState(false);
  const [evacPins, setEvacPins] = useState([]);
  const [evacCategoryStyles, setEvacCategoryStyles] = useState({});
  const [openTime, setOpenTime] = useState("");
  const [medicalModalVisible, setMedicalModalVisible] = useState(false);
  const [medicalDescription, setMedicalDescription] = useState("");
  const [medicalSelectedCategory, setMedicalSelectedCategory] = useState("Medical Support");
  const [medicalMedia, setMedicalMedia] = useState(null);
  const [medicalOpenTime, setMedicalOpenTime] = useState("");
  const [pendingMedicalPin, setPendingMedicalPin] = useState(null);
  const [medicalPinMode, setMedicalPinMode] = useState(false);
  const [medicalPins, setMedicalPins] = useState([]);


  useEffect(() => {
    pinModeRef.current = pinMode;
    // inform WebView when pinMode changes (keeps hint & behavior in sync)
    if (webviewRef.current) {
      try {
        webviewRef.current.postMessage(
          JSON.stringify({ type: "setPinMode", enabled: !!pinMode })
        );
      } catch (e) {
        console.log("Failed to post setPinMode to WebView", e);
      }
    }
  }, [pinMode]);



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
  const [isAdmin, setIsAdmin] = useState(false);
  const [evacModalVisible, setEvacModalVisible] = useState(false);
  const [evacDescription, setEvacDescription] = useState("");
  const [evacSelectedCategory, setEvacSelectedCategory] = useState("");
  const [evacMedia, setEvacMedia] = useState(null);
  const [evacCapacity, setEvacCapacity] = useState("");
  const [evacContactPerson, setEvacContactPerson] = useState("");
  const [pendingEvacPin, setPendingEvacPin] = useState(null);
  const [voteMessageModalVisible, setVoteMessageModalVisible] = useState(false);
  const [pendingVoteType, setPendingVoteType] = useState(null);
  const [voteMessage, setVoteMessage] = useState("");
  const [pinTypeModalVisible, setPinTypeModalVisible] = useState(false); // <-- New state

  const isFocused = useIsFocused();

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

  // Check admin status on mount (or use your own logic)
  useEffect(() => {
    (async () => {
      // Example: check AsyncStorage for admin flag
      const userInfoStr = await AsyncStorage.getItem("userInfo");
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          setIsAdmin(userInfo?.isAdmin === true);
        } catch (e) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    })();
  }, []);

  // Fetch evacuation categories on mount
  useEffect(() => {
    const fetchEvacCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "evacuation_categories"));
        const styles = {};
        snap.forEach(doc => {
          const data = doc.data();
          if (data.name) {
            // Lowercase and trim the key for consistency
            styles[data.name.trim().toLowerCase()] = {
              color: data.color || "#1976D2",
              icon: data.icon || "home",
            };
          }
        });
        styles["others"] = styles["others"] || { color: "#1976D2", icon: "home" };
        setEvacCategoryStyles(styles);
      } catch (error) {
        setEvacCategoryStyles({
          "others": { color: "#1976D2", icon: "home" }
        });
      }
    };
    fetchEvacCategories();
  }, []);
  // Fetch categories on focus
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "categories"));
        const styles = {};
        snap.forEach(doc => {
          const data = doc.data();
          if (data.name) {
            styles[data.name.trim()] = {
              color: data.color || "#2c352a",
              icon: data.icon || "list",
            };
          }
        });
        // Always include Others fallback
        styles["Others"] = styles["Others"] || { color: "#2c352a", icon: "list" };
        setCategoryStyles(styles);
      } catch (error) {
        setCategoryStyles({
          "Others": { color: "#2c352a", icon: "list" }
        });
      }
    };
    fetchCategories();
  }, [isFocused]);

  // Fetch evacuation pins on mount
  useEffect(() => {
    const fetchEvacPins = async () => {
      try {
        const snap = await getDocs(collection(db, "evacuation_pins"));
        const pins = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.latitude && data.longitude) {
            pins.push({
              id: doc.id,
              latitude: data.latitude,
              longitude: data.longitude,
              userId: data.userId,
              userFirstName: data.userFirstName || "anonymous",
              description: data.description,
              category: data.category || "Evacuation",
              media: data.media || [],
              createdAt: data.createdAt,
              capacity: data.capacity || "",
              contactPerson: data.contactPerson || "",
            });
          }
        });
        setEvacPins(pins);
      } catch (error) {
        setEvacPins([]);
      }
    };
    fetchEvacPins();
  }, []);


  useEffect(() => {
    const fetchMedicalPins = async () => {
      try {
        const snap = await getDocs(collection(db, "medical_pins"));
        const pins = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.latitude && data.longitude) {
            pins.push({
              id: doc.id,
              latitude: data.latitude,
              longitude: data.longitude,
              userId: data.userId,
              userFirstName: data.userFirstName || "anonymous",
              description: data.description,
              category: data.category || "Medical Support",
              media: data.media || [],
              createdAt: data.createdAt,
              openTime: data.openTime || "",
              barangay: data.barangay || "",
            });
          }
        });
        setMedicalPins(pins); // You need: const [medicalPins, setMedicalPins] = useState([]);
      } catch (error) {
        setMedicalPins([]);
      }
    };
    fetchMedicalPins();
  }, []);


  // Handle focusPin when map is ready and pins are loaded
  useEffect(() => {
    if (focusPin && webviewRef.current && allPins.length > 0) {
      setTimeout(() => {
        webviewRef.current.postMessage(
          JSON.stringify({
            type: "flyTo",
            latitude: focusPin.latitude,
            longitude: focusPin.longitude,
            zoom: 16,
          })
        );
        const targetPin = allPins.find((p) => p.id === focusPin.id);
        if (targetPin) setTimeout(() => handlePinMarkerPress(targetPin), 1200);
      }, 500);
    }
  }, [focusPin, allPins]);

  const goToMyLocation = () => {
    if (!location || !webviewRef.current) return;
    webviewRef.current.postMessage(
      JSON.stringify({
        type: "flyTo",
        latitude: location.latitude,
        longitude: location.longitude,
        zoom: 16,
      })
    );
  };

  const handlePinButton = () => {
    setEvacPinMode(false); // Make sure evacuation mode is off
    if (userInfo) {
      setPinMode(true);
      if (webviewRef.current) {
        webviewRef.current.postMessage(
          JSON.stringify({ type: "setPinMode", enabled: true })
        );
      }
      Alert.alert(
        "Pin Mode",
        "Tap or long-press on the map to pin a location. Tap Cancel to exit pin mode."
      );
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


  const handleMedicalPinButton = () => {
    setEvacPinMode(false); // Make sure evacuation mode is off
    if (userInfo) {
      setPinMode(true);
      if (webviewRef.current) {
        webviewRef.current.postMessage(
          JSON.stringify({ type: "setPinMode", enabled: true })
        );
      }
      Alert.alert(
        "Medical Support Pin Mode",
        "Tap or long-press on the map to place a medical support pin. Tap Cancel to exit pin mode."
      );
      // Set a state to indicate medical pin mode, then show your MedicalPinModal when pin is placed
      setMedicalPinMode(true); // You need to declare this state: const [medicalPinMode, setMedicalPinMode] = useState(false);
    } else {
      Alert.alert(
        "Sign in required",
        "You need to sign in to add a medical support pin.",
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

  const handleEvacPinButton = () => {
    setEvacPinMode(true); // Set evacuation mode ON
    if (userInfo) {
      setPinMode(true);
      if (webviewRef.current) {
        webviewRef.current.postMessage(
          JSON.stringify({ type: "setPinMode", enabled: true })
        );
      }
      Alert.alert(
        "Evacuation Pin Mode",
        "Tap or long-press on the map to place an evacuation pin. Tap Cancel to exit pin mode."
      );
    } else {
      Alert.alert(
        "Sign in required",
        "You need to sign in to add an evacuation pin.",
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
  const handleVote = async (voteType, voteMessage = "") => {
    // ...existing code...
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
      console.log("Calling castVote with:", selectedPin.id, userInfo, voteType, voteMessage);
      await castVote(selectedPin.id, userInfo, voteType, voteMessage, closePinInfoModal);

      // Save vote to top-level votes collection (not subcollection)
      if (selectedPin && userInfo) {
        // Use a composite key for the document ID (e.g. `${pinId}_${userId}`)
        const voteDocId = `${selectedPin.id}_${userInfo}`;
        await setDoc(
          doc(db, "votes", voteDocId),
          {
            pinId: selectedPin.id,
            userId: userInfo,
            userFirstName: userFirstName || "",
            userLastName: (typeof getUserInfo === "function" && userInfo)
              ? (await getUserInfo(userInfo))?.lastName || ""
              : "",
            voteType,
            voteMessage: voteMessage ? voteMessage.trim() : "",
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log("Vote document updated in votes collection:", {
          pinId: selectedPin.id,
          userId: userInfo,
          userFirstName: userFirstName || "",
          userLastName: (typeof getUserInfo === "function" && userInfo)
            ? (await getUserInfo(userInfo))?.lastName || ""
            : "",
          voteType,
          voteMessage: voteMessage ? voteMessage.trim() : "",
        });
      }

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


  // --- Add this function inside your component ---
  const fetchRoute = async (startLoc, destLoc) => {
    const apiKey =
      "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImZhZDQ4YmVlNmQ3ODRiMjM5NWQxMDQ4ZTUxMTQ3MTE2IiwiaCI6Im11cm11cjY0In0=";
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
        const coords = json.features[0].geometry.coordinates.map(
          ([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
          })
        );
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
    let index = 0,
      len = encoded.length;
    let lat = 0,
      lng = 0;

    while (index < len) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = result & 1 ? ~(result >> 1) : result >> 1;
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

  const evacPinsWithIcons = (evacPins || []).map((p) => {
    const categoryKey = (p.category || "Evacuation Center").trim().toLowerCase();
    const category =
      evacCategoryStyles[categoryKey] ||
      evacCategoryStyles["others"] || // fallback if category missing
      { color: "#1976D2", icon: "home" }; // final fallback

    return {
      ...p,
      iconClass: `fas fa-${category.icon}`,
      color: category.color,
      size: 46,
      isEvacuation: true,
    };
  });


  // Add this handler
  const handleAddPinButton = () => {
    setPinTypeModalVisible(true);
  };


  const pinsWithIcons = (allPins || []).map((p) => {
    const categoryKey = (p.category || "Others").trim();
    const category =
      categoryStyles[categoryKey] ||
      categoryStyles["Others"] || // fallback if category missing
      { color: "#2c352a", icon: "list" }; // final fallback
    return {
      ...p,
      iconClass: `fas fa-${category.icon}`,
      color: category.color,
    };
  });

  const medicalPinsWithIcons = (medicalPins || []).map((p) => {
    const categoryKey = (p.category || "Medical Support").trim().toLowerCase();
    const category =
      evacCategoryStyles[categoryKey] ||
      evacCategoryStyles["others"] ||
      { color: "#43a047", icon: "medkit" }; // final fallback

    return {
      ...p,
      iconClass: `fas fa-${category.icon}`,
      color: category.color,
      size: 46, // Make medical pins bigger if you want
      isMedical: true,
    };
  });

  // Add current location as a special pin so the WebView map shows it
  let allPinsForMap = [...pinsWithIcons, ...evacPinsWithIcons, ...medicalPinsWithIcons];
  if (location) {
    allPinsForMap = [
      {
        id: "__current_location",
        latitude: location.latitude,
        longitude: location.longitude,
        iconClass: "fas fa-map-marker-alt",
        color: "#EC6135",
        size: 36,
      },
      ...allPinsForMap,
    ];
  }



  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={["*"]}
        source={{
          html: getMapHtml(
            allPinsForMap,
            location || { latitude: 0, longitude: 0 },
            routeCoords
          ),
        }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);

            // Only create pin on long-press or mapPin and when pinMode active
            if (msg.type === "mapLongPress" || msg.type === "mapPin") {
              // use ref to avoid stale closure
              if (!pinModeRef.current) {
                console.log("Pin mode not active — ignoring pin event");
                return;
              }
              if (!userInfo) {
                Alert.alert(
                  "Sign in required",
                  "You need to sign in to pin a location.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Sign in",
                      onPress: () => navigation.navigate("LoginScreen"),
                    },
                  ]
                );
                return;
              }
              // If admin and evacuation pin mode, open evacuation modal
              if (evacPinMode) {
                setPendingEvacPin({ latitude: msg.latitude, longitude: msg.longitude });
                setEvacModalVisible(true);
                return;
              } else if (medicalPinMode) {
                setPendingMedicalPin({ latitude: msg.latitude, longitude: msg.longitude });
                setMedicalModalVisible(true); // <-- This opens MedicalPinModal
                return;
              } else {
                setPendingPin({ latitude: msg.latitude, longitude: msg.longitude });
                setDescModalVisible(true);
                return;
              }
            }

            // Handle marker clicks
            if (msg.type === "markerClick") {
              if (msg.id === "__current_location") return;
              // Try to find in regular pins first
              let pin = allPins.find((p) => p.id === msg.id);
              // If not found, try evacuation pins
              if (!pin) {
                pin = evacPins.find((p) => p.id === msg.id);
              }
              // If not found, try medical pins
              if (!pin) {
                pin = medicalPins.find((p) => p.id === msg.id);
              }
              // If found, show details modal
              if (pin) handlePinMarkerPress(pin);
            }
          } catch (e) {
            console.log("WebView message parse error", e);
          }
        }}
      />

      <FloatingButtons
        onClear={clearRoute}
        onPin={handlePinButton}
        onLocate={goToMyLocation}
        hasRoute={routeCoords.length > 0}
        onAdd={isAdmin && userInfo ? handleAddPinButton : undefined}
        isAdmin={isAdmin && !!userInfo}
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
          setMedia(null);
          setPinMode(false);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setPinMode", enabled: false })
            );
          }
        }}
        onSave={async () => {
          await handleSavePin({
            selectedCategory,
            description,
            media,
            pendingPin,
            userInfo,
            userFirstName,
            db,
            supabase,
            setDescModalVisible,
            setDescription,
            setSelectedCategory,
            setMedia,
            setPinMode,
            setPendingPin,
            setAllPins,
            Alert,
            getDocs,
            collection,
            addDoc,
            serverTimestamp,
            getBarangayFromCoords,
          });
          setPinMode(false);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setPinMode", enabled: false })
            );
          }
        }}
        media={media}
        setMedia={setMedia}
      />

      {/* EVACUATION PIN MODAL */}
      <EvacuationPinModal
        visible={evacModalVisible}
        openTime={openTime}
        onChangeOpenTime={setOpenTime}
        description={evacDescription}
        onChangeDescription={setEvacDescription}
        onCancel={() => {
          setEvacModalVisible(false);
          setEvacDescription("");
          setEvacMedia(null);
          setEvacCapacity("");
          setEvacContactPerson("");
          setPinMode(false);
          setPendingEvacPin(null);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setPinMode", enabled: false })
            );
          }
        }}
        onSave={async () => {
          await handleSaveEvacPin({
            evacDescription,
            evacCapacity,
            evacContactPerson,
            evacMedia,
            pendingEvacPin,
            userInfo,
            userFirstName,
            db,
            supabase,
            setEvacModalVisible,
            setEvacDescription,
            setEvacMedia,
            setEvacCapacity,
            setEvacContactPerson,
            setPinMode,
            setPendingEvacPin,
            setEvacPins,
            setAllPins,
            Alert,
            getDocs,
            collection,
            addDoc,
            serverTimestamp,
            getBarangayFromCoords,
          });
          setPinMode(false);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setPinMode", enabled: false })
            );
          }
        }}
        media={evacMedia}
        setMedia={setEvacMedia}
        capacity={evacCapacity}
        onChangeCapacity={setEvacCapacity}
        contactPerson={evacContactPerson}
        onChangeContactPerson={setEvacContactPerson}
      // No category prop needed
      />
      {/* MEDICAL SUPPORT PIN MODAL */}
      <Modal
        visible={voteMessageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVoteMessageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { padding: 24 }]}>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>
              Optional message about your vote
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                padding: 10,
                width: "100%",
                marginBottom: 16,
              }}
              placeholder="Enter your message (optional)"
              value={voteMessage}
              onChangeText={setVoteMessage}
              multiline
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={{
                  backgroundColor: "#999",
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  marginRight: 10,
                }}
                onPress={() => setVoteMessageModalVisible(false)}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#1976D2",
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                }}
                onPress={async () => {
                  setVoteMessageModalVisible(false);
                  await handleVote(pendingVoteType, voteMessage);
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Submit Vote</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                <Text style={styles.modalUser} numberOfLines={0}>
                  {selectedPin.userFirstName}
                </Text>

                {/* Category */}
                <Text style={styles.modalCategory} numberOfLines={0}>
                  {selectedPin.category}
                </Text>
                <Text style={styles.modalDesc} numberOfLines={0}>
                  {selectedPin.description || "User"}
                </Text>



                {/* User */}
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
                      userVoteStatus.voteType === "upvote" &&
                      styles.activeUpvote,
                    ]}
                    onPress={() => {
                      if (userVoteStatus.voteType === "upvote") {
                        // Already upvoted, so remove vote directly (no modal)
                        handleVote("upvote", "");
                      } else {
                        // Show modal for optional message
                        setPendingVoteType("upvote");
                        setVoteMessage("");
                        setVoteMessageModalVisible(true);
                      }
                    }}
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
                      userVoteStatus.voteType === "upvote" &&
                      styles.upvotedScore,
                      userVoteStatus.voteType === "downvote" &&
                      styles.downvotedScore,
                    ]}
                  >
                    {(selectedPin.upvotes || 0) - (selectedPin.downvotes || 0)}
                  </Text>

                  {/* Downvote Button */}
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      userVoteStatus.voteType === "downvote" &&
                      styles.activeDownvote,
                    ]}
                    onPress={() => {
                      if (userVoteStatus.voteType === "downvote") {
                        // Already downvoted, so remove vote directly (no modal)
                        handleVote("downvote", "");
                      } else {
                        // Show modal for optional message
                        setPendingVoteType("downvote");
                        setVoteMessage("");
                        setVoteMessageModalVisible(true);
                      }
                    }}
                    disabled={isVoting}
                  >
                    <Text
                      style={[
                        styles.arrowText,
                        userVoteStatus.voteType === "downvote" &&
                        styles.activeDownvoteText,
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
                      fetchRoute(location, {
                        latitude: selectedPin.latitude,
                        longitude: selectedPin.longitude,
                      });
                      setPinInfoModalVisible(false);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="navigation"
                      size={28}
                      color="#1976D2"
                    />
                    <Text style={{ fontSize: 12, color: "#1976D2" }}>
                      Go To
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Media Preview - New Section */}
                {selectedPin && (
                  <View style={styles.mediaSection}>
                    <TouchableOpacity
                      style={[
                        styles.mediaToggle,
                        (!selectedPin.media ||
                          selectedPin.media.length === 0) &&
                        styles.mediaToggleDisabled,
                      ]}
                      onPress={() => setShowMedia(!showMedia)}
                      disabled={
                        !selectedPin.media || selectedPin.media.length === 0
                      }
                    >
                      <Text style={styles.mediaToggleText}>
                        {!selectedPin.media || selectedPin.media.length === 0
                          ? "No Media Attached"
                          : showMedia
                            ? "Hide Media"
                            : `Show Media (${selectedPin.media.length})`}
                      </Text>
                    </TouchableOpacity>

                    {showMedia &&
                      selectedPin.media &&
                      selectedPin.media.length > 0 && (
                        <View style={styles.mediaContainer}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.mediaScrollContent}
                            style={styles.mediaScroller}
                          >
                            {selectedPin.media.map((mediaItem, index) => {
                              console.log(
                                `Media ${index}:`,
                                mediaItem.type,
                                mediaItem.url
                              ); // Debug log

                              return (
                                <View key={index} style={styles.mediaWrapper}>
                                  {mediaItem.type &&
                                    mediaItem.type.startsWith("image") ? (
                                    // Render Image
                                    <Image
                                      source={{ uri: mediaItem.url }}
                                      style={styles.mediaPreview}
                                      resizeMode="cover"
                                      onError={(e) => {
                                        console.log(
                                          `Image ${index} failed to load:`,
                                          e.nativeEvent.error
                                        );
                                      }}
                                      onLoad={() => {
                                        console.log(
                                          `Image ${index} loaded successfully`
                                        );
                                      }}
                                    />
                                  ) : mediaItem.type &&
                                    mediaItem.type.startsWith("video") ? (
                                    // Render Video
                                    <Video
                                      source={{ uri: mediaItem.url }}
                                      style={styles.mediaPreview}
                                      useNativeControls={true}
                                      resizeMode="contain"
                                      shouldPlay={false}
                                      isMuted={false}
                                      onError={(error) => {
                                        console.log(
                                          `Video ${index} error:`,
                                          error
                                        );
                                      }}
                                      onPlaybackStatusUpdate={(status) => {
                                        if (status.error) {
                                          console.log(
                                            `Video ${index} playback error:`,
                                            status.error
                                          );
                                        }
                                      }}
                                    />
                                  ) : (
                                    // Fallback for unknown media types
                                    <View
                                      style={[
                                        styles.mediaPreview,
                                        styles.mediaError,
                                      ]}
                                    >
                                      <FontAwesome5
                                        name="exclamation-triangle"
                                        size={20}
                                        color="#666"
                                      />
                                      <Text style={styles.mediaErrorText}>
                                        Unsupported media type:{" "}
                                        {mediaItem.type || "unknown"}
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

      {/* PIN TYPE SELECTION MODAL */}
      <Modal
        visible={pinTypeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPinTypeModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.3)"
        }}>
          <View style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 24,
            width: "80%",
            alignItems: "center"
          }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 18 }}>
              Choose Pin Type
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#1976D2",
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                marginBottom: 16,
                width: "100%",
                alignItems: "center"
              }}
              onPress={() => {
                setPinTypeModalVisible(false);
                handleEvacPinButton();
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Evacuation Center
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#43a047",
                borderRadius: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                width: "100%",
                alignItems: "center"
              }}
              onPress={() => {
                setPinTypeModalVisible(false);
                // Call your Medical Support pin handler here
                handleMedicalPinButton();
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Medical Support
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                marginTop: 18,
                padding: 8,
              }}
              onPress={() => setPinTypeModalVisible(false)}
            >
              <Text style={{ color: "#1976D2", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MEDICAL PIN MODAL */}
      <MedicalPinModal
        visible={medicalModalVisible}
        description={medicalDescription}
        onChangeDescription={setMedicalDescription}
        selectedCategory={medicalSelectedCategory}
        onCategoryChange={setMedicalSelectedCategory}
        onCancel={() => {
          setMedicalModalVisible(false);
          setMedicalDescription("");
          setMedicalSelectedCategory("Medical Support");
          setMedicalMedia(null);
          setMedicalOpenTime("");
          setPendingMedicalPin(null);
          setPinMode(false);
          setMedicalPinMode(false);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setPinMode", enabled: false })
            );
          }
        }}
        onSave={async () => {
          await handleSaveMedicalPin({
            medicalDescription,
            medicalMedia,
            medicalOpenTime,
            pendingMedicalPin,
            userInfo,
            userFirstName,
            db,
            supabase,
            setMedicalModalVisible,
            setMedicalDescription,
            setMedicalMedia,
            setMedicalOpenTime,
            setPendingMedicalPin,
            setPinMode,
            setMedicalPinMode,
            Alert,
            collection,
            addDoc,
            serverTimestamp,
            getBarangayFromCoords,
          });
          setPinMode(false);
          setMedicalPinMode(false);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setPinMode", enabled: false })
            );
          }
        }}

        media={medicalMedia}

        setMedia={setMedicalMedia}
        openTime={medicalOpenTime}
        onChangeOpenTime={setMedicalOpenTime}
      />
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

// Add this function to your MapScreen.js (outside your component)
async function getBarangayFromCoords(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "KalingaApp/1.0 (your-email@example.com)", // Use your app name and email
        "Accept": "application/json"
      }
    });
    const text = await response.text();
    // Try to parse JSON, fallback to "Unknown" if error
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log("Reverse geocoding parse error:", e, text);
      return "Unknown";
    }
    if (data && data.address) {
      return (
        data.address.barangay ||
        data.address.suburb ||
        data.address.village ||
        data.address.neighbourhood ||
        data.address.city_district ||
        data.address.city ||
        data.address.town ||
        data.address.municipality ||
        "Unknown"
      );
    }
    return "Unknown";
  } catch (error) {
    console.log("Reverse geocoding error:", error);
    return "Unknown";
  }
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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalUser: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
    fontWeight: "bold",
  },
  modalDesc: {
    fontSize: 16,
    marginBottom: 10,
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
    color: "#666",
    textAlign: "center",
    padding: 10,
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
  },
  // Add to your existing styles
  mediaSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: 15,
  },
  mediaToggle: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  mediaToggleText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  mediaContainer: {
    width: "100%",
  },
  mediaScroller: {
    width: "100%",
  },
  mediaScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  mediaWrapper: {
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    width: 250, // Made larger
    height: 250, // Made larger
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  mediaToggleDisabled: {
    backgroundColor: "#e0e0e0",
    opacity: 0.7,
  },
  // New styles for pin type modal
  pinTypeOption: {
    backgroundColor: "#f9f9f9",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    elevation: 2,
  },
  pinTypeText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  cancelButton: {
    marginTop: 12,
    backgroundColor: "#1976D2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

