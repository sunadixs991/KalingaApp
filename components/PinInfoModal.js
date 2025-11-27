import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, FlatList } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { FontAwesome5 } from "@expo/vector-icons";
// import { Video } from "expo-av"; // Uncomment if you use video

const PinInfoModal = ({
  visible,
  onClose,
  selectedPin,
  userVoteStatus,
  isVoting,
  handleVote,
  setPendingVoteType,
  setVoteMessage,
  setVoteMessageModalVisible,
  fetchRoute,
  location,
  showMedia,
  setShowMedia,
  getHoursAgo,
}) => {
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
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>

            {selectedPin && (
              <>
                <Text style={styles.modalUser} numberOfLines={0}>
                  {selectedPin.userFirstName}
                </Text>
                <Text style={styles.modalCategory} numberOfLines={0}>
                  {selectedPin.category}
                </Text>
                <Text style={styles.modalDesc} numberOfLines={0}>
                  {selectedPin.description || "User"}
                </Text>
                <Text style={styles.modalTime}>
                  {getHoursAgo(selectedPin.createdAt)}
                </Text>
                <View
                  style={[
                    styles.votingContainer,
                    userVoteStatus.voteType === "upvote" && styles.containerUpvoted,
                    userVoteStatus.voteType === "downvote" && styles.containerDownvoted,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      userVoteStatus.voteType === "upvote" && styles.activeUpvote,
                    ]}
                    onPress={() => {
                      if (userVoteStatus.voteType === "upvote") {
                        handleVote("upvote", "");
                      } else {
                        setPendingVoteType("upvote");
                        setVoteMessage("");
                        setVoteMessageModalVisible(true);
                      }
                    }}
                    disabled={isVoting}
                  >
                    <Text
                      style={[
                        styles.arrowText,
                        userVoteStatus.voteType === "upvote" && styles.activeUpvoteText,
                      ]}
                    >
                      ⇧
                    </Text>
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.scoreText,
                      userVoteStatus.voteType === "upvote" && styles.upvotedScore,
                      userVoteStatus.voteType === "downvote" && styles.downvotedScore,
                    ]}
                  >
                    {(selectedPin.upvotes || 0) - (selectedPin.downvotes || 0)}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      userVoteStatus.voteType === "downvote" && styles.activeDownvote,
                    ]}
                    onPress={() => {
                      if (userVoteStatus.voteType === "downvote") {
                        handleVote("downvote", "");
                      } else {
                        setPendingVoteType("downvote");
                        setVoteMessage("");
                        setVoteMessageModalVisible(true);
                      }
                    }}
                    disabled={isVoting}
                  >
                    <Text
                      style={[
                        styles.arrowText,
                        userVoteStatus.voteType === "downvote" && styles.activeDownvoteText,
                      ]}
                    >
                      ⇩
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: "center", marginTop: 10 }}>
                  <TouchableOpacity
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
                      size={28}
                      color="#1976D2"
                    />
                    <Text style={{ fontSize: 12, color: "#1976D2" }}>
                      Go To
                    </Text>
                  </TouchableOpacity>
                </View>
                {selectedPin && (
                  <View style={styles.mediaSection}>
                    <TouchableOpacity
                      style={[
                        styles.mediaToggle,
                        (!selectedPin.media ||
                          selectedPin.media.length === 0) &&
                        styles.mediaToggleDisabled,
                      ]}
                      onPress={() => setShowMedia(!showMedia)}
                      disabled={
                        !selectedPin.media || selectedPin.media.length === 0
                      }
                    >
                      <Text style={styles.mediaToggleText}>
                        {!selectedPin.media || selectedPin.media.length === 0
                          ? "No Media Attached"
                          : showMedia
                            ? "Hide Media"
                            : `Show Media (${selectedPin.media.length})`}
                      </Text>
                    </TouchableOpacity>
                    {showMedia &&
                      selectedPin.media &&
                      selectedPin.media.length > 0 && (
                        <View style={styles.mediaContainer}>
                          <FlatList
                            data={selectedPin.media}
                            keyExtractor={(item, idx) => (item?.url || item?.uri || `media-${idx}`)}
                            renderItem={({ item, index }) => {
                              const mediaUrl = item?.url || item?.uri;
                              return mediaUrl ? (
                                <TouchableOpacity activeOpacity={0.9} onPress={() => openImage(index)}>
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
                        </View>
                      )}
                  </View>
                )}
              </>
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
};

const styles = StyleSheet.create({
  // Copy the styles for modalOverlay, modalContainer, closeButton, etc. from your MapScreen.js
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    width: "85%",
    maxWidth: 400,
    maxHeight: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 15,
    right: 15,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalUser: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
    color: "#333",
    fontWeight: "bold",
  },
  modalDesc: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  modalCategory: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
    color: "#EC6135",
    fontWeight: "600",
    backgroundColor: "#FFF3F0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalTime: {
    fontSize: 13,
    color: "#999",
    marginBottom: 15,
    textAlign: "center",
  },
  votingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    paddingVertical: 0,
    minWidth: 120,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "transparent",
    borderColor: "rgba(14, 14, 14, 0.3)",
  },
  containerUpvoted: {
    backgroundColor: "rgba(255, 139, 96, 0.15)",
    borderColor: "rgba(255, 139, 96, 0.3)",
  },
  containerDownvoted: {
    backgroundColor: "rgba(148, 148, 255, 0.15)",
    borderColor: "rgba(148, 148, 255, 0.3)",
  },
  voteButton: {
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderRadius: 90,
    marginHorizontal: 0,
    paddingBottom: 5,
  },
  activeUpvote: {
    backgroundColor: "#FF8B60",
  },
  activeDownvote: {
    backgroundColor: "#9494FF",
  },
  arrowText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#878A8C",
  },
  activeUpvoteText: {
    color: "#FFFFFF",
  },
  activeDownvoteText: {
    color: "#FFFFFF",
  },
  scoreText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1B",
    marginHorizontal: 8,
    minWidth: 30,
    textAlign: "center",
  },
  upvotedScore: {
    color: "#FF8B60",
  },
  downvotedScore: {
    color: "#9494FF",
  },
  mediaSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: 15,
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
    width: 250,
    height: 250,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
});

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

export default PinInfoModal;