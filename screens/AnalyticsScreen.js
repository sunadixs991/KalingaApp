import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useNavigation } from "@react-navigation/native";

const Tab = createMaterialTopTabNavigator();

export default function AnalyticsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Top Tabs */}
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

  const pinCategories = [
    { category: "Food Distribution", count: 10 },
    { category: "Relief Center", count: 7 },
    { category: "Medical Assistance", count: 3 },
    { category: "Others", count: 3 },
  ];

  const userCategories = [
    { category: "Active Users", count: 8 },
    { category: "Inactive Users", count: 5 },
    { category: "New Users", count: 4 },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* 4 Cards */}
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => setShowPinsModal(true)}
        >
          <Text style={styles.cardTitle}>Total Available Services</Text>
          <Text style={styles.cardNumber}>23</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => setShowUsersModal(true)}
        >
          <Text style={styles.cardTitle}>Total Users</Text>
          <Text style={styles.cardNumber}>17</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Most Pinned Area</Text>
          <Text style={styles.cardSubtitle}>Downtown</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Total Pins</Text>
          <Text style={styles.cardNumber}>20</Text>
        </View>
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
});
