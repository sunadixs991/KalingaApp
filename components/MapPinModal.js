import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert 
} from 'react-native';
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
  "Portable Toilets"
];

const MapPinModal = ({ 
  visible, 
  description, 
  onChangeDescription, 
  onCancel, 
  onSave,
  selectedCategory,
  onCategoryChange 
}) => {
  const [showCategories, setShowCategories] = useState(false);

  // Debug logging
  console.log("MapPinModal Props:", {
    visible,
    description,
    selectedCategory,
    onCategoryChange: typeof onCategoryChange
  });

  const handleCategorySelect = (category) => {
    console.log("Category selected:", category);
    onCategoryChange(category);
    setShowCategories(false);
  };

  const handleSave = () => {
    console.log("Save pressed. Category:", selectedCategory, "Description:", description);
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
                console.log("Category selector pressed, current showCategories:", showCategories);
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