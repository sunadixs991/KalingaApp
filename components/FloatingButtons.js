import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const FloatingButtons = ({ onPin, onLocate, onClear, hasRoute }) => {
  return (
    <>
      {/* Clear Route Button - only visible if hasRoute is true */}
      {hasRoute && (
        <TouchableOpacity style={[styles.circleButton, styles.clearButton]} onPress={onClear}>
          <Icon name="close-circle" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Pin Button */}
      <TouchableOpacity style={[styles.circleButton, styles.pinButton]} onPress={onPin}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Locate Button */}
      <TouchableOpacity style={styles.circleButton} onPress={onLocate}>
        <Icon name="navigate" size={24} color="#fff" />
      </TouchableOpacity>
    </>
  );
};

export default FloatingButtons;

const styles = StyleSheet.create({
  circleButton: {
    position: 'absolute',
    bottom: hp('3.5%'),
    right: wp('5%'),
    backgroundColor: '#EC6135',
    width: wp('13%'),
    height: wp('13%'),
    borderRadius: wp('6.5%'),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  pinButton: {
    bottom: hp('11%'),
    backgroundColor: '#49A5A2',
  },
  clearButton: {
    bottom: hp('18.5%'),
    backgroundColor: '#EC6135',
  },
});
