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
  Image
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

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
  sitio,
  onChangeSitio,
}) => {
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
    // Pass selectedCategory and new fields to onSave if needed
    onSave(selectedCategory, {
      facilityName,
      purok,
      sitio,
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
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
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
          <Text style={styles.title}>Add Evacuation Pin</Text>
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Facility Name Input */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Name of Facility</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter facility name"
                value={facilityName}
                onChangeText={onChangeFacilityName}
              />
            </View>

            {/* Purok Input */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Purok</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Purok (optional)"
                value={purok}
                onChangeText={onChangePurok}
              />
            </View>

            {/* Sitio Input */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Sitio (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Sitio (optional)"
                value={sitio}
                onChangeText={onChangeSitio}
              />
            </View>

            {/* Capacity Input */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Capacity</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter capacity (number)"
                value={capacity}
                onChangeText={onChangeCapacity}
                keyboardType="numeric"
              />
            </View>

            {/* Description Input */}
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Describe this evacuation center..."
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
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
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

export default EvacuationPinModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    fontSize: 16,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
  },
  categoryBtn: {
    backgroundColor: "#eee",
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  selectedCategoryBtn: {
    backgroundColor: "#1976D2",
  },
  categoryText: {
    color: "#333",
    fontWeight: "500",
  },
  selectedCategoryText: {
    color: "#fff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  cancelBtn: {
    backgroundColor: "#999",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 10,
  },
  saveBtn: {
    backgroundColor: "#1976D2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp('6%'),
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: wp('5%'),
    borderRadius: wp('5%'),
    width: '90%',
    maxHeight: '90%',
    elevation: 5,
  },
  sectionLabel: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#555',
    marginBottom: hp('1%'),
  },
  categorySelector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: wp('3%'),
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  categorySelectorText: {
    fontSize: wp('3.8%'),
    flex: 1,
  },
  selectedCategoryText: {
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: wp('3%'),
    color: '#666',
    marginLeft: wp('2%'),
  },
  categoryDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderTopWidth: 0,
    borderBottomLeftRadius: wp('3%'),
    borderBottomRightRadius: wp('3%'),
    maxHeight: hp('20%'),
    zIndex: 1000,
    elevation: 5,
  },
  categoryScrollView: {
    flex: 1,
  },
  categoryOption: {
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('4%'),
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  selectedCategoryOption: {
    backgroundColor: '#49A5A2',
  },
  categoryOptionText: {
    fontSize: wp('3.6%'),
    color: '#333',
  },
  selectedCategoryOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: hp('2.5%'),
  },
  mediaSection: {
    marginBottom: hp('2.5%'),
  },
  mediaPickerButton: {
    padding: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  mediaPickerText: {
    color: "#333",
    fontSize: wp('3.6%'),
    fontWeight: '500',
  },
  mediaPreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  mediaPreviewItem: {
    width: '27%',
    aspectRatio: 1,
    marginBottom: 10,
    position: 'relative',
  },
  mediaPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  removeMediaButton: {
    position: 'absolute',
    top: -4,
    right: -5,
    backgroundColor: '#ff4444',
    width: 16,
    height: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaText: {
    color: '#fff',
    fontSize: wp('2.5%'),
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: hp('1.5%'),
    borderRadius: wp('3%'),
    alignItems: 'center',
    marginHorizontal: wp('1.5%'),
    elevation: 2,
    marginBottom: 0,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  saveButton: {
    backgroundColor: '#49A5A2',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: wp('3.5%'),
  },
});