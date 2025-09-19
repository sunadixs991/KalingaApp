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
} from "../utils/voteHandlers";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FontAwesome5 } from "@expo/vector-icons"; // Expo
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
// import { Video } from "expo-av";
import { WebView } from "react-native-webview";

import { Image } from "react-native";
import EvacuationPinModal from "../components/EvacuationPinModal"; // <-- Import your new modal
import getMapHtml from "../utils/getMapHtml";
import MedicalPinModal from "../components/MedicalPinModal";
import { handleSaveEvacPin, handleSavePin, handleSaveMedicalPin } from "../utils/pinHandlers";
import PinInfoModal from "../components/PinInfoModal";
import EvacuationInfoModal from "../components/EvacuationInfoModal";
import MedicalInfoModal from "../components/MedicalInfoModal";


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

  // Add new state for facilityName, purok, and sitio
  const [evacFacilityName, setEvacFacilityName] = useState("");
  const [evacPurok, setEvacPurok] = useState("");
  const [evacSitio, setEvacSitio] = useState("");
  const [facilityName, setFacilityName] = useState("");
  

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
  const [EvacuationInfoModalVisible, setEvacuationInfoModalVisible] = useState(false);
  const [MedicalInfoModalVisible, setMedicalInfoModalVisible] = useState(false);
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
  const [crosshairMode, setCrosshairMode] = useState(false);
  const [crosshairPinType, setCrosshairPinType] = useState(null); // 'regular', 'evacuation', 'medical'
  const [mapCenter, setMapCenter] = useState(null);

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

  // Updated pin button handlers
  const handlePinButton = () => {
    setEvacPinMode(false);
    if (userInfo) {
      setCrosshairMode(true);
      setCrosshairPinType('regular');
      setPinMode(false);
      if (webviewRef.current) {
        webviewRef.current.postMessage(
          JSON.stringify({ type: "setCrosshairMode", enabled: true })
        );
      }
      Alert.alert(
        "Pin Mode",
        "Move the map to position the crosshair where you want to place your pin, then tap the confirm button."
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

  const handleEvacPinButton = () => {
    setEvacPinMode(true);
    if (userInfo) {
      setCrosshairMode(true);
      setCrosshairPinType('evacuation');
      setPinMode(false);
      if (webviewRef.current) {
        webviewRef.current.postMessage(
          JSON.stringify({ type: "setCrosshairMode", enabled: true })
        );
      }
      Alert.alert(
        "Evacuation Pin Mode",
        "Move the map to position the crosshair where you want to place your evacuation pin, then tap the confirm button."
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

  const handleMedicalPinButton = () => {
    setEvacPinMode(false);
    if (userInfo) {
      setCrosshairMode(true);
      setCrosshairPinType('medical');
      setMedicalPinMode(true);
      setPinMode(false);
      if (webviewRef.current) {
        webviewRef.current.postMessage(
          JSON.stringify({ type: "setCrosshairMode", enabled: true })
        );
      }
      Alert.alert(
        "Medical Support Pin Mode",
        "Move the map to position the crosshair where you want to place your medical support pin, then tap the confirm button."
      );
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

  // Confirm pin placement at crosshair position
  // State to track if we're waiting for center response
const [waitingForCenter, setWaitingForCenter] = useState(false);
const [pendingPinPlacement, setPendingPinPlacement] = useState(null);

const confirmPinPlacement = () => {
  if (!webviewRef.current) {
    Alert.alert("Error", "Map not ready");
    return;
  }
  
  setWaitingForCenter(true);
  setPendingPinPlacement({
    crosshairPinType,
    crosshairMode: true
  });
  
  // Request current map center from webview (only once)
  webviewRef.current.postMessage(
    JSON.stringify({ type: "getCenter" })
  );
};

// Handle the center response and complete pin placement
const handleCenterResponse = (center) => {
  if (!waitingForCenter || !pendingPinPlacement) return;

  const pinCoordinate = {
    latitude: center.latitude,
    longitude: center.longitude
  };

  if (pendingPinPlacement.crosshairPinType === 'evacuation') {
    setPendingEvacPin(pinCoordinate);
    setEvacModalVisible(true);
  } else if (pendingPinPlacement.crosshairPinType === 'medical') {
    setPendingMedicalPin(pinCoordinate);
    setMedicalModalVisible(true);
  } else {
    setPendingPin(pinCoordinate);
    setDescModalVisible(true);
  }

  setCrosshairMode(false);
  setCrosshairPinType(null);
  setWaitingForCenter(false);
  setPendingPinPlacement(null);

  if (webviewRef.current) {
    webviewRef.current.postMessage(
      JSON.stringify({ type: "setCrosshairMode", enabled: false })
    );
  }
};

// Update your existing message handler to include this case
const handleMessage = (event) => {
  try {
    const message = JSON.parse(event.nativeEvent.data);
    
    switch (message.type) {
      case 'mapCenterResponse':
        handleCenterResponse({
          latitude: message.latitude,
          longitude: message.longitude
        });
        break;
      case 'mapCenterChanged':
        // Optional: track center changes for other purposes
        setMapCenter({
          latitude: message.latitude,
          longitude: message.longitude
        });
        break;
      // ... your other existing cases like 'markerClick', 'mapClick', etc.
      default:
        // Handle other message types
        break;
    }
  } catch (error) {
    console.log('Error parsing message:', error);
  }
};

// Cancel crosshair mode (your existing function, no changes needed)
const cancelCrosshairMode = () => {
  setCrosshairMode(false);
  setCrosshairPinType(null);
  setEvacPinMode(false);
  setMedicalPinMode(false);
  setPinMode(false);
  
  // Clear any pending pin placement
  setWaitingForCenter(false);
  setPendingPinPlacement(null);
  
  if (webviewRef.current) {
    webviewRef.current.postMessage(
      JSON.stringify({ type: "setCrosshairMode", enabled: false })
    );
  }
};

  // HANDLE LONG PRESS ON MAP
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

    // Show the correct info modal based on pin type
    if (pin.category === "Evacuation Center" || pin.category === "Evacuation") {
      setEvacuationInfoModalVisible(true);
    } else if (pin.category === "Medical Support") {
      setMedicalInfoModalVisible(true);
    } else {
      setPinInfoModalVisible(true);
    }

    // Get user's vote status for this pin (for PinInfoModal only)
    if (userInfo && (pin.category !== "Evacuation Center" && pin.category !== "Evacuation" && pin.category !== "Medical Support")) {
      try {
        const voteStatus = await getUserVoteStatus(pin.id, userInfo);
        setUserVoteStatus(voteStatus);
      } catch (error) {
        setUserVoteStatus({ hasVoted: false, voteType: null });
      }
    } else {
      setUserVoteStatus({ hasVoted: false, voteType: null });
    }
  };

  // CLOSE MODALS
  const closePinInfoModal = () => {
    setPinInfoModalVisible(false);
    setSelectedPin(null);
    setUserVoteStatus({ hasVoted: false, voteType: null });
  };

  const closeEvacuationInfoModal = () => {
    setEvacuationInfoModalVisible(false);
    setSelectedPin(null);
  };

  const closeMedicalInfoModal = () => {
    setMedicalInfoModalVisible(false);
    setSelectedPin(null);
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

    // Handle center response for crosshair mode
    if (msg.type === "mapCenterResponse") {
      handleCenterResponse({
        latitude: msg.latitude,
        longitude: msg.longitude
      });
      return;
    }

    // Handle map center updates for crosshair mode
    if (msg.type === "mapCenterChanged") {
      setMapCenter({
        latitude: msg.latitude,
        longitude: msg.longitude
      });
      return;
    }

    // Handle map center updates (legacy)
    if (msg.type === "mapCenter") {
      setMapCenter({
        latitude: msg.latitude,
        longitude: msg.longitude
      });
      return;
    }

    // Only create pin on long-press or mapPin when NOT in crosshair mode
    if (msg.type === "mapLongPress" || msg.type === "mapPin") {
      if (crosshairMode) return;
      if (!pinModeRef.current) {
        console.log("Pin mode not active — ignoring pin event");
        return;
      }
      // If admin and evacuation pin mode, open evacuation modal
      if (evacPinMode) {
        setPendingEvacPin({ latitude: msg.latitude, longitude: msg.longitude });
        setEvacModalVisible(true);
        return;
      } else if (medicalPinMode) {
        setPendingMedicalPin({ latitude: msg.latitude, longitude: msg.longitude });
        setMedicalModalVisible(true);
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

      {/* Crosshair overlay when in crosshair mode */}
      {crosshairMode && (
        <View style={styles.crosshairContainer}>
          <View style={styles.crosshair}>
            <Icon 
              name={crosshairPinType === 'location' ? 'location' : 
                    crosshairPinType === 'location' ? 'location' : 'location'} 
              size={52} 
              color="#EC6135" 
            />
          </View>
          <View style={styles.crosshairDot} />
        </View>
      )}

      {/* Crosshair control buttons */}
      {crosshairMode && (
        <View style={styles.crosshairControls}>
          <TouchableOpacity
            style={[styles.controlButton, styles.cancelButton]}
            onPress={cancelCrosshairMode}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.controlButton, styles.confirmButton]}
            onPress={confirmPinPlacement}
          >
            <Text style={styles.buttonText}>Confirm Pin</Text>
          </TouchableOpacity>
        </View>
      )}

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
          setCrosshairMode(false);
          setCrosshairPinType(null);
          setPinMode(false);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setCrosshairMode", enabled: false })
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
          setCrosshairMode(false);
          setCrosshairPinType(null);
          if (webviewRef.current) {
            webviewRef.current.postMessage(
              JSON.stringify({ type: "setCrosshairMode", enabled: false })
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
          setEvacFacilityName("");
          setEvacPurok("");
          setEvacSitio("");
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
            evacMedia,
            evacFacilityName,
            evacPurok,
            evacSitio,
            pendingEvacPin,
            userInfo,
            userFirstName,
            db,
            supabase,
            setEvacModalVisible,
            setEvacDescription,
            setEvacMedia,
            setEvacCapacity,
            setEvacFacilityName,
            setEvacPurok,
            setEvacSitio,
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
        facilityName={evacFacilityName}
        onChangeFacilityName={setEvacFacilityName}
        purok={evacPurok}
        onChangePurok={setEvacPurok}
        sitio={evacSitio}
        onChangeSitio={setEvacSitio}
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

      {/* PIN INFO MODAL WITH VOTING (for regular pins only) */}
      <PinInfoModal
        visible={pinInfoModalVisible}
        onClose={closePinInfoModal}
        selectedPin={selectedPin}
        userVoteStatus={userVoteStatus}
        isVoting={isVoting}
        handleVote={handleVote}
        setPendingVoteType={setPendingVoteType}
        setVoteMessage={setVoteMessage}
        setVoteMessageModalVisible={setVoteMessageModalVisible}
        fetchRoute={fetchRoute}
        location={location}
        showMedia={showMedia}
        setShowMedia={setShowMedia}
        getHoursAgo={getHoursAgo}
      />

      {/* EVACUATION INFO MODAL */}
      <EvacuationInfoModal
        visible={EvacuationInfoModalVisible}
        onClose={closeEvacuationInfoModal}
        selectedPin={selectedPin}
        fetchRoute={fetchRoute}
        location={location}
        showMedia={showMedia}
        setShowMedia={setShowMedia}
        getHoursAgo={getHoursAgo}
      />

      {/* MEDICAL INFO MODAL */}
      <MedicalInfoModal
        visible={MedicalInfoModalVisible}
        onClose={closeMedicalInfoModal}
        selectedPin={selectedPin}
        fetchRoute={fetchRoute}
        location={location}
        showMedia={showMedia}
        setShowMedia={setShowMedia}
        getHoursAgo={getHoursAgo}
      />

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
        facilityName={facilityName}
        onChangeFacilityName={setFacilityName}
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
            getDocs,
            setAllPins, // <-- ADD THIS LINE
            setMedicalPins,
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
  cancelButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  crosshairContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
crosshair: {
  width: 50,
  height: 50,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'transparent', // no background
  borderWidth: 0,                 // no border
  shadowOpacity: 0,               // no shadow
  elevation: 0,                   // no shadow (Android)
  marginBottom: 76,            // move up more (try 6, 8, or 10)
},

 crosshairDot: {
  position: 'absolute',
  width: 4,
  height: 4,
  backgroundColor: '#EC6135',
  borderRadius: 2,
  top: '50%',
  left: '50%',
  marginTop: -8,  // move down more (try 6, 8, or 10)
  marginLeft: -1,},

  crosshairControls: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

controlButton: {
  marginTop: 6,          // less space above
  marginHorizontal: 10,  // less space left & right
  paddingVertical: 6,    // less vertical padding
  paddingHorizontal: 12, // less horizontal padding
  borderRadius: 16,      // smaller radius
  minWidth: 80,          // smaller button
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  elevation: 5,
},
// ...existing styles...


  
  cancelButton: {
    backgroundColor: '#757575',
    marginLeft: 40,
  },
  confirmButton: {
    backgroundColor: '#EC6135',
    
    marginRight: 40,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

