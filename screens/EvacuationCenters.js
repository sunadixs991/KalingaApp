import React from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const centers = [
  {
    id: "1",
    name: "Central School Gym",
    address: "Poblacion, City Center",
    capacity: "500 people",
    status: "Open",
    // image: require("../assets/evac1.png"),
  },
  {
    id: "2",
    name: "Barangay 2 Covered Court",
    address: "Barangay 2, Main Road",
    capacity: "300 people",
    status: "Open",
    // image: require("../assets/evac2.png"),
  },
  {
    id: "3",
    name: "Community Hall",
    address: "Barangay 3, Near Plaza",
    capacity: "200 people",
    status: "Full",
    // image: require("../assets/evac3.png"),
  },
];

export default function EvacuationCenters() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Evacuation Centers</Text>
      <FlatList
        data={centers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
        renderItem={({ item }) => (
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardText}>📍 {item.address}</Text>
              <Text style={styles.cardText}>👥 {item.capacity}</Text>
              <Text style={[styles.cardText, { color: item.status === "Full" ? "#e75e33" : "#49A5A2" }]}>
                {item.status}
              </Text>
            </View>
            {item.image && (
              <Image source={item.image} style={styles.cardImage} />
            )}
          </View>
        )}
      />
      <Text style={styles.info}>
        {/* List of available evacuation centers, their capacity, and status. */}
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
    color: "#e75e33",
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
    backgroundColor: "#e3f6f5",
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
    color: "#49A5A2",
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