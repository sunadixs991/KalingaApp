// screens/ContactScreen.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  FlatList,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const contacts = [
  { name: "Police", number: "911" },
  { name: "Fire Department", number: "922" },
  { name: "Ambulance", number: "933" },
  { name: "DRRM", number: "0945 685 2435" },
  { name: "Local Government", number: "0945 685 2436" },
  { name: "Red Cross", number: "0945 685 2437" },
  { name: "Disaster Response Team", number: "0945 685 2438" },
  { name: "Community Support", number: "0945 685 2439" },
  { name: "Local Hospital", number: "0945 685 2440" },
  { name: "Local Clinic", number: "0945 685 2441" },
  { name: "Veterinary Services", number: "0945 685 2442" },
];

export default function ContactScreen() {
  const handleCall = (number) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleSMS = (number) => {
    Linking.openURL(`sms:${number}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />

      {/* Top Bar - Stays Fixed */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Emergency Contacts</Text>
      </View>

      {/* Contact List */}
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.number}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.contactRow}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactNumber}>{item.number}</Text>
            </View>
            <View style={styles.iconRow}>
              <TouchableOpacity
                onPress={() => handleSMS(item.number)}
                style={styles.iconButton}
              >
                <Icon
                  name="chatbubble-ellipses-outline"
                  size={28}
                  color="#49A5A2"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleCall(item.number)}
                style={styles.iconButton}
              >
                <Icon name="call-outline" size={28} color="#e75e33" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topBar: {
    width: "100%",
    backgroundColor: "#e75e33",
    paddingVertical: hp("1.5%"),
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    zIndex: 10,
  },
  topBarTitle: {
    fontSize: wp("5%"),
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: wp("4.5%"),
    paddingVertical: hp("2%"), 
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp("2%"),
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: wp("4%"),
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: wp("4.5%"),
    fontWeight: "bold",
    color: "#333",
  },
  contactNumber: {
    fontSize: wp("4%"),
    color: "#666",
    marginTop: 2,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginLeft: wp("4%"),
  },
});
