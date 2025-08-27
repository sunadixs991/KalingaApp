import { Linking, Platform, Alert } from "react-native";

/**
 * Opens the default maps app with directions from user's location to the pin.
 * @param {object} userLocation - { latitude, longitude }
 * @param {object} pinLocation - { latitude, longitude }
 */
export const handleGoToPin = (userLocation, pinLocation) => {
  if (!userLocation || !pinLocation) {
    Alert.alert("Error", "Location data is missing.");
    return;
  }

  const { latitude: startLat, longitude: startLng } = userLocation;
  const { latitude: destLat, longitude: destLng } = pinLocation;

  let url = "";

  if (Platform.OS === "ios") {
    url = `http://maps.apple.com/?saddr=${startLat},${startLng}&daddr=${destLat},${destLng}`;
  } else {
    url = `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }

  Linking.openURL(url).catch(() => {
    Alert.alert("Error", "Unable to open maps.");
  });
};

export const handleReportPin = () => {
  Alert.alert(
    "Report",
    "This pin has been reported successfully.",
    [{ text: "OK" }]
  );
};
