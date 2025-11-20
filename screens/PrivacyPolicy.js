import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";

export default function PrivacyPolicy() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#fff" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-back" size={26} color="#333" />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Privacy Policy</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.sectionTitle}>Your Privacy Matters</Text>
        <Text style={styles.sectionText}>
          At Kalinga App, we value your trust and are committed to protecting
          your personal information. Any personal details you provide will only
          be used to improve our services and ensure a safer, more personalized
          experience.
        </Text>

        <Text style={styles.sectionTitle}>How We Use Your Information</Text>
        <Text style={styles.sectionText}>
          Your personal information is used solely for the purpose of delivering
          services, communicating important updates, and ensuring security. We
          do not sell or share your data with third parties for marketing
          purposes.
        </Text>

        <Text style={styles.sectionTitle}>Confidentiality & Security</Text>
        <Text style={styles.sectionText}>
          All personal details are kept confidential. We implement strict
          security measures to prevent unauthorized access, disclosure, or
          misuse of your information. Only authorized personnel have access, and
          they are bound by confidentiality agreements.
        </Text>

        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.sectionText}>
          You have the right to access, correct, or delete your personal
          information at any time. If you have questions or concerns about how
          your data is handled, please contact us at support@kalingaapp.com.
        </Text>

        <Text style={styles.sectionText}>
          By using Kalinga App, you agree to this Privacy Policy and consent to
          the collection and use of information as described above.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    width: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#1B212D",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1B212D",
    marginBottom: 8,
    marginTop: 10,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#555",
    marginBottom: 10,
  },
});
