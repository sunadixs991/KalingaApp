//CODE A
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Pressable,
  TouchableWithoutFeedback
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const { width: SCREEN_W } = Dimensions.get("window");
const MAX_MEDIA_COUNT = 3;

const MapPinModal = ({
  visible,
  description,
  onChangeDescription,
  onCancel,
  onSave,
  selectedCategory,
  onCategoryChange,
  media,
  setMedia
}) => {
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState(["Others"]);

  // Fetch categories from Firestore on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, "categories"));
        const list = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.name && data.name !== "Others") list.push(data.name);
        });
        setCategories([...list, "Others"]);
      } catch (error) {
        setCategories(["Others"]);
      }
    };
    fetchCategories();
  }, []);

  const handleCategorySelect = (category) => {
    onCategoryChange(category);
    setShowCategories(false);
  };

  const handleSave = () => {
    if (!selectedCategory) {
      Alert.alert("Category Required", "Please select a category for this pin.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Description Required", "Please enter a description for this pin.");
      return;
    }
    onSave();
  };

  const handleCancel = () => {
    setShowCategories(false);
    onCancel();
  };

  const pickMedia = async () => {
    if (media && media.length >= MAX_MEDIA_COUNT) {
      Alert.alert('Limit Reached', 'You can only add up to 3 media files.');
      return;
    }

    Alert.alert(
      'Select Media',
      'Choose how you want to add media',
      [
        {
          text: 'Camera',
          onPress: () => pickFromCamera(),
        },
        {
          text: 'Gallery',
          onPress: () => pickFromGallery(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access.');
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
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          fileName: `camera-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`
        };

        setMedia(media ? [...media, newMedia] : [newMedia]);
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
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
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          fileName: asset.fileName || `gallery-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`
        };

        setMedia(media ? [...media, newMedia] : [newMedia]);
      }
    } catch (error) {
      console.log('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  const removeMedia = (index) => {
    const newMedia = media.filter((_, i) => i !== index);
    setMedia(newMedia.length > 0 ? newMedia : null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => { }}>
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.headerSection}>
                <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
                  <Icon name="close" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerContent}>
                  <View style={styles.iconBadge}>
                    <MaterialCommunityIcons name="map-marker-plus" size={28} color="#fff" />
                  </View>
                  <Text style={styles.headerTitle}>Add New Pin</Text>
                  <Text style={styles.headerSubtitle}>Mark this location on the map</Text>
                </View>
              </View>

              {/* Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.content}>
                  {/* Category Selection */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="shape" size={16} color="#e75e33" />
                      <Text style={styles.sectionLabel}>Category</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.categorySelector,
                        showCategories && styles.categorySelectorActive
                      ]}
                      onPress={() => {
                        console.log('Category selector pressed, current state:', showCategories);
                        setShowCategories(!showCategories);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.categorySelectorContent}>
                        {selectedCategory ? (
                          <>
                            <View style={styles.categoryDot} />
                            <Text style={styles.categorySelectorText}>{selectedCategory}</Text>
                          </>
                        ) : (
                          <Text style={styles.placeholderText}>Select a category...</Text>
                        )}
                      </View>
                      <Icon
                        name={showCategories ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#e75e33"
                      />
                    </TouchableOpacity>

                    {/* Category Dropdown - Now absolute positioned relative to section */}
                    {showCategories && (
                      <View style={styles.categoryDropdown}>
                        <ScrollView
                          style={styles.categoryScrollView}
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                        >
                          {categories.map((category, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.categoryOption,
                                selectedCategory === category && styles.selectedCategoryOption
                              ]}
                              onPress={() => handleCategorySelect(category)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.categoryOptionContent}>
                                {selectedCategory === category && (
                                  <Icon name="checkmark-circle" size={20} color="#fff" />
                                )}
                                <Text style={[
                                  styles.categoryOptionText,
                                  selectedCategory === category && styles.selectedCategoryOptionText
                                ]}>
                                  {category}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* Description Input */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="text" size={16} color="#e75e33" />
                      <Text style={styles.sectionLabel}>Description</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Describe this location in detail..."
                        placeholderTextColor="#94a3b8"
                        value={description}
                        onChangeText={onChangeDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <View style={styles.inputAccent} />
                    </View>
                  </View>

                  {/* Media Section */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="image-multiple" size={16} color="#e75e33" />
                      <Text style={styles.sectionLabel}>Media</Text>
                      <View style={styles.mediaCount}>
                        <Text style={styles.mediaCountText}>
                          {media ? media.length : 0}/{MAX_MEDIA_COUNT}
                        </Text>
                      </View>
                    </View>

                    {/* Media Grid */}
                    {media && media.length > 0 && (
                      <View style={styles.mediaGrid}>
                        {media.map((item, index) => (
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

                            <View style={styles.mediaOverlay}>
                              <MaterialCommunityIcons
                                name="image"
                                size={24}
                                color="rgba(255,255,255,0.6)"
                              />
                            </View>
                          </View>
                        ))}
                      </View>


                    )}

                    {/* Add Media Button */}
                    {(!media || media.length < MAX_MEDIA_COUNT) && (
                      <TouchableOpacity
                        onPress={pickMedia}
                        style={styles.addMediaButton}
                        activeOpacity={0.8}
                      >
                        <View style={styles.addMediaIcon}>
                          <MaterialCommunityIcons name="camera-plus" size={24} color="#e75e33" />
                        </View>
                        <Text style={styles.addMediaText}>
                          {media && media.length > 0 ? "Add More Photos" : "Add Photos"}
                        </Text>
                        <Text style={styles.addMediaHint}>
                          Tap to choose from camera or gallery
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  activeOpacity={0.8}
                >
                  <Icon name="close-circle-outline" size={20} color="#64748b" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Pin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
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
    backgroundColor: "#e75e33",
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
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fef6f3",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#fdd8cc",
    zIndex: 2,
  },
  categorySelectorActive: {
    borderColor: "#e75e33",
    backgroundColor: "#fff5f2",
  },
  categorySelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e75e33",
    marginRight: 10,
  },
  categorySelectorText: {
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "600",
  },
  placeholderText: {
    fontSize: 15,
    color: "#94a3b8",
  },
  categoryDropdown: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e8ecef",
    maxHeight: 240,
    // Strong stacking and elevation so dropdown appears above inputs
    zIndex: 99999,
    elevation: 50,
    // Enhanced shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    overflow: "visible",
  },
  categoryScrollView: {
    flex: 1,
  },
  categoryOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  selectedCategoryOption: {
    backgroundColor: "#e75e33",
  },
  categoryOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryOptionText: {
    fontSize: 15,
    color: "#334155",
    fontWeight: "500",
  },
  selectedCategoryOptionText: {
    color: "#fff",
    fontWeight: "700",
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: "#fef6f3",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0f172a",
    minHeight: 100,
    borderWidth: 2,
    borderColor: "#fdd8cc",
    fontWeight: "500",
  },
  inputAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#e75e33",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  mediaCount: {
    backgroundColor: "#fff5f2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mediaCountText: {
    fontSize: 10,
    color: "#e75e33",
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
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 5,
  },

  addMediaButton: {
    backgroundColor: "#fff5f2",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#e75e33",
  },
  addMediaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fdd8cc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  addMediaText: {
    fontSize: 15,
    color: "#e75e33",
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
  saveButton: {
    backgroundColor: "#e75e33",
    shadowColor: "#e75e33",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});

export default MapPinModal;