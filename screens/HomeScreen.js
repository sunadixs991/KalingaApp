import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import * as Location from "expo-location";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export default function HomeScreen({ route }) {
  const username = route?.params?.username;
  const [userInfo, setUserInfo] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [placeName, setPlaceName] = useState(""); // <-- Add this state

  useEffect(() => {
    const fetchUserInfo = async () => {
      const q = query(
        collection(db, "users"),
        where("username", "==", username)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUserInfo(querySnapshot.docs[0].data());
      }
    };

    fetchUserInfo();
  }, [username]);

  // Fetch device location and place name
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let loc = await Location.getCurrentPositionAsync({});
      setCurrentLocation(loc.coords);

      // Reverse geocode to get place name
      let places = await Location.reverseGeocodeAsync(loc.coords);
      if (places && places.length > 0) {
        const place = places[0];
        // console.log(place);
        // You can customize this to show barangay, city, province, etc.
        setPlaceName(
          // [place.name, place.street, place.subregion, place.city, place.region, place.country]
          // [place.name, place.street, place.district, place.city,place.subregion, place.country]
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
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#e75e33" // matches header background
      />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={16} color="#fff" />
            <Text style={styles.locationText}>
              {placeName ? placeName : "Getting your location..."}
            </Text>
          </View>
          <TouchableOpacity>
            <Icon name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Welcome Section */}
          <View style={styles.welcomeContainer}>
            <View style={styles.profilePlaceholder} />
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>
                {userInfo && userInfo.firstName
                  ? userInfo.firstName
                  : "Citizen"}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.searchIcon}>
              <Icon name="search" size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Services */}
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.cardRow}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => console.log("Food Distribution")}
            >
              <Image
                source={require("../assets/Kalinga_logo.png")}
                style={styles.cardImage}
              />
              <Text style={styles.cardText}>Food Distribution Schedules</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => console.log("Medical Support")}
            >
              <Image
                source={require("../assets/Kalinga_logo.png")}
                style={styles.cardImage}
              />
              <Text style={styles.cardText}>Medical Support Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => console.log("Evacuation Centers")}
            >
              <View style={[styles.cardImage, styles.placeholder]} />
              <Text style={styles.cardText}>Evacuation Centers</Text>
            </TouchableOpacity>
          </View>

          {/* Nearby Resources */}
          <Text style={styles.sectionTitle}>Nearby Resources</Text>
          <View style={styles.cardRow2}>
            <TouchableOpacity
              style={styles.nearbyCard}
              onPress={() => console.log("Nearby Resource 1")}
            />
            <TouchableOpacity
              style={styles.nearbyCard}
              onPress={() => console.log("Nearby Resource 2")}
            />
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
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#e75e33",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: wp("4%"),
    // padding: 16,
  },
  locationRow: { flexDirection: "row", alignItems: "center" },
  locationText: { color: "#fff", marginLeft: 4, fontWeight: "bold" },

  scrollContainer: {
    flexGrow: 1,
    padding: wp("4%"),
    paddingBottom: hp("4%"),
  },

  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 25,
  },

  profilePlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: "#ccc",
    borderRadius: 10,
    marginRight: 12,
  },

  welcomeText: { fontSize: 16, color: "#333" },
  userName: { fontSize: 18, fontWeight: "bold", color: "#000" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 8,
    paddingHorizontal: 8,
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

  sectionTitle: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    marginBottom: hp("2%"),
    paddingTop: hp("3%"),
  },

  cardRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10, // optional: to avoid crowding between cards
  },

  card: {
    width: wp("44%"),
    height: wp("44%"),
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: wp("5%"),
    alignItems: "center",
    elevation: 3,
  },

  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: 15,
    marginBottom: 7,
  },

  cardText: {
    fontSize: 13,
    textAlign: "center",
  },

  placeholder: { backgroundColor: "#e1e1e1" },

  cardRow2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 15, // optional: to avoid crowding between cards
  },
  nearbyCard: {
    width: wp("90%"),
    height: hp("25%"),
    backgroundColor: "#fff",
    borderRadius: 12,
    elevation: 4,
  },

});
