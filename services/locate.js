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

// Add this function inside your MapScreen component

const fetchRoute = async (startLoc, destLoc) => {
  const apiKey = "YOUR_GOOGLE_MAPS_API_KEY"; // Replace with your API key
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc.latitude},${startLoc.longitude}&destination=${destLoc.latitude},${destLoc.longitude}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    if (json.routes.length) {
      const points = decodePolyline(json.routes[0].overview_polyline.points);
      setRouteCoords(points);
    } else {
      Alert.alert("No route found");
    }
  } catch (e) {
    Alert.alert("Error", "Failed to fetch route");
  }
};

// Polyline decoder (Google polyline algorithm)
function decodePolyline(encoded) {
  let points = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}
