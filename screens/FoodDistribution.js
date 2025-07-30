import React from "react";
import { View, Text, StyleSheet, FlatList, Image } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

const schedules = [
  {
    id: "1",
    title: "Barangay 1",
    date: "Aug 5, 2025",
    time: "9:00 AM - 12:00 PM",
    location: "Barangay Hall",
    // image: require("../assets/food1.png"),
  },
  {
    id: "2",
    title: "Barangay 2",
    date: "Aug 6, 2025",
    time: "1:00 PM - 4:00 PM",
    location: "Covered Court",
    // image: require("../assets/food2.png"),
  },
  {
    id: "3",
    title: "Barangay 3",
    date: "Aug 7, 2025",
    time: "8:00 AM - 11:00 AM",
    location: "Community Center",
    // image: require("../assets/food3.png"),
  },
];

export default function FoodDistribution() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Food Distribution Schedules</Text>
      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
        renderItem={({ item }) => (
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardText}>📅 {item.date}</Text>
              <Text style={styles.cardText}>⏰ {item.time}</Text>
              <Text style={styles.cardText}>📍 {item.location}</Text>
            </View>
            {item.image && (
              <Image source={item.image} style={styles.cardImage} />
            )}
          </View>
        )}
      />
      <Text style={styles.info}>
        {/* Here you can display upcoming food distribution schedules, locations, and details. */}
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
    backgroundColor: "#ffe5d1",
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
    color: "#e75e33",
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