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
  Platform,
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

  const normalizePhone = (raw) => {
    if (!raw) return "";
    return String(raw).trim().replace(/[^\d+]/g, "");
  };

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

  const styles = StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.65)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
    },
    card: {
      width: Math.min(720, SCREEN_W - 32),
      backgroundColor: "#fff",
      borderRadius: 20,
      maxHeight: "90%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.25,
      shadowRadius: 30,
      elevation: 15,
      overflow: "hidden",
    },
    headerSection: {
      backgroundColor: "#49A5A2",
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    closeBtn: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    headerContent: {
      marginTop: 8,
    },
    iconBadge: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 14,
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: "#fff",
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    urgencyBadge: {
      backgroundColor: "rgba(255,255,255,0.25)",
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 12,
      marginRight: 10,
    },
    urgencyText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    timeText: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 13,
      fontWeight: "500",
    },
    
    content: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 20,
    },

    infoGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 6,
    },
    infoCard: {
      width: "48%",
      backgroundColor: "#f8fafb",
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      marginRight: "4%",
      borderWidth: 1,
      borderColor: "#e8ecef",
    },
    infoCardFull: {
      width: "100%",
      marginRight: 0,
    },
    infoLabel: {
      fontSize: 11,
      color: "#64748b",
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      fontWeight: "600",
    },
    infoValue: {
      fontSize: 18,
      color: "#0f172a",
      fontWeight: "800",
    },
    infoValueMedium: {
      fontSize: 15,
      color: "#1e293b",
      fontWeight: "700",
    },

    contactCard: {
      backgroundColor: "#e6f7f6",
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#b8e5e3",
    },
    contactHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    contactLabelRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    contactIconCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#49A5A2",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    contactValue: {
      fontSize: 16,
      color: "#0d5c5a",
      fontWeight: "700",
      marginTop: 4,
    },
    shareBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: "rgba(73,165,162,0.15)",
      justifyContent: "center",
      alignItems: "center",
    },

    navButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#49A5A2",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginBottom: 16,
      shadowColor: "#49A5A2",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    navButtonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 15,
      marginLeft: 8,
      letterSpacing: 0.3,
    },

    sectionTitle: {
      fontSize: 11,
      color: "#64748b",
      marginBottom: 12,
      marginTop: 8,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      fontWeight: "700",
    },
    
    mediaScroll: {
      marginBottom: 16,
    },
    mediaItem: {
      width: 140,
      height: 140,
      borderRadius: 16,
      overflow: "hidden",
      marginRight: 12,
      backgroundColor: "#f1f5f9",
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    mediaImage: {
      width: "100%",
      height: "100%",
    },

    notesCard: {
      backgroundColor: "#fffbf5",
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#fce7cc",
    },
    notesText: {
      fontSize: 14,
      color: "#57534e",
      lineHeight: 21,
    },

    actionRow: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      borderRadius: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
    callBtn: {
      backgroundColor: "#3b82f6",
    },
    messageBtn: {
      backgroundColor: "#49A5A2",
    },
    actionBtnText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 14,
      marginLeft: 8,
      letterSpacing: 0.3,
    },

    // Image viewer
    viewerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.96)",
      justifyContent: "center",
      alignItems: "center",
    },
    viewerImage: {
      width: "92%",
      height: "75%",
      borderRadius: 12,
    },
    viewerClose: {
      position: "absolute",
      top: 50,
      right: 24,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(255,255,255,0.15)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 10,
    },
    viewerNav: {
      position: "absolute",
      bottom: 50,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.1)",
      borderRadius: 30,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    viewerNavBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    viewerCounter: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
      marginHorizontal: 20,
    },
  });

  if (!pin) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop}>
            <Pressable style={styles.card} onPress={() => {}}>
              {/* Header */}
              <View style={styles.headerSection}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                  <View style={styles.iconBadge}>
                    <Icon name="megaphone" size={28} color="#fff" />
                  </View>

                  <Text style={styles.title} numberOfLines={2}>
                    {pin.supplyType || pin.category || "Supply Request"}
                  </Text>

                  <View style={styles.metaRow}>
                    <View style={styles.urgencyBadge}>
                      <Text style={styles.urgencyText}>
                        {pin.urgency || "Standard"}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>Posted {timeAgo(pin.createdAt)}</Text>
                  </View>
                </View>
              </View>

              {/* Content */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                  {/* Info Grid */}
                  <View style={styles.infoGrid}>
                    <View style={styles.infoCard}>
                      <Text style={styles.infoLabel}>People Affected</Text>
                      <Text style={styles.infoValue}>{pin.numberOfPeople || "—"}</Text>
                    </View>

                    <View style={[styles.infoCard, { marginRight: 0 }]}>
                      <Text style={styles.infoLabel}>Posted By</Text>
                      <Text style={styles.infoValueMedium} numberOfLines={1}>
                        {pin.userFullName || pin.userFirstName || "Anonymous"}
                      </Text>
                    </View>
                  </View>

                  {/* Contact Card */}
                  <View style={styles.contactCard}>
                    <View style={styles.contactHeader}>
                      <View style={styles.contactLabelRow}>
                        <View style={styles.contactIconCircle}>
                          <Icon name="call" size={13} color="#fff" />
                        </View>
                        <Text style={styles.infoLabel}>Contact Info</Text>
                      </View>
                      <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                        <Icon name="share-social" size={18} color="#49A5A2" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {pin.contact || "Not provided"}
                    </Text>
                  </View>

                  {/* Navigation */}
                  <TouchableOpacity
                    style={styles.navButton}
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
                  >
                    <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
                    <Text style={styles.navButtonText}>Navigate to Location</Text>
                  </TouchableOpacity>

                  {/* Media */}
                  {mediaList.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Attached Media</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.mediaScroll}
                      >
                        {mediaList.map((m, i) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => openImage(i)}
                            style={styles.mediaItem}
                          >
                            <Image
                              source={{ uri: m.url || m.uri }}
                              style={styles.mediaImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </>
                  )}

                  {/* Notes */}
                  {pin.description ? (
                    <>
                      <Text style={styles.sectionTitle}>Additional Notes</Text>
                      <View style={styles.notesCard}>
                        <Text style={styles.notesText}>{pin.description}</Text>
                      </View>
                    </>
                  ) : null}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => openDialer(pin.contact)}
                  >
                    <Icon name="call" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.messageBtn]}
                    onPress={() => openSms(pin.contact)}
                  >
                    <Icon name="chatbubble-ellipses" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Image Viewer */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={closeImageViewer}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity onPress={closeImageViewer} style={styles.viewerClose}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Image
            source={{
              uri: mediaList[currentImageIndex]?.url || mediaList[currentImageIndex]?.uri,
            }}
            style={styles.viewerImage}
            resizeMode="contain"
          />

          {mediaList.length > 1 && (
            <View style={styles.viewerNav}>
              <TouchableOpacity
                onPress={() =>
                  setCurrentImageIndex((i) => (i === 0 ? mediaList.length - 1 : i - 1))
                }
                style={styles.viewerNavBtn}
              >
                <Icon name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.viewerCounter}>
                {currentImageIndex + 1} / {mediaList.length}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setCurrentImageIndex((i) => (i === mediaList.length - 1 ? 0 : i + 1))
                }
                style={styles.viewerNavBtn}
              >
                <Icon name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}