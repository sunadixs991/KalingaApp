import React, { useState } from 'react';
import { Marker } from 'react-native-maps';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

const PinMarker = ({ pins, currentLocation, icon }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);

  const handleMarkerPress = (pin) => {
    setSelectedPin(pin);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPin(null);
  };

  return (
    <>
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          onPress={() => handleMarkerPress(pin)}
          title={pin.description || 'User'} // This will still show briefly on tap
        />
      ))}

      {currentLocation && icon && (
        <Marker coordinate={currentLocation}>
          {typeof icon === 'function' ? icon() : React.cloneElement(icon)}
        </Marker>
      )}
      {currentLocation && !icon && (
        <Marker coordinate={currentLocation} />
      )}

      {/* Modal for displaying full pin information */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedPin && (
              <>
                {/* Title */}
                <Text style={styles.modalTitle} numberOfLines={0}>
                  {selectedPin.description || 'User'}
                </Text>
                
                {/* User */}
                <Text style={styles.modalUser} numberOfLines={0}>
                  By {selectedPin.userFirstName}
                </Text>
                
                {/* Votes */}
                <Text style={styles.modalVotes} numberOfLines={0}>
                  👍 {selectedPin.upvotes || 0} 👎 {selectedPin.downvotes || 0}
                </Text>
                
                {/* Additional info can be added here */}
                {selectedPin.additionalInfo && (
                  <Text style={styles.modalAdditional} numberOfLines={0}>
                    {selectedPin.additionalInfo}
                  </Text>
                )}
                
                {/* Close button */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={closeModal}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '85%',
    maxWidth: 400,
    maxHeight: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
  },
  modalUser: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: '#666',
  },
  modalVotes: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#888',
  },
  modalAdditional: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PinMarker;