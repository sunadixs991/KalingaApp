import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

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
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* StatusBar for better contrast */}
      {/* <StatusBar barStyle="dark-content" backgroundColor="#fff" /> */}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Evacuation Centers</Text>
        <View style={{ width: 32 }} /> 
      </View>

      {/* Main Content */}
      <View style={styles.container}>
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
                <Text
                  style={[
                    styles.cardText,
                    { color: item.status === "Full" ? "#e75e33" : "#49A5A2" },
                  ]}
                >
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
          Stay updated on evacuation center availability and capacity.
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
    marginRight: 6,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  info: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 10,
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  cardInfo: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
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
