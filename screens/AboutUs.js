import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Swiper from "react-native-swiper";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function AboutUs() {
  const navigation = useNavigation();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f7f8fa" }}
      edges={["top"]}
    >
      {/* Top Bar */}
      <StatusBar barStyle="light-content" backgroundColor="#49A5A2" />
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>About Us</Text>

        {/* Placeholder to center the title */}
        <View style={{ width: 40 }}></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Subtitle Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerSubtitle}>
            Learn more about who we are and what we stand for.
          </Text>
        </View>

        {/* Carousel
        <View style={styles.carouselBox}>
          <Swiper
            autoplay
            autoplayTimeout={3}
            showsPagination
            dotStyle={{
              backgroundColor: "#ccc",
              width: 8,
              height: 8,
              borderRadius: 4,
            }}
            activeDotStyle={{
              backgroundColor: "#49A5A2",
              width: 10,
              height: 10,
              borderRadius: 5,
            }}
          >
            <Image
              style={styles.carouselImage}
              source={require("../assets/food1.png")}
            />
            <Image
              style={styles.carouselImage}
              source={require("../assets/food1.png")}
            />
            <Image
              style={styles.carouselImage}
              source={require("../assets/food1.png")}
            />
          </Swiper>
        </View> */}

        {/* Mission */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            Our mission is to provide reliable and accessible solutions that
            uplift communities through real-time assistance, innovation, and
            smart technology.
          </Text>
        </View>

        {/* Vision */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Vision</Text>
          <Text style={styles.sectionText}>
            To build a safer, smarter, and more connected environment where
            technology empowers individuals and strengthens community
            resilience.
          </Text>
        </View>

        {/* Contact Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Us</Text>
          <View style={styles.contactRow}>
            <Icon name="mail-outline" size={20} color="#2AA39A" />
            <Text style={styles.contactText}>support@kalingaapp.com</Text>
          </View>

          <View style={styles.contactRow}>
            <Icon name="call-outline" size={20} color="#2AA39A" />
            <Text style={styles.contactText}>+63 900 000 0000</Text>
          </View>

          <View style={styles.contactRow}>
            <Icon name="location-outline" size={20} color="#2AA39A" />
            <Text style={styles.contactText}>
              Bogo City, Cebu, Philippines, 6010
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    backgroundColor: "#49A5A2",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },

  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  headerSubtitle: {
    color: "#555",
    fontSize: 16,
  },

  carouselBox: {
    width: "90%",
    height: 220,
    alignSelf: "center",
    borderRadius: 20,
    overflow: "hidden",
    marginVertical: 20,
    backgroundColor: "#ddd",
  },
  carouselImage: {
    width: width * 0.9,
    height: 220,
    resizeMode: "cover",
  },

  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1B212D",
  },
  sectionText: {
    color: "#6b6b6b",
    fontSize: 16,
    lineHeight: 22,
  },

  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 40,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 4,
  },

  contactText: {
    fontSize: 15,
    marginLeft: 8,
    color: "#444",
  },
});
