import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export default function ProvideSupplyModal({ 
  visible, 
  onClose, 
  onSubmit, 
  defaultContact = "",
  supplyType = "",
  numberOfPeople = "",
  urgency = "",
  description = "",
  contact = "",
  media = null,
}) {
  // This modal is now a Request modal (request relief)
  const [type, setType] = useState(supplyType);
  const [people, setPeople] = useState(numberOfPeople.toString());
  const [contactInfo, setContactInfo] = useState(contact || defaultContact);
  const [notesState, setNotes] = useState(description);
  const [urgencyLevel, setUrgencyLevel] = useState(urgency);
  const [loading, setLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState(media || null);

  const MAX_MEDIA_COUNT = 3;

  useEffect(() => {
    if (visible) {
      setType(supplyType || "");
      setPeople(numberOfPeople?.toString() || "1");
      setContactInfo(contact || defaultContact || "");
      setNotes(description || "");
      setUrgencyLevel(urgency || "");
      setMediaItems(media || null);
    } else {
      setType("");
      setPeople("1");
      setContactInfo(defaultContact || "");
      setNotes("");
      setUrgencyLevel("");
      setLoading(false);
      setMediaItems(null);
    }
  }, [visible, supplyType, numberOfPeople, urgency, description, contact, media, defaultContact]);

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
    if (!type || !people.trim() || !urgencyLevel) return;
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
      console.log("ProvideSupplyModal submitting:", payload);
      if (typeof onSubmit === "function") {
        await onSubmit(payload);
      }
      onClose();
    } catch (e) {
      console.error("Request modal submit error:", e);
    } finally {
      setLoading(false);
    }
  };

  const removeMedia = (index) => {
    const next = mediaItems.filter((_, i) => i !== index);
    setMediaItems(next.length ? next : null);
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
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const item = {
          uri: asset.uri,
          type: asset.type === "video" ? "video/mp4" : "image/jpeg",
          fileName: `camera-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
        };
        const next = mediaItems ? [...mediaItems, item] : [item];
        if (next.length > MAX_MEDIA_COUNT) {
          Alert.alert("Limit Reached", `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
          return;
        }
        setMediaItems(next);
      } else if (!result.canceled && result.uri) {
        // legacy result shape
        const item = { uri: result.uri, type: "image/jpeg", fileName: `camera-${Date.now()}.jpg` };
        const next = mediaItems ? [...mediaItems, item] : [item];
        if (next.length > MAX_MEDIA_COUNT) {
          Alert.alert("Limit Reached", `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
          return;
        }
        setMediaItems(next);
      }
    } catch (error) {
      console.log("Error taking photo:", error);
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
        quality: 0.7,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const item = {
          uri: asset.uri,
          type: asset.type === "video" ? "video/mp4" : "image/jpeg",
          fileName: asset.fileName || `gallery-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
        };
        const next = mediaItems ? [...mediaItems, item] : [item];
        if (next.length > MAX_MEDIA_COUNT) {
          Alert.alert("Limit Reached", `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
          return;
        }
        setMediaItems(next);
      } else if (!result.canceled && result.uri) {
        const item = { uri: result.uri, type: "image/jpeg", fileName: `gallery-${Date.now()}.jpg` };
        const next = mediaItems ? [...mediaItems, item] : [item];
        if (next.length > MAX_MEDIA_COUNT) {
          Alert.alert("Limit Reached", `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
          return;
        }
        setMediaItems(next);
      }
    } catch (error) {
      console.log("Error picking from gallery:", error);
      Alert.alert("Error", "Failed to open gallery. Please try again.");
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "video/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      // Newer DocumentPicker returns { canceled, uri, name, mimeType } or older shape
      if (result.type === "success") {
        const item = {
          uri: result.uri,
          type: result.mimeType || "image/jpeg",
          fileName: result.name || `file-${Date.now()}.jpg`,
        };
        const next = mediaItems ? [...mediaItems, item] : [item];
        if (next.length > MAX_MEDIA_COUNT) {
          Alert.alert("Limit Reached", `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
          return;
        }
        setMediaItems(next);
      }
    } catch (error) {
      console.log("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  const pickMedia = async () => {
    if (mediaItems && mediaItems.length >= MAX_MEDIA_COUNT) {
      Alert.alert("Limit Reached", `You can only add up to ${MAX_MEDIA_COUNT} media files.`);
      return;
    }

    Alert.alert("Select Media", "Choose how you want to add media", [
      { text: "Camera", onPress: pickFromCamera },
      { text: "Gallery", onPress: pickFromGallery },
      { text: "Files", onPress: pickFromFiles },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Request Relief</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color="#444" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.addressBox}>
              <Text style={styles.addressText}>Selected location</Text>
              {/* optional: you can show actual address/coords from props when available */}
            </View>

            <Text style={styles.label}>What do you need?</Text>
            <View style={styles.optionsRow}>
              {supplyOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.option,
                    type === opt.key ? styles.optionActive : styles.optionInactive,
                  ]}
                  onPress={() => setType(opt.key)}
                >
                  <Icon
                    name={opt.icon}
                    size={20}
                    color={type === opt.key ? "#fff" : "#444"}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={[styles.optionText, type === opt.key ? { color: "#fff" } : {}]}>
                    {opt.key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Number of People *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="e.g. 1"
              value={people}
              onChangeText={setPeople}
            />

            <Text style={styles.label}>Urgency Level *</Text>
            <View style={styles.urgencyRow}>
              {urgencyOptions.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.urgencyBtn, urgencyLevel === u ? styles.urgencyActive : styles.urgencyInactive]}
                  onPress={() => setUrgencyLevel(u)}
                >
                  <Text style={[styles.urgencyText, urgencyLevel === u ? { color: "#e75e33", fontWeight: "700" } : {}]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Contact (phone / email)</Text>
            <TextInput
              style={styles.input}
              placeholder="Contact info for coordination"
              value={contactInfo}
              onChangeText={setContactInfo}
              keyboardType="default"
            />

            <Text style={[styles.label, { marginTop: 14 }]}>Photos / Video (optional)</Text>
            <View style={styles.mediaSection}>
              <Text style={{ color: "#666", marginBottom: 6 }}>
                Add photos or a short video to help responders (max {MAX_MEDIA_COUNT}).
              </Text>
              {(!mediaItems || mediaItems.length < MAX_MEDIA_COUNT) && (
                <TouchableOpacity onPress={pickMedia} style={styles.mediaPickerButton}>
                  <Text style={styles.mediaPickerText}>Add Media</Text>
                </TouchableOpacity>
              )}

              {mediaItems && (
                <View style={styles.mediaPreviewGrid}>
                  {mediaItems.map((item, index) => {
                   const mediaUrl = item?.url || item?.uri;
                    return (
                      <View key={index} style={styles.mediaPreviewItem}>
                       {mediaUrl ? (
                         <Image
                           source={{ uri: mediaUrl }}
                           style={styles.mediaPreviewImage}
                           resizeMode="cover"
                           onError={(error) => console.log("Image load error:", error)}
                         />
                       ) : (
                         <View style={{ width: "100%", height: "100%", backgroundColor: "#eee", borderRadius: 8 }} />
                       )}
                        <TouchableOpacity style={styles.removeMediaButton} onPress={() => removeMedia(index)}>
                          <Text style={styles.removeMediaText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional details (access, medical conditions...)"
              value={notesState}
              onChangeText={setNotes}
              multiline
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={onClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.submitBtn,
                (!type || !people.trim() || !urgencyLevel || loading) && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={!type || !people.trim() || !urgencyLevel || loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  container: {
    maxHeight: "86%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    flex: 1,
    color: "#222",
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  addressBox: {
    backgroundColor: "#f5f7fa",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  addressText: {
    color: "#555",
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  option: {
    width: "32%",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  optionActive: {
    backgroundColor: "#e75e33",
  },
  optionInactive: {
    backgroundColor: "#f5f6f7",
    borderWidth: 1,
    borderColor: "#eee",
  },
  optionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
  },
  input: {
    backgroundColor: "#f7f8fa",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e6e9ec",
    fontSize: 15,
    color: "#222",
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  urgencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  urgencyBtn: {
    width: "48%",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  urgencyActive: {
    backgroundColor: "#fff",
    borderColor: "#e75e33",
  },
  urgencyInactive: {
    backgroundColor: "#fafafa",
  },
  urgencyText: {
    color: "#333",
    fontWeight: "600",
  },

  /* media styles */
  mediaSection: {
    marginBottom: 12,
  },
  mediaPickerButton: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  mediaPickerText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  mediaPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginTop: 6,
  },
  mediaPreviewItem: {
    width: 90,
    height: 90,
    marginRight: 10,
    marginBottom: 10,
    position: "relative",
  },
  mediaPreviewImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  removeMediaButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ff4444",
    width: 22,
    height: 22,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  removeMediaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginHorizontal: 6,
  },
  cancelBtn: {
    backgroundColor: "#f1f1f1",
  },
  submitBtn: {
    backgroundColor: "#e75e33",
  },
  cancelText: {
    color: "#444",
    fontWeight: "700",
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
  },
});