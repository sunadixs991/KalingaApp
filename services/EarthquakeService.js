// services/EarthquakeService.js
import axios from 'axios';

// USGS Earthquake API Configuration
// No API key needed - completely free!
const USGS_BASE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

/**
 * Fetch recent earthquakes near a location
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @param {number} radiusKm - Search radius in kilometers (default: 500km)
 * @param {number} minMagnitude - Minimum magnitude to show (default: 2.5)
 * @param {number} limit - Maximum number of results (default: 10)
 * @returns {Promise<Array>} Array of earthquake data
 */
export const fetchNearbyEarthquakes = async (
  latitude,
  longitude,
  radiusKm = 500,
  minMagnitude = 2.5,
  limit = 10
) => {
  try {
    const response = await axios.get(USGS_BASE_URL, {
      params: {
        format: 'geojson',
        latitude: latitude,
        longitude: longitude,
        maxradiuskm: radiusKm,
        minmagnitude: minMagnitude,
        orderby: 'time',
        limit: limit,
      },
    });

    const earthquakes = response.data.features.map((feature) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      return {
        id: feature.id,
        magnitude: props.mag,
        place: props.place,
        time: new Date(props.time),
        timeAgo: getTimeAgo(props.time),
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2],
        url: props.url,
        felt: props.felt || 0,
        alert: props.alert || null, // green, yellow, orange, red
        tsunami: props.tsunami === 1,
        significance: props.sig,
      };
    });

    return earthquakes;
  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    throw error;
  }
};

/**
 * Fetch significant earthquakes worldwide (last 7 days)
 * @param {number} minMagnitude - Minimum magnitude (default: 4.5)
 * @returns {Promise<Array>} Array of significant earthquakes
 */
export const fetchSignificantEarthquakes = async (minMagnitude = 4.5) => {
  try {
    const response = await axios.get(USGS_BASE_URL, {
      params: {
        format: 'geojson',
        minmagnitude: minMagnitude,
        orderby: 'time',
        limit: 20,
        starttime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
      },
    });

    const earthquakes = response.data.features.map((feature) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      return {
        id: feature.id,
        magnitude: props.mag,
        place: props.place,
        time: new Date(props.time),
        timeAgo: getTimeAgo(props.time),
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2],
        url: props.url,
        alert: props.alert || null,
        tsunami: props.tsunami === 1,
      };
    });

    return earthquakes;
  } catch (error) {
    console.error('Error fetching significant earthquakes:', error);
    throw error;
  }
};

/**
 * Get magnitude color based on earthquake severity
 * @param {number} magnitude
 * @returns {string} Color hex code
 */
export const getMagnitudeColor = (magnitude) => {
  if (magnitude >= 7.0) return '#d32f2f'; // Red - Major
  if (magnitude >= 6.0) return '#f57c00'; // Orange - Strong
  if (magnitude >= 5.0) return '#ffa726'; // Light Orange - Moderate
  if (magnitude >= 4.0) return '#fdd835'; // Yellow - Light
  if (magnitude >= 3.0) return '#9ccc65'; // Light Green - Minor
  return '#66bb6a'; // Green - Micro
};

/**
 * Get magnitude severity label
 * @param {number} magnitude
 * @returns {string} Severity label
 */
export const getMagnitudeLabel = (magnitude) => {
  if (magnitude >= 8.0) return 'Great';
  if (magnitude >= 7.0) return 'Major';
  if (magnitude >= 6.0) return 'Strong';
  if (magnitude >= 5.0) return 'Moderate';
  if (magnitude >= 4.0) return 'Light';
  if (magnitude >= 3.0) return 'Minor';
  return 'Micro';
};

/**
 * Get alert level color
 * @param {string} alert - green, yellow, orange, red
 * @returns {string} Color hex code
 */
export const getAlertColor = (alert) => {
  switch (alert?.toLowerCase()) {
    case 'red':
      return '#d32f2f';
    case 'orange':
      return '#f57c00';
    case 'yellow':
      return '#fdd835';
    case 'green':
      return '#66bb6a';
    default:
      return '#9e9e9e';
  }
};

/**
 * Calculate time ago from timestamp
 * @param {number} timestamp
 * @returns {string} Human-readable time ago
 */
const getTimeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees) => {
  return (degrees * Math.PI) / 180;
};