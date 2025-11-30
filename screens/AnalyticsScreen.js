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
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useNavigation } from "@react-navigation/native";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { BarChart, PieChart } from "react-native-chart-kit";
import { markInactiveUsers } from "../utils/markInactiveUsers";

const Tab = createMaterialTopTabNavigator();
const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  const navigation = useNavigation();

  useEffect(() => {
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
          tabBarScrollEnabled: true,
          tabBarItemStyle: { width: "auto", minWidth: 80 },
        }}
      >
        <Tab.Screen name="Overview" component={OverviewScreen} />
        <Tab.Screen name="Users" component={UsersScreen} />
        <Tab.Screen name="Services" component={ServicesScreen} />
        <Tab.Screen name="Requests" component={RequestsScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function OverviewScreen() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalPins: 0,
    totalRequests: 0,
    pendingRequests: 0,
    totalPosts: 0,
    totalComments: 0,
    evacuationCenters: 0,
    medicalFacilities: 0,
  });

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersSnap = await getDocs(collection(db, "users"));
      let activeCount = 0;
      usersSnap.forEach((doc) => {
        if (doc.data().accountStatus === "active") activeCount++;
      });

      // Fetch all pins
      const pinsSnap = await getDocs(collection(db, "pins"));

      // Fetch evacuation centers
      const evacuationSnap = await getDocs(collection(db, "evacuation_pins"));

      // Fetch medical facilities
      const medicalSnap = await getDocs(collection(db, "medical_pins"));

      // Fetch requests
      const requestsSnap = await getDocs(collection(db, "request_pins"));
      let pendingCount = 0;
      requestsSnap.forEach((doc) => {
        if (doc.data().status === "pending" || !doc.data().status) pendingCount++;
      });

      // Fetch community data
      const postsSnap = await getDocs(collection(db, "community_posts"));
      const commentsSnap = await getDocs(collection(db, "community_comments"));

      setStats({
        totalUsers: usersSnap.size,
        activeUsers: activeCount,
        totalPins: pinsSnap.size,
        totalRequests: requestsSnap.size,
        pendingRequests: pendingCount,
        totalPosts: postsSnap.size,
        totalComments: commentsSnap.size,
        evacuationCenters: evacuationSnap.size,
        medicalFacilities: medicalSnap.size,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching overview:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC6135" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Key Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: "#4CAF50" }]}>
          <Icon name="people" size={32} color="#fff" />
          <Text style={styles.metricNumber}>{stats.totalUsers}</Text>
          <Text style={styles.metricLabel}>Total Users</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: "#2196F3" }]}>
          <Icon name="pin" size={32} color="#fff" />
          <Text style={styles.metricNumber}>{stats.totalPins}</Text>
          <Text style={styles.metricLabel}>Total Pins</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: "#FF9800" }]}>
          <Icon name="help-circle" size={32} color="#fff" />
          <Text style={styles.metricNumber}>{stats.totalRequests}</Text>
          <Text style={styles.metricLabel}>Requests</Text>
        </View>

        <View style={[styles.metricCard, { backgroundColor: "#9C27B0" }]}>
          <Icon name="chatbubbles" size={32} color="#fff" />
          <Text style={styles.metricNumber}>{stats.totalPosts}</Text>
          <Text style={styles.metricLabel}>Community Posts</Text>
        </View>
      </View>

      {/* Quick Stats Cards */}
      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Users</Text>
          <Text style={styles.cardNumber}>{stats.activeUsers}</Text>
          <Text style={styles.cardSubtitle}>
            {((stats.activeUsers / stats.totalUsers) * 100 || 0).toFixed(1)}% of total
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pending Requests</Text>
          <Text style={styles.cardNumber}>{stats.pendingRequests}</Text>
          <Text style={styles.cardSubtitle}>Need attention</Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.card}>
          <Icon name="business" size={24} color="#EC6135" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Evacuation Centers</Text>
          <Text style={styles.cardNumber}>{stats.evacuationCenters}</Text>
        </View>

        <View style={styles.card}>
          <Icon name="medkit" size={24} color="#EC6135" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Medical Facilities</Text>
          <Text style={styles.cardNumber}>{stats.medicalFacilities}</Text>
        </View>
      </View>

      {/* Community Engagement */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Community Engagement</Text>
        <View style={styles.engagementStats}>
          <View style={styles.engagementItem}>
            <Text style={styles.engagementNumber}>{stats.totalPosts}</Text>
            <Text style={styles.engagementLabel}>Posts</Text>
          </View>
          <View style={styles.engagementDivider} />
          <View style={styles.engagementItem}>
            <Text style={styles.engagementNumber}>{stats.totalComments}</Text>
            <Text style={styles.engagementLabel}>Comments</Text>
          </View>
          <View style={styles.engagementDivider} />
          <View style={styles.engagementItem}>
            <Text style={styles.engagementNumber}>
              {stats.totalPosts > 0 ? (stats.totalComments / stats.totalPosts).toFixed(1) : 0}
            </Text>
            <Text style={styles.engagementLabel}>Avg Comments/Post</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function UsersScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    byStatus: [],
    byGender: [],
    byUserType: [],
    byCity: [],
    recentLogins: 0,
    lockedAccounts: 0,
  });

  useEffect(() => {
    fetchUserAnalytics();
  }, []);

  const fetchUserAnalytics = async () => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(collection(db, "users"));

      let statusCount = { active: 0, inactive: 0 };
      let genderCount = {};
      let userTypeCount = {};
      let cityCount = {};
      let recentLogins = 0;
      let lockedAccounts = 0;
      const now = new Date();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

      usersSnap.forEach((doc) => {
        const data = doc.data();

        // Status
        const status = data.accountStatus || "inactive";
        statusCount[status] = (statusCount[status] || 0) + 1;

        // Gender
        const gender = data.gender || "Not specified";
        genderCount[gender] = (genderCount[gender] || 0) + 1;

        // User Type
        const userType = data.userType || "Regular User";
        userTypeCount[userType] = (userTypeCount[userType] || 0) + 1;

        // City
        const city = data.city || "Unknown";
        cityCount[city] = (cityCount[city] || 0) + 1;

        // Recent logins (last 24 hours)
        if (data.lastLoginTime && data.lastLoginTime.toDate) {
          if (data.lastLoginTime.toDate() > oneDayAgo) recentLogins++;
        }

        // Locked accounts
        if (data.accountLocked) lockedAccounts++;
      });

      setUserData({
        byStatus: Object.entries(statusCount).map(([key, value]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          count: value,
          color: key === "active" ? "#4CAF50" : "#9E9E9E",
          legendFontColor: "#333",
          legendFontSize: 14,
        })),
        byGender: Object.entries(genderCount).map(([key, value], index) => ({
          name: key,
          count: value,
          color: ["#2196F3", "#E91E63", "#9C27B0"][index % 3],
          legendFontColor: "#333",
          legendFontSize: 14,
        })),
        byUserType: Object.entries(userTypeCount).slice(0, 5),
        byCity: Object.entries(cityCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        recentLogins,
        lockedAccounts,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC6135" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Status Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>User Status Distribution</Text>
        <PieChart
          data={userData.byStatus}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Quick Stats */}
      <View style={styles.row}>
        <View style={styles.card}>
          <Icon name="time" size={24} color="#4CAF50" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Recent Logins</Text>
          <Text style={styles.cardNumber}>{userData.recentLogins}</Text>
          <Text style={styles.cardSubtitle}>Last 24 hours</Text>
        </View>

        <View style={styles.card}>
          <Icon name="lock-closed" size={24} color="#F44336" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Locked Accounts</Text>
          <Text style={styles.cardNumber}>{userData.lockedAccounts}</Text>
          <Text style={styles.cardSubtitle}>Security locks</Text>
        </View>
      </View>

      {/* Gender Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Gender Distribution</Text>
        <PieChart
          data={userData.byGender}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* User Types */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top User Types</Text>
        {userData.byUserType.map(([type, count], index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listLabel}>{type}</Text>
            <Text style={styles.listCount}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Top Cities */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Cities</Text>
        {userData.byCity.map(([city, count], index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listLabel}>{index + 1}. {city}</Text>
            <Text style={styles.listCount}>{count}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ServicesScreen() {
  const [loading, setLoading] = useState(true);
  const [serviceData, setServiceData] = useState({
    byCategory: [],
    byBarangay: [],
    totalVotes: 0,
    averageVotes: 0,
    mostUpvoted: null,
  });

  useEffect(() => {
    fetchServiceAnalytics();
  }, []);

  const fetchServiceAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all pins
      const pinsSnap = await getDocs(collection(db, "pins"));
      let categoryCount = {};
      let barangayCount = {};
      let totalVotes = 0;
      let maxVotes = 0;
      let mostUpvoted = null;

      pinsSnap.forEach((doc) => {
        const data = doc.data();

        // Category
        const category = data.category || "Others";
        categoryCount[category] = (categoryCount[category] || 0) + 1;

        // Barangay
        const barangay = data.barangay || "Unknown";
        barangayCount[barangay] = (barangayCount[barangay] || 0) + 1;

        // Votes
        const upvotes = data.upvotes || 0;
        const downvotes = data.downvotes || 0;
        const netVotes = upvotes - downvotes;
        totalVotes += (upvotes + downvotes);

        if (netVotes > maxVotes) {
          maxVotes = netVotes;
          mostUpvoted = {
            category: category,
            description: data.description || "No description",
            votes: netVotes,
          };
        }
      });

      const colors = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
        "#FF9F40", "#FF6384", "#C9CBCF", "#4BC0C0", "#FF6384"
      ];

      setServiceData({
        byCategory: Object.entries(categoryCount).map(([key, value], index) => ({
          name: key,
          count: value,
          color: colors[index % colors.length],
          legendFontColor: "#333",
          legendFontSize: 12,
        })),
        byBarangay: Object.entries(barangayCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8),
        totalVotes,
        averageVotes: pinsSnap.size > 0 ? (totalVotes / pinsSnap.size).toFixed(1) : 0,
        mostUpvoted,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching service analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC6135" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* Category Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Services by Category</Text>
        <PieChart
          data={serviceData.byCategory}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Voting Stats */}
      <View style={styles.row}>
        <View style={styles.card}>
          <Icon name="thumbs-up" size={24} color="#4CAF50" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Total Votes</Text>
          <Text style={styles.cardNumber}>{serviceData.totalVotes}</Text>
        </View>

        <View style={styles.card}>
          <Icon name="analytics" size={24} color="#2196F3" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Avg Votes/Pin</Text>
          <Text style={styles.cardNumber}>{serviceData.averageVotes}</Text>
        </View>
      </View>

      {/* Most Upvoted Service */}
      {serviceData.mostUpvoted && (
        <View style={styles.highlightCard}>
          <View style={styles.highlightHeader}>
            <Icon name="trophy" size={28} color="#FFD700" />
            <Text style={styles.highlightTitle}>Most Popular Service</Text>
          </View>
          <Text style={styles.highlightCategory}>{serviceData.mostUpvoted.category}</Text>
          <Text style={styles.highlightDescription}>{serviceData.mostUpvoted.description}</Text>
          <View style={styles.highlightFooter}>
            <Icon name="thumbs-up" size={18} color="#4CAF50" />
            <Text style={styles.highlightVotes}>{serviceData.mostUpvoted.votes} net votes</Text>
          </View>
        </View>
      )}

      {/* Top Barangays */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Services by Barangay</Text>
        <BarChart
          data={{
            labels: serviceData.byBarangay.map(([name]) => (name ? name.substring(0, 8) : "Unknown")),
            datasets: [{
              data: serviceData.byBarangay.map(([, count]) => count),
            }],
          }}
          width={screenWidth - 60}
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
            propsForBackgroundLines: { stroke: "#eee" },
          }}
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero
          showValuesOnTopOfBars
        />
      </View>
    </ScrollView>
  );
}

function RequestsScreen() {
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState({
    bySupplyType: [],
    byUrgency: [],
    byBarangay: [],
    totalPeople: 0,
    avgPeoplePerRequest: 0,
  });

  useEffect(() => {
    fetchRequestAnalytics();
  }, []);

  const fetchRequestAnalytics = async () => {
    try {
      setLoading(true);
      const requestsSnap = await getDocs(collection(db, "request_pins"));

      let supplyTypeCount = {};
      let urgencyCount = { High: 0, Medium: 0, Low: 0 };
      let barangayCount = {};
      let totalPeople = 0;

      requestsSnap.forEach((doc) => {
        const data = doc.data();

        // Supply Type
        const supplyType = data.supplyType || "Other";
        supplyTypeCount[supplyType] = (supplyTypeCount[supplyType] || 0) + 1;

        // Urgency
        const urgency = data.urgency || "Medium";
        urgencyCount[urgency] = (urgencyCount[urgency] || 0) + 1;

        // Barangay
        const barangay = data.barangay || "Unknown";
        barangayCount[barangay] = (barangayCount[barangay] || 0) + 1;

        // People affected
        totalPeople += (data.numberOfPeople || 0);
      });

      const urgencyColors = { High: "#F44336", Medium: "#FF9800", Low: "#4CAF50" };

      setRequestData({
        bySupplyType: Object.entries(supplyTypeCount).map(([key, value], index) => ({
          name: key,
          count: value,
          color: ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#00BCD4"][index % 5],
          legendFontColor: "#333",
          legendFontSize: 14,
        })),
        byUrgency: Object.entries(urgencyCount).map(([key, value]) => ({
          name: key,
          count: value,
          color: urgencyColors[key],
          legendFontColor: "#333",
          legendFontSize: 14,
        })),
        byBarangay: Object.entries(barangayCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
        totalPeople,
        avgPeoplePerRequest: requestsSnap.size > 0 ? (totalPeople / requestsSnap.size).toFixed(1) : 0,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching request analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC6135" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {/* People Stats */}
      <View style={styles.row}>
        <View style={styles.card}>
          <Icon name="people" size={24} color="#2196F3" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Total People Affected</Text>
          <Text style={styles.cardNumber}>{requestData.totalPeople}</Text>
        </View>

        <View style={styles.card}>
          <Icon name="person" size={24} color="#4CAF50" style={{ marginBottom: 8 }} />
          <Text style={styles.cardTitle}>Avg Per Request</Text>
          <Text style={styles.cardNumber}>{requestData.avgPeoplePerRequest}</Text>
        </View>
      </View>

      {/* Supply Type Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Requests by Supply Type</Text>
        <PieChart
          data={requestData.bySupplyType}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Urgency Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Requests by Urgency Level</Text>
        <PieChart
          data={requestData.byUrgency}
          width={screenWidth - 60}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="count"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Top Barangays with Requests */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Barangays with Requests</Text>
        {requestData.byBarangay.map(([barangay, count], index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listLabel}>{index + 1}. {barangay}</Text>
            <Text style={styles.listCount}>{count} requests</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function CommunityScreen() {
  const [loading, setLoading] = useState(true);
  const [communityData, setCommunityData] = useState({
    totalPosts: 0,
    totalComments: 0,
    avgCommentsPerPost: 0,
    topContributors: [],
    mostCommentedPost: null,
  });

  useEffect(() => {
    fetchCommunityAnalytics();
  }, []);

  const fetchCommunityAnalytics = async () => {
    try {
      setLoading(true);

      const postsSnap = await getDocs(collection(db, "community_posts"));
      const commentsSnap = await getDocs(collection(db, "community_comments"));

      let postsByUser = {};
      let commentsByPost = {};
      let commentsByUser = {};

      postsSnap.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId || "unknown";
        postsByUser[userId] = (postsByUser[userId] || 0) + 1;
        commentsByPost[doc.id] = 0;
      });

      commentsSnap.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId || "unknown";
        const postId = data.postId;
        commentsByUser[userId] = (commentsByUser[userId] || 0) + 1;
        if (commentsByPost[postId] !== undefined) {
          commentsByPost[postId]++;
        }
      });

      // Top contributors (combined posts + comments)
      let contributorScores = {};
      Object.entries(postsByUser).forEach(([userId, count]) => {
        contributorScores[userId] = (contributorScores[userId] || 0) + count * 2; // Posts worth 2x
      });
      Object.entries(commentsByUser).forEach(([userId, count]) => {
        contributorScores[userId] = (contributorScores[userId] || 0) + count;
      });

      const topContributors = Object.entries(contributorScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, score]) => ({ userId, score }));

      // Most commented post
      let maxComments = 0;
      let mostCommentedPostId = null;
      Object.entries(commentsByPost).forEach(([postId, count]) => {
        if (count > maxComments) {
          maxComments = count;
          mostCommentedPostId = postId;
        }
      });

      setCommunityData({
        totalPosts: postsSnap.size,
        totalComments: commentsSnap.size,
        avgCommentsPerPost: postsSnap.size > 0 ? (commentsSnap.size / postsSnap.size).toFixed(1) : 0,
        topContributors,
        mostCommentedPost: mostCommentedPostId ? { id: mostCommentedPostId, comments: maxComments } : null,
      });

      setLoading(false);
    } catch (error) {
      console.error("Error fetching community analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC6135" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Community Summary</Text>
        <Text style={styles.cardNumber}>{communityData.totalPosts} Posts</Text>
        <Text style={styles.cardSubtitle}>{communityData.totalComments} Comments total</Text>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Contributors</Text>
        {communityData.topContributors.length === 0 ? (
          <Text style={styles.emptyText}>No contributors yet</Text>
        ) : (
          communityData.topContributors.map((c, idx) => (
            <View key={c.userId} style={styles.listItem}>
              <Text style={styles.listLabel}>{idx + 1}. {c.userId}</Text>
              <Text style={styles.listCount}>{c.score} pts</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Most Commented Post</Text>
        {communityData.mostCommentedPost ? (
          <View style={styles.listItem}>
            <Text style={styles.listLabel}>Post ID: {communityData.mostCommentedPost.id}</Text>
            <Text style={styles.listCount}>{communityData.mostCommentedPost.comments} comments</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No comments recorded yet</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 16, paddingBottom: 60 },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metricCard: {
    width: "48%",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  metricNumber: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: 8 },
  metricLabel: { color: "#fff", fontSize: 13, marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    marginRight: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#333" },
  cardNumber: { fontSize: 20, fontWeight: "700", color: "#111" },
  cardSubtitle: { fontSize: 12, color: "#666", marginTop: 4 },
  chartContainer: { marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 8 },
  engagementStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    elevation: 1,
  },
  engagementItem: { flex: 1, alignItems: "center" },
  engagementNumber: { fontSize: 18, fontWeight: "700", color: "#111" },
  engagementLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  engagementDivider: { width: 1, height: 40, backgroundColor: "#eee", marginHorizontal: 8 },
  listItem: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listLabel: { fontSize: 14, color: "#333" },
  listCount: { fontSize: 14, color: "#666" },
  highlightCard: { backgroundColor: "#fff", borderRadius: 8, padding: 12, marginBottom: 12 },
  highlightHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  highlightTitle: { fontSize: 16, fontWeight: "700", marginLeft: 8 },
  highlightCategory: { fontSize: 14, fontWeight: "600", color: "#EC6135" },
  highlightDescription: { fontSize: 13, color: "#444", marginTop: 6 },
  highlightFooter: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  highlightVotes: { marginLeft: 8, color: "#444", fontWeight: "600" },
  emptyText: { color: "#777", fontSize: 14, padding: 8 },
});
