import React, { useState, useEffect } from "react";
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
  Dimensions,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width: SCREEN_W } = Dimensions.get("window");
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
  barangay,
  onChangeBarangay,
  purok,
  onChangePurok,
  purokListOverride,
}) => {
  const selectedCategory = "Medical Support";

  const [barangayList, setBarangayList] = useState([]);
  const [purokList, setPurokList] = useState([]);
  const [barangayMap, setBarangayMap] = useState({});

  const resolvedBarangay = barangay;

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const snap = await getDocs(collection(db, "barangays"));
        const list = [];
        const map = {};
        snap.forEach((doc) => {
          const data = doc.data() || {};
          const name = data.name || doc.id;
          let puroks = [];
          if (Array.isArray(data.puroks)) puroks = data.puroks;
          else if (Array.isArray(data.purok)) puroks = data.purok;
          else if (Array.isArray(data.purokList)) puroks = data.purokList;
          else if (Array.isArray(data.purok_names)) puroks = data.purok_names;
          else puroks = [];

          const normalized = puroks
            .filter((p) => typeof p === "string")
            .map((p) => p.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

          list.push(name);
          map[name] = normalized;
        });

        list.sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
        setBarangayList(list);
        setBarangayMap(map);
      } catch (err) {
        console.log("Failed to fetch barangays:", err);
      }
    };
    fetchBarangays();
  }, []);

  useEffect(() => {
    if (Array.isArray(purokListOverride) && purokListOverride.length > 0) {
      const list = purokListOverride
        .filter((p) => typeof p === "string")
        .map((p) => p.trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
      if (purok && !list.includes(purok)) list.unshift(purok);
      setPurokList(Array.from(new Set(list)));
      return;
    }

    const loadPuroksForBarangay = async () => {
      try {
        if (!resolvedBarangay) {
          setPurokList([]);
          return;
        }

        const mapped = barangayMap[resolvedBarangay];
        if (Array.isArray(mapped) && mapped.length > 0) {
          const list = Array.from(new Set([...mapped]));
          if (purok && !list.includes(purok)) list.unshift(purok);
          setPurokList(list);
          return;
        }

        const q = query(collection(db, "barangays"), where("name", "==", resolvedBarangay));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const barangayDoc = snap.docs[0];
          try {
            const subSnap = await getDocs(collection(barangayDoc.ref, "puroks"));
            const list = [];
            subSnap.forEach((d) => {
              const data = d.data();
              if (data && data.name) list.push(data.name);
            });

            if (list.length > 0) {
              const normalized = Array.from(new Set(list.map((p) => (typeof p === "string" ? p.trim() : ""))))
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
              if (purok && !normalized.includes(purok)) normalized.unshift(purok);
              setPurokList(normalized);
              setBarangayMap((m) => ({ ...m, [resolvedBarangay]: normalized }));
              return;
            }
          } catch (subErr) {
            // ignore and try doc array fields
          }

          const docData = barangayDoc.data() || {};
          let puroks =
            Array.isArray(docData.puroks) ? docData.puroks :
              Array.isArray(docData.purok) ? docData.purok :
                Array.isArray(docData.purokList) ? docData.purokList :
                  Array.isArray(docData.purok_names) ? docData.purok_names : [];

          puroks = puroks
            .filter((p) => typeof p === "string")
            .map((p) => p.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));

          const list = Array.from(new Set(puroks));
          if (purok && !list.includes(purok)) list.unshift(purok);
          setPurokList(list);

          setBarangayMap((m) => ({ ...m, [resolvedBarangay]: list }));
        } else {
          setPurokList(purok ? [purok] : []);
        }
      } catch (err) {
        console.log("Failed to fetch puroks:", err);
        setPurokList(purok ? [purok] : []);
      }
    };

    loadPuroksForBarangay();
  }, [resolvedBarangay, barangayMap, purokListOverride]);

  const callChangeBarangay = (val) => {
    if (typeof onChangeBarangay === "function") onChangeBarangay(val);
    if (typeof onChangePurok === "function") onChangePurok("");
  };

  const handleSave = () => {
    if (!facilityName || !facilityName.trim()) {
      Alert.alert("Facility Name Requiredssss", "Please enter the facility name.");
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

  const handleCancel = () => {
    if (typeof onChangeBarangay === "function") onChangeBarangay("");
    if (typeof onChangePurok === "function") onChangePurok("");
    onCancel();
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
      console.log('Error picking from gallery:', error);
      Alert.alert("Error", "Failed to open gallery. Please try again.");
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
                    <MaterialCommunityIcons name="hospital-marker" size={28} color="#fff" />
                  </View>
                  <Text style={styles.headerTitle}>Add Medical Support Pin</Text>
                  <Text style={styles.headerSubtitle}>Mark a healthcare facility on the map</Text>
                </View>
              </View>

              {/* Content */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.content}>
                  {/* Barangay Section */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="map-marker-radius" size={16} color="#FF9800" />
                      <Text style={styles.sectionLabel}>Barangay</Text>
                      <View style={styles.optionalBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={resolvedBarangay || ""}
                        onValueChange={(val) => callChangeBarangay(val)}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select Barangay (optional)" value="" color="#94a3b8" />
                        {barangayList.map((b, idx) => (
                          <Picker.Item key={idx} label={b} value={b} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* Purok Section */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="map-marker" size={16} color="#FF9800" />
                      <Text style={styles.sectionLabel}>Purok</Text>
                      <View style={styles.optionalBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={[styles.pickerContainer, !resolvedBarangay && styles.pickerDisabled]}>
                      <Picker
                        selectedValue={purok || ""}
                        onValueChange={(val) => {
                          if (typeof onChangePurok === "function") onChangePurok(val);
                        }}
                        enabled={!!resolvedBarangay}
                        style={styles.picker}
                      >
                        <Picker.Item
                          label={resolvedBarangay ? "Select Purok (optional)" : "Select Barangay first"}
                          value=""
                          color="#94a3b8"
                        />
                        {purokList.map((p, idx) => (
                          <Picker.Item key={idx} label={p} value={p} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  {/* Facility Name Section */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="hospital-building" size={16} color="#FF9800" />
                      <Text style={styles.sectionLabel}>Facility Name</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter facility name..."
                        placeholderTextColor="#94a3b8"
                        value={facilityName}
                        onChangeText={onChangeFacilityName}
                      />
                      <View style={styles.inputAccent} />
                    </View>
                  </View>

                  {/* Time Open Section */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color="#FF9800" />
                      <Text style={styles.sectionLabel}>Operating Hours</Text>
                      <View style={styles.optionalBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 8:00 AM - 5:00 PM or 24/7"
                        placeholderTextColor="#94a3b8"
                        value={openTime}
                        onChangeText={onChangeOpenTime}
                      />
                      <View style={styles.inputAccent} />
                    </View>
                  </View>

                  {/* Description Section */}
                  <View style={styles.section}>
                    <View style={styles.labelRow}>
                      <MaterialCommunityIcons name="text" size={16} color="#FF9800" />
                      <Text style={styles.sectionLabel}>Description</Text>
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    </View>

                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.inputMultiline}
                        placeholder="Describe the medical facility and services offered..."
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
                      <MaterialCommunityIcons name="image-multiple" size={16} color="#FF9800" />
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
                            <TouchableOpacity
                              style={styles.removeMediaButton}
                              onPress={() => removeMedia(index)}
                              activeOpacity={0.8}
                            >
                              <Icon name="close" size={14} color="#fff" />
                            </TouchableOpacity>
                            <View style={styles.mediaOverlay}>
                              <MaterialCommunityIcons name="image" size={24} color="rgba(255,255,255,0.6)" />
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
                          <MaterialCommunityIcons name="camera-plus" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.addMediaText}>
                          {media && media.length > 0 ? "Add More Photos" : "Add Photos or Videos"}
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
  optionalBadge: {
    backgroundColor: "#e7f5ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  optionalText: {
    fontSize: 9,
    color: "#1976D2",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerContainer: {
    backgroundColor: "#fff8f0",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffe4cc",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#0f172a",
  },
  pickerDisabled: {
    opacity: 0.5,
    backgroundColor: "#f1f5f9",
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    backgroundColor: "#fff8f0",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 2,
    borderColor: "#ffe4cc",
    fontWeight: "500",
  },
  inputMultiline: {
    backgroundColor: "#fff8f0",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#0f172a",
    minHeight: 100,
    borderWidth: 2,
    borderColor: "#ffe4cc",
    fontWeight: "500",
  },
  inputAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#FF9800",
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  mediaCount: {
    backgroundColor: "#fff8f0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mediaCountText: {
    fontSize: 10,
    color: "#FF9800",
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
    backgroundColor: "#ef4444",

    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 5,
  },
  addMediaButton: {
    backgroundColor: "#fff8f0",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#FF9800",
  },
  addMediaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffe4cc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  addMediaText: {
    fontSize: 15,
    color: "#FF9800",
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
    backgroundColor: "#FF9800",
    shadowColor: "#FF9800",
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

export default MedicalPinModal;