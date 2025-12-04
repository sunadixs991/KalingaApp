import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

const { width: SCREEN_W } = Dimensions.get("window");
const MAX_MEDIA_COUNT = 3;
const THEME = "#49A5A2";

// Mock Icon components for demo
const Icon = ({ name, size, color, style }) => (
  <Text style={[{ fontSize: size, color }, style]}>
    {name === "close" ? "✕" :
      name === "close-circle-outline" ? "⊗" :
        name === "checkmark-circle" ? "✓" :
          name === "chevron-down" ? "▼" :
            name === "chevron-up" ? "▲" :
              name === "cube-outline" ? "📦" :
                name === "water-outline" ? "💧" :
                  name === "heart-outline" ? "❤️" :
                    name === "home-outline" ? "🏠" :
                      name === "shirt-outline" ? "👕" :
                        name === "ellipsis-horizontal" ? "⋯" : "○"}
  </Text>
);

const MaterialCommunityIcons = ({ name, size, color }) => (
  <Text style={{ fontSize: size, color }}>
    {name === "handshake" ? "🤝" :
      name === "cube-outline" ? "📦" :
        name === "camera-plus" ? "📷" :
          name === "check-circle" ? "✓" :
            name === "image" ? "🖼️" : "○"}
  </Text>
);

export default function ProvideSupplyModal({
  visible = true,
  onClose = () => { },
  onSubmit = () => { },
  defaultContact = "",
  supplyType = "",
  numberOfPeople = "",
  urgency = "",
  description = "",
  contact = "",
  media = null,
}) {
  const [type, setType] = useState(supplyType);
  const [people, setPeople] = useState(numberOfPeople?.toString() || "1");
  const [contactInfo, setContactInfo] = useState(contact || defaultContact || "");
  const [notesState, setNotes] = useState(description || "");
  const [urgencyLevel, setUrgencyLevel] = useState(urgency || "");
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState(Array.isArray(media) ? media : []);

  useEffect(() => {
    // initialize / reset only when modal opens/closes
    if (visible) {
      setType(supplyType || "");
      setPeople(numberOfPeople?.toString() || "1");
      setContactInfo(contact || defaultContact || "");
      setNotes(description || "");
      setUrgencyLevel(urgency || "");
      setMediaItems(Array.isArray(media) ? media : []);
      setLoading(false);
    } else {
      setType("");
      setPeople("1");
      setContactInfo(defaultContact || "");
      setNotes("");
      setUrgencyLevel("");
      setMediaItems([]);
      setLoading(false);
    }
  }, [visible]);

  const supplyOptions = [
    { key: "Food", icon: "cube-outline" },
    { key: "Water", icon: "water-outline" },
    { key: "Medical", icon: "heart-outline" },
    { key: "Shelter", icon: "home-outline" },
    { key: "Clothing", icon: "shirt-outline" },
    { key: "Other", icon: "ellipsis-horizontal" },
  ];

  const urgencyOptions = ["Low", "Medium", "High", "Critical"];

  const handleSubmit = async () => {
    if (!type || !people?.trim() || !urgencyLevel) {
      Alert.alert("Missing information", "Please choose supply type, number of people and urgency.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        supplyType: type,
        numberOfPeople: Number(people) || 1,
        contact: contactInfo.trim(),
        notes: notesState.trim(),
        urgency: urgencyLevel,
        description: notesState.trim(),
        media: mediaItems || [],
      };
      if (typeof onSubmit === "function") {
        await onSubmit(payload);
      }
      onClose();
    } catch (e) {
      console.error("ProvideSupplyModal submit error:", e);
      Alert.alert("Error", "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  const removeMedia = (index) => {
    setMediaItems(prev => {
      const curr = Array.isArray(prev) ? prev : [];
      return curr.filter((_, i) => i !== index);
    });
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      const asset = result?.assets?.[0] ?? (result?.uri ? result : null);
      if (!asset) return;

      const newMedia = {
        uri: asset.uri,
        type: asset.type === "video" ? "video/mp4" : "image/jpeg",
        fileName: asset.fileName || `camera-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
      };

      setMediaItems(prev => {
        const curr = Array.isArray(prev) ? prev : [];
        if (curr.length >= MAX_MEDIA_COUNT) {
          Alert.alert('Limit Reached', `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
          return curr;
        }
        return [...curr, newMedia];
      });
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      const asset = result?.assets?.[0] ?? (result?.uri ? result : null);
      if (!asset) return;

      const newMedia = {
        uri: asset.uri,
        type: asset.type === "video" ? "video/mp4" : "image/jpeg",
        fileName: asset.fileName || `gallery-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
      };

      setMediaItems(prev => {
        const curr = Array.isArray(prev) ? prev : [];
        if (curr.length >= MAX_MEDIA_COUNT) {
          Alert.alert('Limit Reached', `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
          return curr;
        }
        return [...curr, newMedia];
      });
    } catch (error) {
      console.log('Error picking from gallery:', error);
      Alert.alert("Error", "Failed to open gallery. Please try again.");
    }
  };


  const pickMedia = async () => {
    const currentCount = Array.isArray(mediaItems) ? mediaItems.length : 0;
    if (currentCount >= MAX_MEDIA_COUNT) {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
      return;
    }

    Alert.alert(
      'Select Media',
      'Choose how you want to add media',
      [
        { text: 'Camera', onPress: pickFromCamera },
        { text: 'Gallery', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.headerSection}>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                  <View style={styles.iconBadge}>
                    <MaterialCommunityIcons name="handshake" size={28} color="#fff" />
                  </View>
                  <Text style={styles.headerTitle}>Request Relief</Text>
                  <Text style={styles.headerSubtitle}>Ask for supplies at the selected location</Text>
                </View>
              </View>

              {/* Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.content}>
                  {/* Supply Type Selection */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="cube-outline" size={16} color={THEME} />
                      <Text style={styles.sectionLabel}>What do you need?</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.optionsGrid}>
                      {supplyOptions.map((opt) => (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.optionCard,
                            type === opt.key ? styles.optionCardActive : styles.optionCardInactive,
                          ]}
                          onPress={() => setType(opt.key)}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.optionIconContainer,
                            type === opt.key && styles.optionIconContainerActive
                          ]}>
                            <Icon
                              name={opt.icon}
                              size={22}
                              color={type === opt.key ? "#fff" : THEME}
                            />
                          </View>
                          <Text style={[
                            styles.optionText,
                            type === opt.key && styles.optionTextActive
                          ]}>
                            {opt.key}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Number of People */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <Text style={styles.peopleIcon}>👥</Text>
                      <Text style={styles.sectionLabel}>Number of People</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="e.g., 1"
                        placeholderTextColor="#94a3b8"
                        value={people}
                        onChangeText={setPeople}
                      />
                      <View style={styles.inputAccent} />
                    </View>
                  </View>

                  {/* Urgency Level */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <Text style={styles.peopleIcon}>⚠️</Text>
                      <Text style={styles.sectionLabel}>Urgency Level</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.urgencyGrid}>
                      {urgencyOptions.map((u) => (
                        <TouchableOpacity
                          key={u}
                          style={[
                            styles.urgencyButton,
                            urgencyLevel === u ? styles.urgencyButtonActive : styles.urgencyButtonInactive,
                          ]}
                          onPress={() => setUrgencyLevel(u)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.urgencyContent}>
                            {urgencyLevel === u && (
                              <View style={styles.urgencyCheckmark}>
                                <Icon name="checkmark-circle" size={16} color="#fff" />
                              </View>
                            )}
                            <Text
                              style={[
                                styles.urgencyText,
                                urgencyLevel === u && styles.urgencyTextActive
                              ]}
                            >
                              {u}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Contact Info */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <Text style={styles.peopleIcon}>📞</Text>
                      <Text style={styles.sectionLabel}>Contact Info</Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Phone number or email for coordination"
                        placeholderTextColor="#94a3b8"
                        value={contactInfo}
                        onChangeText={setContactInfo}
                        keyboardType="default"
                      />
                      <View style={styles.inputAccent} />
                    </View>
                  </View>

                  {/* Media Section */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="camera-plus" size={16} color={THEME} />
                      <Text style={styles.sectionLabel}>Photos / Videos</Text>
                      <View style={styles.mediaCount}>
                        <Text style={styles.mediaCountText}>
                          {mediaItems ? mediaItems.length : 0}/{MAX_MEDIA_COUNT}
                        </Text>
                      </View>
                    </View>

                    {/* Media Grid */}
                    {mediaItems && mediaItems.length > 0 && (
                      <View style={styles.mediaGrid}>
                        {mediaItems.map((item, index) => (
                          <View key={index} style={styles.mediaItem}>

                            <Image
                              source={{ uri: item.uri }}
                              style={styles.mediaImage}
                              resizeMode="cover"
                            />

                            {/* CLOSE BUTTON */}
                            <TouchableOpacity
                              onPress={() => removeMedia(index)}
                              activeOpacity={0.8}
                              style={styles.removeMediaButton}
                            >
                              <Icon name="close" size={14} color="#fff" />
                            </TouchableOpacity>

                            {/* <View style={styles.mediaOverlay}>
                              <MaterialCommunityIcons
                                // name="image"
                                // size={24}
                                color="rgba(255,255,255,0.6)"
                              />
                            </View> */}
                          </View>
                        ))}
                      </View>

                    )}

                    {/* Add Media Button */}
                    {(!mediaItems || mediaItems.length < MAX_MEDIA_COUNT) && (
                      <TouchableOpacity
                        onPress={pickMedia}
                        style={styles.addMediaButton}
                        activeOpacity={0.8}
                      >
                        <View style={styles.addMediaIcon}>
                          <MaterialCommunityIcons name="camera-plus" size={24} color={THEME} />
                        </View>
                        <Text style={styles.addMediaText}>
                          {mediaItems && mediaItems.length > 0 ? "Add More Photos" : "Add Photos"}
                        </Text>
                        <Text style={styles.addMediaHint}>
                          Tap to choose from camera, gallery, or files
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Notes */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <Text style={styles.peopleIcon}>📝</Text>
                      <Text style={styles.sectionLabel}>Additional Notes</Text>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Additional details (access, medical conditions, etc.)"
                        placeholderTextColor="#94a3b8"
                        value={notesState}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <View style={styles.inputAccent} />
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Icon name="close-circle-outline" size={20} color="#64748b" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    (!type || !people?.trim() || !urgencyLevel || loading) && styles.submitButtonDisabled
                  ]}
                  onPress={handleSubmit}
                  disabled={!type || !people?.trim() || !urgencyLevel || loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Request Supply</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: Math.min(680, SCREEN_W - 32),
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    overflow: "visible",
  },
  headerSection: {
    backgroundColor: THEME,
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
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  scrollContent: {
    paddingBottom: 12,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 20,
    position: 'relative',
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    marginLeft: 6,
    flex: 1,
  },
  peopleIcon: {
    fontSize: 16,
  },
  requiredBadge: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  requiredText: {
    fontSize: 9,
    color: "#dc2626",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionCard: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 2,
  },
  optionCardActive: {
    backgroundColor: THEME,
    borderColor: THEME,
  },
  optionCardInactive: {
    backgroundColor: "#f0faf9",
    borderColor: "#d4efed",
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(73, 165, 162, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  optionIconContainerActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
  },
  optionTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: "#f0faf9",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0f172a",
    minHeight: 50,
    borderWidth: 2,
    borderColor: "#d4efed",
    fontWeight: "500",
  },
  inputAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: THEME,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  urgencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  urgencyButton: {
    width: "48%",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  urgencyButtonActive: {
    backgroundColor: THEME,
    borderColor: THEME,
  },
  urgencyButtonInactive: {
    backgroundColor: "#f0faf9",
    borderColor: "#d4efed",
  },
  urgencyContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  urgencyCheckmark: {
    marginRight: 2,
  },
  urgencyText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "600",
  },
  urgencyTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  mediaCount: {
    backgroundColor: "#f0faf9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mediaCountText: {
    fontSize: 10,
    color: THEME,
    fontWeight: "700",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  mediaItem: {
    position: "relative",
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 8,
    overflow: "hidden"
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  mediaOverlay: {
    position: "absolute",
    bottom: 4,
    left: 4,
    zIndex: 1,
  },
  removeMediaButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(249, 4, 4, 0.7)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 5,
  },
  addMediaButton: {
    backgroundColor: "#f0faf9",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: THEME,
  },
  addMediaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#d4efed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  addMediaText: {
    fontSize: 15,
    color: THEME,
    fontWeight: "700",
    marginBottom: 4,
  },
  addMediaHint: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#fafbfc",
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: THEME,
    shadowColor: THEME,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});