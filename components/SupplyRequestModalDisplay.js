import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  Alert,
  Dimensions,
  Share,
  Platform, // <-- added Platform
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const { width: SCREEN_W } = Dimensions.get("window");

function timeAgo(ts) {
  try {
    const d = ts && ts.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d) return "";
    const sec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
  } catch {
    return "";
  }
}

export default function SupplyRequestModal({
  visible,
  onClose,
  pin = null,
  location = null,
  fetchRoute = null,
}) {
  const [mediaList, setMediaList] = useState([]);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!pin) {
      setMediaList([]);
      return;
    }
    const list = Array.isArray(pin.media)
      ? pin.media.map((m) => (typeof m === "string" ? { url: m } : m))
      : [];
    setMediaList(list);
  }, [pin, visible]);

  const openImage = (index) => {
    setCurrentImageIndex(index);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setCurrentImageIndex(0);
  };

  // --- helpers moved to component scope (was nested inside openContact) ---
  const normalizePhone = (raw) => {
    if (!raw) return "";
    return String(raw).trim().replace(/[^\d+]/g, "");
  };

  // replace with simple behaviour like ContactScreen (open tel/sms directly)
  const openDialer = async (contact) => {
    if (!contact) {
      Alert.alert("No phone number", "No contact information provided.");
      return;
    }
    const raw = String(contact || "").trim();
    if (raw.includes("@")) {
      Alert.alert("No phone number", "This contact is an email address.");
      return;
    }
    const phone = normalizePhone(raw);
    if (!phone || phone.length < 3) {
      Alert.alert("No phone number", "No valid phone number provided.");
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch (e) {
      console.warn("openDialer error", e);
      Alert.alert("Cannot open dialer", phone);
    }
  };

  const openSms = async (contact) => {
    if (!contact) {
      Alert.alert("No phone number", "No contact information provided.");
      return;
    }
    const raw = String(contact || "").trim();
    if (raw.includes("@")) {
      const mailto = `mailto:${raw}`;
      try {
        await Linking.openURL(mailto);
      } catch {
        Alert.alert("Contact", raw);
      }
      return;
    }
    const phone = normalizePhone(raw);
    if (!phone || phone.length < 3) {
      Alert.alert("No phone number", "No valid phone number provided.");
      return;
    }
    try {
      await Linking.openURL(`sms:${phone}`);
    } catch (e) {
      console.warn("openSms error", e);
      Alert.alert("Cannot open messaging app", phone);
    }
  };

  // add this share handler (uses existing `pin`)
  const handleShare = async () => {
    if (!pin) {
      Alert.alert("Nothing to share", "No request selected.");
      return;
    }

    const parts = [];
    if (pin.supplyType) parts.push(`Request: ${pin.supplyType}`);
    if (pin.numberOfPeople) parts.push(`People: ${pin.numberOfPeople}`);
    if (pin.description) parts.push(`Notes: ${pin.description}`);
    if (pin.contact) parts.push(`Contact: ${pin.contact}`);
    if (pin.latitude && pin.longitude) {
      parts.push(
        `Location: https://www.google.com/maps/search/?api=1&query=${pin.latitude},${pin.longitude}`
      );
    }

    const message = parts.join("\n\n") || "Supply request details";

    try {
      await Share.share({ message });
    } catch (e) {
      console.warn("Share failed", e);
      Alert.alert("Share error", "Unable to share this request.");
    }
  };

  // --- move styles before return so they exist during render ---
  const styles = StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(6,12,20,0.55)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
    },
    card: {
      width: Math.min(720, SCREEN_W - 32),
      backgroundColor: "#fff",
      borderRadius: 14,
      padding: 14,
      maxHeight: "86%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: 0.16,
      shadowRadius: 24,
      elevation: 12,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: "#e75e33",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    title: { fontSize: 17, fontWeight: "800", color: "#111" },
    subTitle: { fontSize: 12, color: "#666", marginTop: 2 },
    dot: { color: "#999", marginHorizontal: 6 },
    metaRow: { flexDirection: "row", alignItems: "center" },
    closeTouch: { 
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      borderRadius: 8,
      padding: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3, },

    content: {
      paddingVertical: 8,
    },

    row: { marginBottom: 10 },
    infoLabel: { fontSize: 11, color: "#788", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    infoValue: { fontSize: 15, color: "#222", fontWeight: "700" },
    infoValueSmall: { fontSize: 14, color: "#333", fontWeight: "600" },

    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    contactPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#f1fff8",
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 140,
    },
    contactText: { color: "#087f5b", fontWeight: "700", fontSize: 13 },

    smallIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },

    shareBtn: { padding: 8, marginLeft: 8 },

    actionButtonsRow: {
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      marginTop: 6,
    },
    goToButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#1976d2",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    goToText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 12,
      marginLeft: 6,
    },

    mediaScroll: { marginTop: 6, marginBottom: 6 },
    mediaWrap: {
      width: 150,
      height: 110,
      borderRadius: 12,
      overflow: "hidden",
      marginRight: 10,
      backgroundColor: "#eee",
    },
    mediaImage: { width: "100%", height: "100%" },

    notes: {
      color: "#444",
      backgroundColor: "#fff8f3",
      padding: 12,
      borderRadius: 10,
      marginTop: 6,
      fontSize: 14,
    },

    ctaRow: {
      marginTop: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    ctaBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 12,
      flex: 1,
      marginHorizontal: 6,
    },
    contactBtn: { backgroundColor: "#49A5A2" },
    ctaText: { color: "#fff", fontWeight: "800" },

    viewerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.95)",
      justifyContent: "center",
      alignItems: "center",
      padding: 12,
    },
    viewerImage: {
      width: "100%",
      height: "78%",
      borderRadius: 8,
    },
    viewerClose: { position: "absolute", top: 44, right: 20, zIndex: 40 },
    viewerNav: {
      position: "absolute",
      bottom: 44,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    viewerNavBtn: { paddingHorizontal: 18, paddingVertical: 6 },
    viewerCounter: { color: "#fff", fontWeight: "700" },
  });
  
  if (!pin) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose} accessible={false}>
          <View style={styles.backdrop}>
            <Pressable style={styles.card} onPress={() => {}} accessibilityLabel="Request details card">
              <View style={styles.headerRow}>
                <View style={styles.iconWrap}>
                  <Icon name="megaphone-outline" size={22} color="#fff" />
                </View>

                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {pin.supplyType || pin.category || "Supply Request"}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.subTitle}>{pin.urgency || "Not specified"}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.subTitle}>{timeAgo(pin.createdAt)}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={onClose} style={styles.closeTouch} accessibilityLabel="Close">
                  <Icon name="close" size={23} color="#444" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.row}>
                  <Text style={styles.infoLabel}>People</Text>
                 <Text style={styles.infoValue}>{pin.numberOfPeople}</Text>
                </View>

                <View style={styles.row}>
                  <Text style={styles.infoLabel}>Posted by</Text>
                  <Text style={styles.infoValueSmall}>{pin.userFullName || pin.userFirstName || "Anonymous"}</Text>
                </View>

                <View style={styles.row}>
                  {/* <Text style={styles.infoLabel}>Location</Text> */}
                 {/* <Text style={styles.infoValue}>{pin.barangay}</Text> */}
                </View>

                <View style={styles.contactRow}>
                  <Text style={styles.infoLabel}>Contact</Text>

                  <View style={{ flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "space-between" }}>
                    <View style={styles.contactPill}>
                      <Icon name="call" size={14} color="#0a7" style={{ marginRight: 8 }} />
                      <Text numberOfLines={1} style={styles.contactText}>
                        {pin.contact || "Not provided"}
                      </Text>
                    </View>

                    {/* removed inline small call/message buttons (they were duplicated and causing wrong behavior) */}
                    <View style={{ width: 8 }} />
                  </View>

                  <TouchableOpacity onPress={handleShare} style={styles.shareBtn} accessibilityLabel="Share request">
                    <Icon name="share-social-outline" size={18} color="#2b7" />
                  </TouchableOpacity>
                </View>

                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.goToButton}
                    onPress={() => {
                      if (typeof fetchRoute === "function" && location) {
                        fetchRoute(location, {
                          latitude: pin.latitude,
                          longitude: pin.longitude,
                        });
                        onClose();
                      } else {
                        Alert.alert("Navigation", "Unable to start navigation.");
                      }
                    }}
                    accessibilityLabel="Navigate to location"
                  >
                    <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
                    <Text style={styles.goToText}>Go To</Text>
                  </TouchableOpacity>
                </View>

                {mediaList.length > 0 && (
                  <>
                    <Text style={[styles.infoLabel, { marginTop: 12 }]}>Photos / Video</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                      {mediaList.map((m, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => openImage(i)}
                          activeOpacity={0.9}
                          style={styles.mediaWrap}
                          accessibilityRole="imagebutton"
                          accessibilityLabel={`Open image ${i + 1}`}
                        >
                          <Image source={{ uri: m.url || m.uri }} style={styles.mediaImage} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {pin.description ? (
                  <>
                    <Text style={[styles.infoLabel, { marginTop: 12 }]}>Notes</Text>
                    <Text style={styles.notes}>{pin.description}</Text>
                  </>
                ) : null}
              </ScrollView>

              <View style={styles.ctaRow}>
                <TouchableOpacity
                  style={[styles.ctaBtn, { backgroundColor: "#1976d2" }]}
                  onPress={() => openDialer(pin.contact)}
                  accessibilityLabel="Call"
                >
                  <Icon name="call-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.ctaText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.ctaBtn, { backgroundColor: "#49A5A2" }]}
                  onPress={() => openSms(pin.contact)}
                  accessibilityLabel="Message"
                >
                  <Icon name="chatbubble-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.ctaText}>Message</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Image viewer */}
      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={closeImageViewer}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={closeImageViewer} accessibilityLabel="Close image">
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <Image
            source={{ uri: mediaList[currentImageIndex]?.url || mediaList[currentImageIndex]?.uri }}
            style={styles.viewerImage}
            resizeMode="contain"
          />

          {mediaList.length > 1 && (
            <View style={styles.viewerNav}>
              <TouchableOpacity
                onPress={() => setCurrentImageIndex((i) => (i === 0 ? mediaList.length - 1 : i - 1))}
                style={styles.viewerNavBtn}
                accessibilityLabel="Previous image"
              >
                <Icon name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.viewerCounter}>
                {currentImageIndex + 1}/{mediaList.length}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentImageIndex((i) => (i === mediaList.length - 1 ? 0 : i + 1))}
                style={styles.viewerNavBtn}
                accessibilityLabel="Next image"
              >
                <Icon name="chevron-forward" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}