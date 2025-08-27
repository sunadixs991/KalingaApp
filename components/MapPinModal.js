import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const CATEGORIES = [
  "Clean Drinking Water",
  "Medical Aid",
  "First Aid Kit",
  "Charging Station",
  "Free Wi-Fi Access",
  "Clothing Supply",
  "Blankets Supply",
  "Animal Shelter",
  "Temporary Shelter",
  "Rescue Equipment",
  "Sanitation Facility",
  "Portable Toilets",
  "Others"
];

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
          text: 'Files',
          onPress: () => pickFromFiles(),
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

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newMedia = {
          uri: asset.uri,
          type: asset.mimeType || 'image/jpeg',
          fileName: asset.name || `file-${Date.now()}.jpg`
        };
        
        setMedia(media ? [...media, newMedia] : [newMedia]);
      }
    } catch (error) {
      console.log('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const removeMedia = (index) => {
    const newMedia = media.filter((_, i) => i !== index);
    setMedia(newMedia.length > 0 ? newMedia : null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Pin Details</Text>
          
          {/* DEBUG INFO */}
          {/* <Text style={{ fontSize: 12, color: 'red', marginBottom: 10 }}>
            DEBUG - Category: {selectedCategory || 'NONE'} | Show: {showCategories ? 'YES' : 'NO'}
          </Text> */}
          
          {/* Category Selection */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionLabel}>Category *</Text>
            <TouchableOpacity 
              style={styles.categorySelector}
              onPress={() => {
                setShowCategories(!showCategories);
              }}
            >
              <Text style={[
                styles.categorySelectorText,
                selectedCategory ? styles.selectedCategoryText : styles.placeholderText
              ]}>
                {selectedCategory || "Select a category..."}
              </Text>
              <Text style={styles.dropdownArrow}>
                {showCategories ? "▲" : "▼"}
              </Text>
            </TouchableOpacity>

            {/* Category Dropdown */}
            {showCategories && (
              <View style={styles.categoryDropdown}>
                <ScrollView style={styles.categoryScrollView} nestedScrollEnabled>
                  {CATEGORIES.map((category, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.categoryOption,
                        selectedCategory === category && styles.selectedCategoryOption
                      ]}
                      onPress={() => handleCategorySelect(category)}
                    >
                      <Text style={[
                        styles.categoryOptionText,
                        selectedCategory === category && styles.selectedCategoryOptionText
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Description Input */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionLabel}>Description *</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe this location..."
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
                  {media ? "Add More Media" : "Pick Image or Video"}
                </Text>
              </TouchableOpacity>
            )}
            
            {/* Media Preview Grid */}
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
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={handleCancel}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleSave}
            >
              <Text style={styles.buttonText}>Save Pin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default MapPinModal;

const styles = StyleSheet.create({
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
    maxHeight: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: wp('5%'),
    marginBottom: hp('2.5%'),
    textAlign: 'center',
    color: '#333',
  },
  categorySection: {
    marginBottom: hp('2%'),
    backgroundColor: '#f9f9f9', // Debug: make section visible
    padding: 10,
    borderRadius: 5,
  },
  descriptionSection: {
    marginBottom: hp('2.5%'),
  },
  mediaSection: {
    marginBottom: hp('2.5%'),
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: wp('3%'),
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    fontSize: wp('3.8%'),
    color: '#333',
    minHeight: hp('8%'),
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
    justifyContent: 'space-between',
    marginTop: 10,
  },
  mediaPreviewItem: {
    width: '31%',
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
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMediaText: {
    color: '#fff',
    fontSize: wp('3%'),
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
  },
  cancelButton: {
    backgroundColor: '#EC6135',
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