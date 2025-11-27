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

// NEW imports
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

// Optional: bundled fallback (create assets/contacts.json if you want)
// const bundledContacts = require("../assets/contacts.json");

export default function ContactScreen() {
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const CACHE_KEY = "cachedContacts_v1";

  useEffect(() => {
    let mounted = true;

    const loadCached = async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (mounted) {
            setContacts(parsed);
            setContactsLoading(false);
          }
          return true;
        }
      } catch (e) {
        console.warn("Load cache failed", e);
      }
      return false;
    };

    const saveCache = async (data) => {
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("Save cache failed", e);
      }
    };

    const fetchContactsFromFirestore = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "contacts"));
        const fetched = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() });
        });

        // sort alphabetically
        fetched.sort((a, b) => {
          const nameA = (a.name || "").toUpperCase();
          const nameB = (b.name || "").toUpperCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });

        if (mounted) {
          setContacts(fetched);
          setContactsLoading(false);
        }
        // update cache
        saveCache(fetched);
      } catch (err) {
        console.warn("Firestore fetch failed", err);
        // try to load cache or bundled fallback
        const hadCache = await loadCached();
        if (!hadCache) {
          // Optional: use bundled fallback if present
          // if (bundledContacts) { setContacts(bundledContacts); setContactsLoading(false); }
          if (mounted) setContactsLoading(false);
        }
      }
    };

    const checkAndLoad = async () => {
      setContactsLoading(true);
      const state = await NetInfo.fetch();
      if (state.isConnected) {
        // online -> fetch fresh list
        await fetchContactsFromFirestore();
      } else {
        // offline -> load cache (or bundled fallback)
        const hadCache = await loadCached();
        if (!hadCache) {
          // Optional bundled fallback:
          // if (bundledContacts) { setContacts(bundledContacts); }
          // else show empty list
          setContacts([]);
          setContactsLoading(false);
        }
      }
    };

    checkAndLoad();

    // Also subscribe to connectivity changes to auto-refresh when back online
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        fetchContactsFromFirestore();
      }
    });

    return () => {
      mounted = false;
      unsubscribeNet();
    };
  }, []);

  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number}`).catch((e) =>
      console.warn("Call open failed", e)
    );
  };

  const handleSMS = (number) => {
    if (!number) return;
    Linking.openURL(`sms:${number}`).catch((e) =>
      console.warn("SMS open failed", e)
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />

      {/* Top Bar - Stays Fixed */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Emergency Contacts</Text>
      </View>

      {contactsLoading ? (
        <ActivityIndicator
          size="large"
          color="#e75e33"
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id?.toString() || item.number}
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
    paddingVertical: hp("2%"),
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
