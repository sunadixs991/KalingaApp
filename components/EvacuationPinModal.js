import React, { useEffect, useState } from "react";
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
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import { Picker } from "@react-native-picker/picker";

const MAX_MEDIA_COUNT = 3;
const DEFAULT_CATEGORY = "Evacuation Center";

const EvacuationPinModal = ({
  visible,
  description,
  onChangeDescription,
  onCancel,
  onSave,
  media,
  setMedia,
  capacity,
  onChangeCapacity,
  facilityName,
  onChangeFacilityName,
  purok,
  onChangePurok,
  barangay,
  onChangeBarangay,
  sitio,
  onChangeSitio,
  purokListOverride,
}) => {
  const [barangayList, setBarangayList] = useState([]);
  const [purokList, setPurokList] = useState([]);
  const [barangayMap, setBarangayMap] = useState({});

  const resolvedBarangay = barangay ?? sitio;

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

  const handleSave = () => {
    const selectedCategory = DEFAULT_CATEGORY;

    if (!facilityName || !facilityName.trim()) {
      Alert.alert("Facility Name Required", "Please enter the name of the facility.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Description Required", "Please enter a description for this pin.");
      return;
    }
    if (!capacity || isNaN(Number(capacity))) {
      Alert.alert("Capacity Required", "Please enter a valid capacity.");
      return;
    }

    const finalBarangay = resolvedBarangay || "";

    onSave(selectedCategory, {
      facilityName,
      purok,
      barangay: finalBarangay,
      description,
      capacity,
      media,
    });
  };

  const handleCancel = () => {
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
            asset.fileName || `gallery-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`,
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

  const callChangeBarangay = (val) => {
    if (typeof onChangeBarangay === "function") {
      onChangeBarangay(val);
    }
    if (typeof onChangeSitio === "function") {
      onChangeSitio(val);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerIcon}>📍</Text>
            </View>
            <Text style={styles.title}>Add Evacuation Center</Text>
            <Text style={styles.subtitle}>Fill in the details below</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Facility Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Facility Name <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>🏢</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., City Gymnasium"
                  value={facilityName}
                  onChangeText={onChangeFacilityName}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Location Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📍 Location Details</Text>
              
              {/* Barangay Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Barangay <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={resolvedBarangay || ""}
                    onValueChange={(val) => callChangeBarangay(val)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Barangay" value="" color="#999" />
                    {barangayList.map((b, idx) => (
                      <Picker.Item key={idx} label={b} value={b} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Purok Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Purok</Text>
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
                      label={resolvedBarangay ? "Select Purok" : "Select Barangay first"}
                      value=""
                      color="#999"
                    />
                    {purokList.map((p, idx) => (
                      <Picker.Item key={idx} label={p} value={p} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Capacity Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Capacity <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputIcon}>👥</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Number of people"
                  value={capacity}
                  onChangeText={onChangeCapacity}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Description <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe the evacuation center (facilities, amenities, etc.)"
                  value={description}
                  onChangeText={onChangeDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Media Section */}
            <View style={styles.mediaSection}>
              <View style={styles.mediaSectionHeader}>
                <Text style={styles.label}>Photos/Videos</Text>
                <Text style={styles.mediaCount}>
                  {media ? media.length : 0}/{MAX_MEDIA_COUNT}
                </Text>
              </View>
              
              {(!media || media.length < MAX_MEDIA_COUNT) && (
                <TouchableOpacity
                  onPress={pickMedia}
                  style={styles.uploadButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadText}>
                    {media && media.length > 0 ? "Add More" : "Upload Media"}
                  </Text>
                  <Text style={styles.uploadHint}>Camera or Gallery</Text>
                </TouchableOpacity>
              )}
              
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
                        style={styles.removeButton}
                        onPress={() => removeMedia(index)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.removeIcon}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save Pin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default EvacuationPinModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "92%",
    maxWidth: 440,
    maxHeight: "88%",
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    backgroundColor: "#1976D2",
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E53935",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: "#E1E8ED",
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    paddingVertical: 14,
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingTop: 12,
    paddingBottom: 12,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  sectionCard: {
    backgroundColor: "#F8FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8EEF2",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976D2",
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E1E8ED",
    overflow: "hidden",
  },
  pickerDisabled: {
    backgroundColor: "#F5F5F5",
    opacity: 0.6,
  },
  picker: {
    height: 50,
  },
  mediaSection: {
    marginBottom: 10,
  },
  mediaSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mediaCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1976D2",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  uploadButton: {
    backgroundColor: "#F5F7FA",
    borderWidth: 2,
    borderColor: "#1976D2",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976D2",
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 13,
    color: "#666",
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  mediaItem: {
    width: "31%",
    aspectRatio: 1,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E8EEF2",
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#E53935",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  removeIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8EEF2",
    backgroundColor: "#FAFBFC",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#1976D2",
    alignItems: "center",
    shadowColor: "#1976D2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});