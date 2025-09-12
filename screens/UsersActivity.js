import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function UsersActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Adjust the collection name "user_activities" to match your Firestore
        const q = query(collection(db, "user_activities"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(doc => {
          list.push({ id: doc.id, ...doc.data() });
        });
        setActivities(list);
      } catch (error) {
        console.log("Failed to fetch activities:", error);
      }
      setLoading(false);
    };
    fetchActivities();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#e75e33" />
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Users Activity</Text>
        <View style={styles.backButton} />
      </View>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#e75e33" />
        ) : activities.length === 0 ? (
          <Text style={styles.noActivity}>No activity found.</Text>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.activityCard}>
                <Text style={styles.activityText}>
                  <Text style={{ fontWeight: "bold" }}>{item.userFirstName || "Unknown User"}</Text>
                  {" • "}
                  <Text style={{ color: "#e75e33" }}>{item.title || "Activity"}</Text>
                </Text>
                <Text style={styles.activityDesc}>{item.description || ""}</Text>
                <Text style={styles.timestamp}>
                  {item.timestamp
                    ? new Date(item.timestamp.seconds * 1000).toLocaleString()
                    : ""}
                </Text>
              </View>
            )}
          />
        )}
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
    justifyContent: "space-between",
    backgroundColor: "#e75e33",
    paddingVertical: 10,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  activityCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  activityText: {
    fontSize: 16,
    color: "#333",
  },
  activityDesc: {
    fontSize: 15,
    color: "#555",
    marginTop: 4,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
  noActivity: {
    textAlign: "center",
    color: "#888",
    fontSize: 16,
    marginTop: 40,
  },
});