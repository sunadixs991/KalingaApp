import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

const locations = [
  {
    id: "1",
    name: "City Hospital",
    address: "Main Avenue, City Center",
    hours: "24/7",
    contact: "0917 123 4567",
    // image: require("../assets/med1.png"),
  },
  {
    id: "2",
    name: "Barangay 2 Health Center",
    address: "Barangay 2, Main Road",
    hours: "8:00 AM - 5:00 PM",
    contact: "0917 234 5678",
    // image: require("../assets/med2.png"),
  },
  {
    id: "3",
    name: "Community Clinic",
    address: "Barangay 3, Near Plaza",
    hours: "8:00 AM - 3:00 PM",
    contact: "0917 345 6789",
    // image: require("../assets/med3.png"),
  },
];

export default function MedicalSupport() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* ✅ Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Medical Support Locations</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <View style={styles.container}>

        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item }) => (
            <View style={styles.cardRow}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardText}>📍 {item.address}</Text>
                <Text style={styles.cardText}>🕒 {item.hours}</Text>
                <Text style={styles.cardText}>📞 {item.contact}</Text>
              </View>
              {item.image && (
                <Image source={item.image} style={styles.cardImage} />
              )}
            </View>
          )}
        />

        <Text style={styles.info}>
          Find medical support locations, hours, and contact information here.
        </Text>
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
    backgroundColor: "#fff",
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
    marginRight: 8,
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
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#f8ecd3ff",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
});
