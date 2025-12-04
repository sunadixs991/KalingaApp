import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const { width: SCREEN_W } = Dimensions.get("window");

function MedicalInfoModal({
  visible,
  onClose,
  selectedPin,
  fetchRoute,
  location,
  showMedia,
  setShowMedia,
}) {
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openImage = (index) => {
    setCurrentImageIndex(index);
    setImageViewerVisible(true);
  };

  const closeImageViewer = () => {
    setImageViewerVisible(false);
    setCurrentImageIndex(0);
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
      backgroundColor: "#FF9800",
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
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: "rgba(255,255,255,0.25)",
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      marginBottom: 12,
    },
    categoryDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#fff",
      marginRight: 8,
    },
    categoryText: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    facilityName: {
      fontSize: 22,
      fontWeight: "800",
      color: "#fff",
      letterSpacing: 0.3,
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
      gap: 12,
    },
    infoCard: {
      flex: 1,
      minWidth: "100%",
      backgroundColor: "#fff8f0",
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: "#ffe0b2",
      position: "relative",
      overflow: "hidden",
    },
    infoCardAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      backgroundColor: "#FF9800",
    },
    infoIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10,
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
      fontSize: 16,
      color: "#0f172a",
      fontWeight: "800",
    },

    descriptionCard: {
      backgroundColor: "#fff8f0",
      borderRadius: 14,
      padding: 16,
      marginBottom: 16,
      marginTop: 12,
      borderWidth: 1,
      borderColor: "#ffe0b2",
    },
    descriptionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    descriptionIconCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "#FF9800",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    descriptionTitle: {
      fontSize: 11,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      fontWeight: "700",
    },
    descriptionText: {
      fontSize: 14,
      color: "#475569",
      lineHeight: 21,
    },

    navButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FF9800",
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 14,
      marginBottom: 16,
      shadowColor: "#FF9800",
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

    mediaHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    mediaTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    mediaTitleIcon: {
      marginRight: 8,
    },
    mediaCount: {
      backgroundColor: "#fff3e0",
      borderRadius: 12,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    mediaCountText: {
      fontSize: 13,
      fontWeight: "700",
      color: "#FF9800",
    },

    mediaToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#fff8f0",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#ffe0b2",
    },
    mediaToggleDisabled: {
      backgroundColor: "#f8fafb",
      borderColor: "#e8ecef",
    },
    mediaToggleText: {
      color: "#FF9800",
      fontSize: 14,
      fontWeight: "700",
      flex: 1,
    },
    mediaToggleTextDisabled: {
      color: "#94a3b8",
    },

    mediaScroll: {
      marginBottom: 16,
    },
    mediaItem: {
      width: 160,
      height: 160,
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
    mediaOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      alignItems: "center",
    },
    expandIcon: {
      backgroundColor: "rgba(255,255,255,0.25)",
      borderRadius: 8,
      padding: 8,
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

  if (!selectedPin) return null;

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
                    <MaterialCommunityIcons name="hospital-box" size={28} color="#fff" />
                  </View>

                  <View style={styles.categoryBadge}>
                    <View style={styles.categoryDot} />
                    <Text style={styles.categoryText}>
                      {selectedPin.category || "Medical Support"}
                    </Text>
                  </View>

                  {selectedPin.facilityName && (
                    <Text style={styles.facilityName} numberOfLines={2}>
                      {selectedPin.facilityName}
                    </Text>
                  )}
                </View>
              </View>

              {/* Content */}
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                  {/* Info Grid - Open Time */}
                  {selectedPin.openTime && (
                    <View style={styles.infoGrid}>
                      <View style={styles.infoCard}>
                        <View style={[styles.infoCardAccent, { backgroundColor: "#FF9800" }]} />
                        <View style={[styles.infoIconContainer, { backgroundColor: "#fff3e0" }]}>
                          <MaterialCommunityIcons
                            name="clock-outline"
                            size={20}
                            color="#FF9800"
                          />
                        </View>
                        <Text style={styles.infoLabel}>Operating Hours</Text>
                        <Text style={styles.infoValue}>{selectedPin.openTime}</Text>
                      </View>
                    </View>
                  )}

                  {/* Description Card */}
                  <View style={styles.descriptionCard}>
                    <View style={styles.descriptionHeader}>
                      <View style={styles.descriptionIconCircle}>
                        <Icon name="information" size={13} color="#fff" />
                      </View>
                      <Text style={styles.descriptionTitle}>About this Facility</Text>
                    </View>
                    <Text style={styles.descriptionText}>
                      {selectedPin.description || "No description provided."}
                    </Text>
                  </View>

                  {/* Navigation Button */}
                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={() => {
                      fetchRoute(location, {
                        latitude: selectedPin.latitude,
                        longitude: selectedPin.longitude,
                      });
                      onClose();
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="navigation" size={20} color="#fff" />
                    <Text style={styles.navButtonText}>Get Directions</Text>
                  </TouchableOpacity>

                  {/* Media Section */}
                  <View style={styles.mediaHeader}>
                    <View style={styles.mediaTitleRow}>
                      <Icon
                        name="images"
                        size={18}
                        color="#FF9800"
                        style={styles.mediaTitleIcon}
                      />
                      <Text style={styles.sectionTitle}>Gallery</Text>
                    </View>
                    {selectedPin.media && selectedPin.media.length > 0 && (
                      <View style={styles.mediaCount}>
                        <Text style={styles.mediaCountText}>{selectedPin.media.length}</Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.mediaToggle,
                      (!selectedPin.media || selectedPin.media.length === 0) &&
                        styles.mediaToggleDisabled,
                    ]}
                    onPress={() => setShowMedia(!showMedia)}
                    disabled={!selectedPin.media || selectedPin.media.length === 0}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.mediaToggleText,
                        (!selectedPin.media || selectedPin.media.length === 0) &&
                          styles.mediaToggleTextDisabled,
                      ]}
                    >
                      {!selectedPin.media || selectedPin.media.length === 0
                        ? "No photos available"
                        : showMedia
                          ? "Hide Photos"
                          : "View Photos"}
                    </Text>
                    {selectedPin.media && selectedPin.media.length > 0 && (
                      <Icon
                        name={showMedia ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#FF9800"
                      />
                    )}
                  </TouchableOpacity>

                  {showMedia && selectedPin.media && selectedPin.media.length > 0 && (
                    <FlatList
                      data={selectedPin.media}
                      keyExtractor={(item, idx) => item?.url || item?.uri || `media-${idx}`}
                      renderItem={({ item, index }) => {
                        const mediaUrl = item?.url || item?.uri;
                        return mediaUrl ? (
                          <TouchableOpacity
                            onPress={() => openImage(index)}
                            activeOpacity={0.9}
                            style={styles.mediaItem}
                          >
                            <Image
                              source={{ uri: mediaUrl }}
                              style={styles.mediaImage}
                              resizeMode="cover"
                            />
                            <View style={styles.mediaOverlay}>
                              <View style={styles.expandIcon}>
                                <Icon name="expand" size={20} color="#fff" />
                              </View>
                            </View>
                          </TouchableOpacity>
                        ) : null;
                      }}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.mediaScroll}
                    />
                  )}
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
              uri:
                selectedPin?.media?.[currentImageIndex]?.url ||
                selectedPin?.media?.[currentImageIndex]?.uri,
            }}
            style={styles.viewerImage}
            resizeMode="contain"
          />

          {selectedPin?.media?.length > 1 && (
            <View style={styles.viewerNav}>
              <TouchableOpacity
                onPress={() =>
                  setCurrentImageIndex((i) =>
                    i === 0 ? selectedPin.media.length - 1 : i - 1
                  )
                }
                style={styles.viewerNavBtn}
                activeOpacity={0.7}
              >
                <Icon name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.viewerCounter}>
                {currentImageIndex + 1} / {selectedPin.media.length}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setCurrentImageIndex((i) =>
                    i === selectedPin.media.length - 1 ? 0 : i + 1
                  )
                }
                style={styles.viewerNavBtn}
                activeOpacity={0.7}
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

export default MedicalInfoModal;