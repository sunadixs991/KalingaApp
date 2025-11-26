import { Linking, Platform, Alert } from "react-native";
import * as Location from "expo-location";

let _locationSubscription = null;

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
}

// Polyline decoder (Google polyline algorithm)
function decodePolyline(encoded) {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

/**
 * Fetch directions from Google Directions API and return decoded polyline points.
 * Returns array [{latitude, longitude}, ...]
 */
export async function fetchRoute(startLoc, destLoc, apiKey) {
  if (!startLoc || !destLoc) return [];
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startLoc.latitude},${startLoc.longitude}&destination=${destLoc.latitude},${destLoc.longitude}&key=${apiKey}`;
  try {
    const response = await fetch(url);
    const json = await response.json();
    if (json.routes && json.routes.length) {
      const points = decodePolyline(json.routes[0].overview_polyline.points);
      return points;
    }
    return [];
  } catch (e) {
    console.warn("fetchRoute error", e);
    return [];
  }
}

/**
 * Start tracking user's location and update route when user moves.
 * onRouteUpdate(points) -> called with new polyline points
 * onLocationUpdate(loc) -> called with {latitude, longitude}
 * options: { apiKey, distanceThreshold (meters), timeInterval (ms) }
 * Returns the subscription (so caller can remove if desired).
 */
export async function startRouteTracking(destLoc, onRouteUpdate, onLocationUpdate, options = {}) {
  const { apiKey, distanceThreshold = 10, timeInterval = 4000 } = options;
  if (!apiKey) {
    Alert.alert("Missing API key", "Provide Google Maps API key in options.apiKey");
    return null;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission required", "Location permission is required to get routing.");
    return null;
  }

  // initial position
  const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const startLoc = { latitude: current.coords.latitude, longitude: current.coords.longitude };
  onLocationUpdate?.(startLoc);

  // initial route
  const initialPoints = await fetchRoute(startLoc, destLoc, apiKey);
  onRouteUpdate?.(initialPoints);

  // watch for movement — distanceInterval prevents too-frequent updates
  _locationSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Highest, distanceInterval: distanceThreshold, timeInterval },
    async (loc) => {
      const newLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      onLocationUpdate?.(newLoc);

      // re-fetch route from new location to destination
      const points = await fetchRoute(newLoc, destLoc, apiKey);
      onRouteUpdate?.(points);
    }
  );

  return _locationSubscription;
}

export function stopRouteTracking() {
  if (_locationSubscription) {
    _locationSubscription.remove();
    _locationSubscription = null;
  }
}
