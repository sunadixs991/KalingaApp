// ../screens/MapScreen.js
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Button,
  Text,
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
import { getUserInfo } from "../services/getinfo"; // Add this import


export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [pin, setPin] = useState(null);
  const [pinMode, setPinMode] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [userFirstName, setUserFirstName] = useState(null); // Add this state
  const [allPins, setAllPins] = useState([]);
  const [descModalVisible, setDescModalVisible] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [description, setDescription] = useState("");
  const mapRef = useRef(null);
  const navigation = useNavigation();

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
              userFirstName: data.userFirstName, // Add this line
              description: data.description,
              createdAt: data.createdAt,
            });
          }
        });
        setAllPins(pins);
      } catch (error) {
        console.error("Error fetching pins:", error);
      }
    })();
  }, []);

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

  const handleSavePin = async () => {
    if (!description.trim()) {
      Alert.alert("Description required", "Please enter a description.");
      return;
    }
    try {
      await addDoc(collection(db, "pins"), {
        latitude: pendingPin.latitude,
        longitude: pendingPin.longitude,
        userId: userInfo || "anonymous",
        userFirstName: userFirstName || "anonymous", // Add this line
        description: description.trim(),
        createdAt: serverTimestamp(),
      });
      setDescModalVisible(false);
      setDescription("");
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
            description: data.description,
            createdAt: data.createdAt,
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onLongPress={handleLongPress}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          title="You are here!"
        >
          <Icon name="location" size={36} color="#EC6135" />
        </Marker>
        {allPins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.description || "Pinned Location"}
            description={`Pinned by: ${pin.userFirstName || "anonymous"}`}
            pinColor="blue"
          />
        ))}
        {pin && (
          <Marker coordinate={pin} title="Pinned Location" pinColor="blue" />
        )}
      </MapView>

      <TouchableOpacity
        style={[styles.circleButton, styles.pinButton]}
        onPress={handlePinButton}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.circleButton} onPress={goToMyLocation}>
        <Icon name="locate" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={descModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDescModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pin Description</Text>
            <TextInput
              placeholder="Enter a brief description"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              placeholderTextColor="#999"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setDescModalVisible(false);
                  setDescription("");
                  setPendingPin(null);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSavePin}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
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
  circleButton: {
    position: "absolute",
    bottom: hp("3.5%"),
    right: wp("5%"),
    backgroundColor: "#EC6135",
    width: wp("13%"),
    height: wp("13%"),
    borderRadius: wp("6.5%"),
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  pinButton: {
    bottom: hp("11%"),
    backgroundColor: "#49A5A2",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: wp("6%"),
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: wp("5%"),
    borderRadius: wp("5%"),
    width: "90%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: hp("0.5%") },
    shadowOpacity: 0.25,
    shadowRadius: wp("2%"),
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: wp("5%"),
    marginBottom: hp("2%"),
    textAlign: "center",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: wp("3%"),
    paddingVertical: hp("1.5%"),
    paddingHorizontal: wp("4%"),
    marginBottom: hp("2.5%"),
    fontSize: wp("3.8%"),
    color: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: hp("1.5%"),
    borderRadius: wp("3%"),
    alignItems: "center",
    marginHorizontal: wp("1.5%"),
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: "#EC6135",
  },
  saveButton: {
    backgroundColor: "#49A5A2",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: wp("3.5%"),
  },
});
