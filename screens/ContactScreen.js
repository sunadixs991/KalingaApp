// screens/ContactScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function ContactScreen() {
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  // Fetch contacts from Firestore
  useEffect(() => {
    async function fetchContacts() {
      setContactsLoading(true);
      const querySnapshot = await getDocs(collection(db, "contacts"));
      const fetched = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setContacts(fetched);
      setContactsLoading(false);
    }
    fetchContacts();
  }, []);

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

      {contactsLoading ? (
        <ActivityIndicator size="large" color="#e75e33" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
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
      )}
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
