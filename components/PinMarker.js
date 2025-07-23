import React from 'react';
import { Marker } from 'react-native-maps';

const PinMarker = ({ pins, currentLocation, icon }) => {
  return (
    <>
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          title={pin.userFirstName || 'User'}
          description={pin.description}
        />
      ))}
      {currentLocation && (
        <Marker coordinate={currentLocation}>
          {icon}
        </Marker>
      )}
    </>
  );
};

export default PinMarker;
