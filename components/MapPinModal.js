import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const MapPinModal = ({ visible, description, onChangeDescription, onCancel, onSave }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add a Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe this location..."
            value={description}
            onChangeText={onChangeDescription}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={onSave}>
              <Text style={styles.buttonText}>Save</Text>
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
    elevation: 5,
  },
  modalTitle: {
    fontWeight: '700',
    fontSize: wp('5%'),
    marginBottom: hp('2%'),
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: wp('3%'),
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    marginBottom: hp('2.5%'),
    fontSize: wp('3.8%'),
    color: '#333',
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
