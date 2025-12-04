import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

const MAX_MEDIA_COUNT = 3;

const MedicalPinModal = ({
  visible,
  description,
  onChangeDescription,
  facilityName,
  onChangeFacilityName,
  onCancel,
  onSave,
  media,
  setMedia,
  openTime,
  onChangeOpenTime,
  // new props for manual barangay selection
  barangay,
  onChangeBarangay,
}) => {
  // Category is always "Medical Support"
  const selectedCategory = "Medical Support";

  const handleSave = () => {
    if (!facilityName || !facilityName.trim()) {
      Alert.alert("Facility Name Required", "Please enter the facility name.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Description Required", "Please enter a description for this pin.");
      return;
    }
    if (!openTime || !openTime.trim()) {
      onChangeOpenTime("24/7");
    }
    onSave();
  };

  const pickMedia = async () => {
    if (media && media.length >= MAX_MEDIA_COUNT) {
      Alert.alert("Limit Reached", "You can only add up to 3 media files.");
      return;
    }

    Alert.alert("Select Media", "Choose how you want to add media", [
      {
        text: "Camera",
        onPress: () => pickFromCamera(),
      },
      {
        text: "Gallery",
        onPress: () => pickFromGallery(),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newMedia = {
          uri: asset.uri,
          type: asset.type === "video" ? "video/mp4" : "image/jpeg",
          fileName: `camera-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
        };
        setMedia(media ? [...media, newMedia] : [newMedia]);
      }
    } catch (error) {
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

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newMedia = {
          uri: asset.uri,
          type: asset.type === "video" ? "video/mp4" : "image/jpeg",
          fileName:
            asset.fileName ||
            `gallery-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
        };
        setMedia(media ? [...media, newMedia] : [newMedia]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open gallery. Please try again.");
    }
  };

  const removeMedia = (index) => {
    const newMedia = media.filter((_, i) => i !== index);
    setMedia(newMedia.length > 0 ? newMedia : null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Add Medical Support Pin</Text>
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Barangay (manual selection/input) */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Barangay (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Select or enter barangay (optional)"
                value={barangay}
                onChangeText={onChangeBarangay}
              />
            </View>

            {/* Facility Name */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Facility Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter facility name"
                value={facilityName}
                onChangeText={onChangeFacilityName}
              />
            </View>

            {/* Time Open field */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Time Open</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 8:00 A.M to 5:00 P.M or 24/7"
                value={openTime}
                onChangeText={onChangeOpenTime}
              />
            </View>

            {/* Description Input */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Describe this medical support location..."
                value={description}
                onChangeText={onChangeDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Media Picker */}
            <View style={styles.mediaSection}>
              <Text style={styles.sectionLabel}>
                Media (Image/Video) - {media ? media.length : 0}/{MAX_MEDIA_COUNT}
              </Text>
              {(!media || media.length < MAX_MEDIA_COUNT) && (
                <TouchableOpacity
                  onPress={pickMedia}
                  style={styles.mediaPickerButton}
                >
                  <Text style={styles.mediaPickerText}>
                    {media ? "Add More Media" : "Upload Media"}
                  </Text>
                </TouchableOpacity>
              )}
              {media && (
                <View style={styles.mediaPreviewGrid}>
                  {media.map((item, index) => (
                    <View key={index} style={styles.mediaPreviewItem}>
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.mediaPreviewImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeMediaButton}
                        onPress={() => removeMedia(index)}
                      >
                        <Text style={styles.removeMediaText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.actionText}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default MedicalPinModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontWeight: "bold",
    color: "#000",
    marginBottom: 6,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  descriptionSection: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#f7f7f7",
  },
  mediaSection: {
    marginBottom: 16,
  },
  mediaPickerButton: {
    backgroundColor: "#1976D2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  mediaPickerText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  mediaPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  mediaPreviewItem: {
    position: "relative",
    marginRight: 10,
    marginBottom: 10,
  },
  mediaPreviewImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff4444",
    borderRadius: 12,
    padding: 2,
    zIndex: 2,
  },
  removeMediaText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  cancelBtn: {
    backgroundColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  saveBtn: {
    backgroundColor: "#49A5A2",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});