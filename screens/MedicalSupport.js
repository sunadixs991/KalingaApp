import React from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

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
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medical Support Locations</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "stretch",
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#e75e33", // blue
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginTop: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    backgroundColor: "#f8ecd3ff", // light blue
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
    color: "#fdaf06ff", // blue
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