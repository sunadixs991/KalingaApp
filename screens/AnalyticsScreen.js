import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";
import { markInactiveUsers } from "../utils/markInactiveUsers"; // <-- Import your function

const Tab = createMaterialTopTabNavigator();

export default function AnalyticsScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    // Run the inactive marking function every time AnalyticsScreen mounts
    markInactiveUsers();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { fontSize: 14, fontWeight: "bold" },
          tabBarIndicatorStyle: { backgroundColor: "#EC6135" },
          tabBarActiveTintColor: "#EC6135",
          tabBarInactiveTintColor: "#555",
        }}
      >
        <Tab.Screen name="Today" component={TodayScreen} />
        <Tab.Screen name="Week" component={WeekScreen} />
        <Tab.Screen name="Month" component={MonthScreen} />
        <Tab.Screen name="Year" component={YearScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function TodayScreen() {
  const [showPinsModal, setShowPinsModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic data
  const [pinCategories, setPinCategories] = useState([]);
  const [userCategories, setUserCategories] = useState([]);
  const [totalServices, setTotalServices] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [mostPinnedArea, setMostPinnedArea] = useState("");
  const [totalPins, setTotalPins] = useState(0);

  // For chart
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }],
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);

    // Fetch pins/services
    const pinsSnap = await getDocs(collection(db, "pins"));
    let pinCatCount = {};
    let barangayCount = {};
    let totalPinsCount = 0;

    pinsSnap.forEach((doc) => {
      const data = doc.data();
      const cat = data.category || "Others";
      pinCatCount[cat] = (pinCatCount[cat] || 0) + 1;

      // Count by Barangay field (not location)
      if (data.Barangay) {
        barangayCount[data.Barangay] = (barangayCount[data.Barangay] || 0) + 1;
      }
      totalPinsCount++;
    });

    const pinCategoriesArr = Object.keys(pinCatCount).map((cat) => ({
      category: cat,
      count: pinCatCount[cat],
    }));

    setPinCategories(pinCategoriesArr);
    setTotalServices(
      pinCategoriesArr.reduce((sum, item) => sum + item.count, 0)
    );
    setTotalPins(totalPinsCount);

    // Most pinned Barangay
    let mostBarangay = "";
    let maxBarangayCount = 0;
    Object.entries(barangayCount).forEach(([barangay, count]) => {
      if (count > maxBarangayCount) {
        mostBarangay = barangay;
        maxBarangayCount = count;
      }
    });
    setMostPinnedArea(mostBarangay);

    // Fetch users
    const usersSnap = await getDocs(collection(db, "users"));
    let active = 0,
      inactive = 0,
      newUsers = 0;
    const now = new Date();
    usersSnap.forEach((doc) => {
      const data = doc.data();
      if (data.status === "active") active++;
      else if (data.status === "inactive") inactive++;
      // New users: registered within last 7 days
      if (data.createdAt && data.createdAt.toDate) {
        const created = data.createdAt.toDate();
        if ((now - created) / (1000 * 60 * 60 * 24) <= 7) newUsers++;
      }
    });
    setUserCategories([
      { category: "Active Users", count: active },
      { category: "Inactive Users", count: inactive },
      { category: "New Users", count: newUsers },
    ]);
    setTotalUsers(usersSnap.size);

    // Prepare chart data for user status
    setChartData({
      labels: ["Active", "Inactive", "New"],
      datasets: [
        {
          data: [active, inactive, newUsers],
        },
      ],
    });

    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#EC6135"
          style={{ marginTop: 40 }}
        />
      ) : (
        <>
          {/* 4 Cards */}
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => setShowPinsModal(true)}
            >
              <Text style={styles.cardTitle}>Total Available Services</Text>
              <Text style={styles.cardNumber}>{totalServices}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => setShowUsersModal(true)}
            >
              <Text style={styles.cardTitle}>Total Users</Text>
              <Text style={styles.cardNumber}>{totalUsers}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Most Pinned Area</Text>
              <Text style={styles.cardSubtitle}>{mostPinnedArea || "N/A"}</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Total Pins</Text>
              <Text style={styles.cardNumber}>{totalPins}</Text>
            </View>
          </View>

          {/* User Status Bar Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>User Status Overview</Text>
            <BarChart
              data={chartData}
              width={Dimensions.get("window").width - 40}
              height={220}
              yAxisLabel=""
              chartConfig={{
                backgroundColor: "#fff",
                backgroundGradientFrom: "#fff",
                backgroundGradientTo: "#fff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(236, 97, 53, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
                style: { borderRadius: 16 },
                propsForBackgroundLines: {
                  stroke: "#eee",
                },
              }}
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
              fromZero
              showValuesOnTopOfBars
            />
          </View>

          {/* Blank Card */}
          <View style={styles.blankCard}>
            <Text style={styles.blankCardText}>
              Additional Analytics Placeholder
            </Text>
          </View>

          {/* Total Pins Modal */}
          <Modal
            visible={showPinsModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowPinsModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Services Categories</Text>
                {pinCategories.map((item, index) => (
                  <View key={index} style={styles.categoryRow}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                    <Text style={styles.categoryCount}>{item.count}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowPinsModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Total Users Modal */}
          <Modal
            visible={showUsersModal}
            animationType="slide"
            transparent
            onRequestClose={() => setShowUsersModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>User Categories</Text>
                {userCategories.map((item, index) => (
                  <View key={index} style={styles.categoryRow}>
                    <Text style={styles.categoryText}>{item.category}</Text>
                    <Text style={styles.categoryCount}>{item.count}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowUsersModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}
    </ScrollView>
  );
}

function WeekScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Weekly Analytics</Text>
    </ScrollView>
  );
}

function MonthScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Monthly Analytics</Text>
    </ScrollView>
  );
}

function YearScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Yearly Analytics</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: { width: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: { padding: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 20,
    borderRadius: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  cardNumber: { fontSize: 28, fontWeight: "bold", color: "#EC6135" },
  cardSubtitle: { fontSize: 20, fontWeight: "600", color: "#666" },
  blankCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginTop: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  blankCardText: { fontSize: 16, color: "#999" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15 },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
    paddingHorizontal: 5,
  },
  categoryText: { fontSize: 16, color: "#333" },
  categoryCount: { fontSize: 16, fontWeight: "bold", color: "#EC6135" },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#EC6135",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
    color: "#333",
  },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    alignItems: "center",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
});
