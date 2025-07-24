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
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import Icon from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { getUserInfo } from "../services/getinfo";
import MapPinModal from '../components/MapPinModal';
import FloatingButtons from '../components/FloatingButtons';

// Try importing with explicit names
import { 
  castVote, 
  getUserVoteStatus, 
  getUpdatedPinData 
} from '../services/VotesHandler';

// Debug: Log the imports immediately
console.log("=== IMPORT DEBUG ===");
console.log("castVote import:", castVote);
console.log("getUserVoteStatus import:", getUserVoteStatus);
console.log("getUpdatedPinData import:", getUpdatedPinData);
console.log("===================");

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

  // PIN INFO MODAL STATES
  const [pinInfoModalVisible, setPinInfoModalVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [userVoteStatus, setUserVoteStatus] = useState({ hasVoted: false, voteType: null });
  const [isVoting, setIsVoting] = useState(false);

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
              userFirstName: data.userFirstName,
              description: data.description,
              category: data.category || "Unknown",
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
        const targetPin = allPins.find(pin => pin.id === focusPin.id);
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
    console.log('Pin marker pressed:', pin.id);
    setSelectedPin(pin);
    setPinInfoModalVisible(true);

    // Get user's vote status for this pin
    if (userInfo) {
      try {
        console.log('Getting vote status for pin:', pin.id, 'user:', userInfo);
        console.log('getUserVoteStatus function check:', typeof getUserVoteStatus);
        
        if (typeof getUserVoteStatus !== 'function') {
          console.error('getUserVoteStatus is not a function!');
          setUserVoteStatus({ hasVoted: false, voteType: null });
          return;
        }
        
        const voteStatus = await getUserVoteStatus(pin.id, userInfo);
        console.log('Vote status result:', voteStatus);
        setUserVoteStatus(voteStatus);
      } catch (error) {
        console.error('Error getting vote status:', error);
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
    console.log('handleVote called with:', voteType);
    console.log('castVote function check:', typeof castVote);
    
    if (typeof castVote !== 'function') {
      console.error('castVote is not a function:', castVote);
      Alert.alert("Error", "Voting function not available. Please restart the app.");
      return;
    }
    
    if (!userInfo) {
      Alert.alert(
        "Sign in required",
        "You need to sign in to vote.",
        [
          { text: "No thanks!", style: "cancel" },
          {
            text: "Sign in",
            onPress: () => {
              closePinInfoModal();
              navigation.navigate("LoginScreen");
            },
          },
        ]
      );
      return;
    }

    if (!selectedPin) {
      console.log('No selected pin');
      return;
    }

    setIsVoting(true);

    try {
      console.log('Calling castVote with:', selectedPin.id, userInfo, voteType);
      const result = await castVote(selectedPin.id, userInfo, voteType);
      console.log('Vote result:', result);

      if (result.success) {
        // Get updated pin data
        console.log('Getting updated pin data...');
        console.log('getUpdatedPinData function check:', typeof getUpdatedPinData);
        
        if (typeof getUpdatedPinData === 'function') {
          const updatedPin = await getUpdatedPinData(selectedPin.id);
          console.log('Updated pin data:', updatedPin);
          
          if (updatedPin) {
            // Update selected pin
            setSelectedPin(updatedPin);
            
            // Update the pin in allPins array
            setAllPins(prevPins =>
              prevPins.map(pin =>
                pin.id === selectedPin.id
                  ? { ...pin, upvotes: updatedPin.upvotes, downvotes: updatedPin.downvotes }
                  : pin
              )
            );
          }
        }

        // Update user vote status
        if (typeof getUserVoteStatus === 'function') {
          const newVoteStatus = await getUserVoteStatus(selectedPin.id, userInfo);
          console.log('New vote status:', newVoteStatus);
          setUserVoteStatus(newVoteStatus);
        }

        // Show feedback message
        let message = "";
        switch (result.action) {
          case "added":
            message = `You ${voteType}d this pin!`;
            break;
          case "removed":
            message = `Your ${voteType} has been removed.`;
            break;
          case "changed":
            message = `Changed from ${result.previousVote} to ${voteType}.`;
            break;
        }
        
        console.log('Vote success message:', message);
        
      } else {
        console.error('Vote failed:', result.error);
        Alert.alert("Error", result.error || "Failed to record vote. Please try again.");
      }
    } catch (error) {
      console.error("Error voting:", error);
      Alert.alert("Error", "Failed to record vote. Please try again.");
    } finally {
      setIsVoting(false);
    }
  };

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
      await addDoc(collection(db, "pins"), {
        latitude: pendingPin.latitude,
        longitude: pendingPin.longitude,
        userId: userInfo || "anonymous",
        userFirstName: userFirstName || "anonymous",
        description: description.trim(),
        category: selectedCategory.trim(),
        createdAt: serverTimestamp(),
        upvotes: 0,
        downvotes: 0,
      });
      setDescModalVisible(false);
      setDescription("");
      setSelectedCategory("");
      setPinMode(false);
      setPendingPin(null);
      Alert.alert(
        "Location pinned!",
        "Your location has been pinned successfully."
      );

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
            createdAt: data.createdAt,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
          });
        }
      });
      setAllPins(pins);
    } catch (error) {
      Alert.alert(
        "Error",
        "There was an error pinning your location. Please try again."
      );
    }
  };

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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={getInitialRegion()}
        onLongPress={handleLongPress}
      >
        {/* RENDER ALL PIN MARKERS */}
        {allPins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            onPress={() => handlePinMarkerPress(pin)}
            pinColor={focusPin && pin.id === focusPin.id ? "#FF6B35" : "#EC6135"}
          />
        ))}

        {/* CURRENT LOCATION MARKER */}
        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }}>
          <Icon name="location" size={36} color="#EC6135" />
        </Marker>
      </MapView>

      <FloatingButtons onPin={handlePinButton} onLocate={goToMyLocation} />

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
        }}
        onSave={handleSavePin}
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
            {selectedPin && (
              <>
                {/* Title */}
                <Text style={styles.modalTitle} numberOfLines={0}>
                  {selectedPin.description || 'User'}
                </Text>
                
                {/* Category */}
                <Text style={styles.modalCategory} numberOfLines={0}>
                  {selectedPin.category}
                </Text>
                
                {/* User */}
                <Text style={styles.modalUser} numberOfLines={0}>
                  {selectedPin.userFirstName}
                </Text>
                

                {focusPin && selectedPin.id === focusPin.id 
                  // <View style={styles.focusedPinBadge}>
                  //   {/* <Text style={styles.focusedPinText}>📍 From Home Screen</Text> */}
                  // </View>
                }

                {/* Show if this pin was focused from HomeScreen */}
                {/* {focusPin && selectedPin.id === focusPin.id && (
                  <View style={styles.focusedPinBadge}>
                    <Text style={styles.focusedPinText}>📍 From Home Screen</Text>
                  </View>
                )} */}

                
                
                {/* Vote Counts */}
                <View style={styles.votesContainer}>
                  <Text style={styles.modalVotes}>
                    👍 {selectedPin.upvotes || 0}   👎 {selectedPin.downvotes || 0}
                  </Text>
                </View>

                {/* Voting Buttons */}
                <View style={styles.votingButtons}>
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      styles.upvoteButton,
                      userVoteStatus.voteType === 'upvote' && styles.activeVoteButton
                    ]}
                    onPress={() => handleVote('upvote')}
                    disabled={isVoting}
                  >
                    <Text style={[
                      styles.voteButtonText,
                      userVoteStatus.voteType === 'upvote' && styles.activeVoteButtonText
                    ]}>
                      👍 {userVoteStatus.voteType === 'upvote' ? 'Upvoted' : 'Upvote'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      styles.downvoteButton,
                      userVoteStatus.voteType === 'downvote' && styles.activeVoteButton
                    ]}
                    onPress={() => handleVote('downvote')}
                    disabled={isVoting}
                  >
                    <Text style={[
                      styles.voteButtonText,
                      userVoteStatus.voteType === 'downvote' && styles.activeVoteButtonText
                    ]}>
                      👎 {userVoteStatus.voteType === 'downvote' ? 'Downvoted' : 'Downvote'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Loading indicator */}
                {isVoting && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#EC6135" />
                    <Text style={styles.loadingText}>Recording vote...</Text>
                  </View>
                )}

                {/* Close button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closePinInfoModal}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  modalCategory: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    color: '#EC6135',
    fontWeight: '600',
    backgroundColor: '#FFF3F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalUser: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: '#666',
  },
  focusedPinBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  focusedPinText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  votesContainer: {
    marginBottom: 20,
  },
  modalVotes: {
    fontSize: 16,
    textAlign: 'center',
    color: '#888',
  },
  votingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
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
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
  },
  downvoteButton: {
    borderColor: '#F44336',
    backgroundColor: 'transparent',
  },
  activeVoteButton: {
    opacity: 0.8,
  },
  voteButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  activeVoteButtonText: {
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    backgroundColor: '#EC6135',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});