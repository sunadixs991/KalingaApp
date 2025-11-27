import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, FlatList } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FontAwesome5 } from "@expo/vector-icons";
// import { Video } from "expo-av"; // Uncomment if you use video

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

  return (
    <>
      <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            {selectedPin && (
              <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Category */}
                <Text style={styles.category}>
                  {selectedPin.category || "Medical Support"}
                </Text>
                {/* Facility Name */}
                {selectedPin.facilityName ? (
                  <Text style={styles.facilityName}>{selectedPin.facilityName}</Text>
                ) : null}
                {/* Open Time */}
                {selectedPin.openTime ? (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#1976D2" />
                    <Text style={styles.infoText}>
                      Open: <Text style={styles.infoHighlight}>{selectedPin.openTime}</Text>
                    </Text>
                  </View>
                ) : null}

                {/* Description */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.description}>
                    {selectedPin.description || "No description provided."}
                  </Text>
                </View>

                {/* Go To Button */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={styles.goToButton}
                    onPress={() => {
                      fetchRoute(location, {
                        latitude: selectedPin.latitude,
                        longitude: selectedPin.longitude,
                      });
                      onClose();
                    }}
                  >
                    <MaterialCommunityIcons
                      name="navigation"
                      size={22}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.goToText}>Go To Location</Text>
                  </TouchableOpacity>
                </View>

                {/* Media Section - images are clickable to open viewer */}
                <View style={styles.section}>
                  <TouchableOpacity
                    style={[
                      styles.mediaToggle,
                      (!selectedPin.media || selectedPin.media.length === 0) && styles.mediaToggleDisabled,
                    ]}
                    onPress={() => setShowMedia(!showMedia)}
                    disabled={!selectedPin.media || selectedPin.media.length === 0}
                  >
                    <Text style={styles.mediaToggleText}>
                      {!selectedPin.media || selectedPin.media.length === 0
                        ? "No Media Attached"
                        : showMedia
                        ? "Hide Media"
                        : `Show Media (${selectedPin.media.length})`}
                    </Text>
                  </TouchableOpacity>

                  {showMedia && selectedPin.media && selectedPin.media.length > 0 && (
                    <FlatList
                      data={selectedPin.media}
                      keyExtractor={(item, idx) => (item?.url || item?.uri || `media-${idx}`)}
                      renderItem={({ item, index }) => {
                        const mediaUrl = item?.url || item?.uri;
                        return mediaUrl ? (
                          <TouchableOpacity
                            onPress={() => openImage(index)}
                            activeOpacity={0.9}
                            accessibilityRole="imagebutton"
                          >
                            <Image
                              source={{ uri: mediaUrl }}
                              style={{ width: 220, height: 220, borderRadius: 10, marginHorizontal: 8 }}
                              resizeMode="contain"
                              onError={(error) => console.log("Image load error:", error)}
                            />
                          </TouchableOpacity>
                        ) : (
                          <View style={{ width: 220, height: 220, backgroundColor: "#eee", borderRadius: 10 }} />
                        );
                      }}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    />
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Image viewer modal */}
      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={closeImageViewer}>
        <View style={viewerStyles.viewerOverlay}>
          <TouchableOpacity style={viewerStyles.viewerClose} onPress={closeImageViewer} accessibilityLabel="Close image">
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>

          <Image
            source={{ uri: selectedPin?.media?.[currentImageIndex]?.url || selectedPin?.media?.[currentImageIndex]?.uri }}
            style={viewerStyles.viewerImage}
            resizeMode="contain"
          />

          {selectedPin?.media?.length > 1 && (
            <View style={viewerStyles.viewerNav}>
              <TouchableOpacity
                onPress={() => setCurrentImageIndex((i) => (i === 0 ? selectedPin.media.length - 1 : i - 1))}
                style={viewerStyles.viewerNavBtn}
                accessibilityLabel="Previous image"
              >
                <Icon name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={viewerStyles.viewerCounter}>
                {currentImageIndex + 1}/{selectedPin.media.length}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentImageIndex((i) => (i === selectedPin.media.length - 1 ? 0 : i + 1))}
                style={viewerStyles.viewerNavBtn}
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 0,
    borderRadius: 16,
    width: "80%",
    maxWidth: 420,
    maxHeight: "85%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
    position: "relative",
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
    width: "100%",
  },
  category: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#43a047",
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  facilityName: {
    fontSize: 20,
    color: "#1976D2",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
    justifyContent: "center",
  },
  infoText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 6,
  },
  infoHighlight: {
    color: "#1976D2",
    fontWeight: "bold",
  },
  section: {
    width: "100%",
    marginTop: 16,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#555",
    marginBottom: 4,
    textAlign: "left",
    alignSelf: "flex-start",
  },
  description: {
    fontSize: 15,
    color: "#333",
    textAlign: "left",
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  goToButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1976D2",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 28,
    marginTop: 4,
    marginBottom: 2,
    shadowColor: "#1976D2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  goToText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  mediaSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: 10,
  },
  mediaToggle: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 10,
  },
  mediaToggleText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  mediaContainer: {
    width: "100%",
  },
  mediaScroller: {
    width: "100%",
    minHeight: 120,
    marginBottom: 8,
  },
  mediaScrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  mediaWrapper: {
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f0f0f0",
    width: 220,
    height: 220,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  mediaToggleDisabled: {
    backgroundColor: "#e0e0e0",
    opacity: 0.7,
  },
  mediaError: {
    color: "#666",
    textAlign: "center",
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaErrorText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
});

// viewer styles separate to keep main styles small
const viewerStyles = StyleSheet.create({
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

export default MedicalInfoModal;