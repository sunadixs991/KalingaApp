// services/EarthquakeService.js
import axios from 'axios';

// Multiple earthquake data sources
const EMSC_API = 'https://www.seismicportal.eu/fdsnws/event/1/query';
const USGS_API = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

/**
 * Fetch earthquakes from EMSC (European-Mediterranean Seismological Centre)
 * Great global coverage including Asia/Pacific
 */
const fetchEMSCEarthquakes = async (
  latitude,
  longitude,
  radiusKm,
  minMagnitude,
  limit,
  maxDays
) => {
  try {
    const startTime = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await axios.get(EMSC_API, {
      params: {
        format: 'json',
        lat: latitude,
        lon: longitude,
        maxradius: (radiusKm / 111.32).toFixed(2), // Convert km to degrees
        minmag: minMagnitude,
        orderby: 'time',
        limit: limit,
        starttime: startTime,
      },
      timeout: 10000,
    });

    if (!response.data || !response.data.features) {
      return [];
    }

    const earthquakes = response.data.features.map((feature) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;

      return {
        id: feature.id || `emsc_${props.time}_${Math.random()}`,
        magnitude: parseFloat(props.mag) || 0,
        place: props.flynn_region || props.place || 'Unknown location',
        time: new Date(props.time),
        timeAgo: getTimeAgo(new Date(props.time).getTime()),
        latitude: coords[1],
        longitude: coords[0],
        depth: coords[2] || 0,
        url: `https://www.emsc-csem.org/Earthquake/earthquake.php?id=${feature.id}`,
        felt: 0,
        alert: null,
        tsunami: false,
        significance: 0,
        type: 'earthquake',
      };
    });

    return earthquakes.filter(eq => eq.magnitude > 0);
  } catch (error) {
    console.error('EMSC API error:', error.message);
    throw error;
  }
};

/**
 * Fetch earthquakes from USGS (Global data)
 */
const fetchUSGSEarthquakes = async (
  latitude,
  longitude,
  radiusKm,
  minMagnitude,
  limit,
  maxDays
) => {
  try {
    const startTime = new Date(Date.now() - maxDays * 24 * 60 * 60 * 1000).toISOString();
    
    const response = await axios.get(USGS_API, {
      params: {
        format: 'geojson',
        latitude: latitude,
        longitude: longitude,
        maxradiuskm: radiusKm,
        minmagnitude: minMagnitude,
        orderby: 'time',
        limit: limit,
        starttime: startTime,
      },
      timeout: 10000,
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
        alert: props.alert || null,
        tsunami: props.tsunami === 1,
        significance: props.sig,
        type: props.type,
      };
    });

    return earthquakes;
  } catch (error) {
    console.error('USGS API error:', error.message);
    throw error;
  }
};

/**
 * Fetch recent earthquakes near a location
 * Tries multiple sources for best coverage
 */
export const fetchNearbyEarthquakes = async (
  latitude,
  longitude,
  radiusKm = 300,
  minMagnitude = 1.0,
  limit = 100,
  maxDays = 30
) => {
  // Try EMSC first (great for Asia/Pacific region)
  try {
    console.log('🌍 Trying EMSC API...');
    const emscData = await fetchEMSCEarthquakes(
      latitude,
      longitude,
      radiusKm,
      minMagnitude,
      limit,
      maxDays
    );
    
    if (emscData && emscData.length > 0) {
      // Add distance calculation
      const withDistance = emscData.map(quake => ({
        ...quake,
        distanceKm: calculateDistance(
          latitude,
          longitude,
          quake.latitude,
          quake.longitude
        ),
      }));
      
      console.log(`✅ EMSC: Found ${withDistance.length} earthquakes`);
      return withDistance.sort((a, b) => b.time - a.time);
    }
  } catch (error) {
    console.log('⚠️ EMSC failed, trying USGS...');
  }

  // Fallback to USGS
  try {
    console.log('🌍 Trying USGS API...');
    const usgsData = await fetchUSGSEarthquakes(
      latitude,
      longitude,
      radiusKm,
      minMagnitude,
      limit,
      maxDays
    );
    console.log(`✅ USGS: Found ${usgsData.length} earthquakes`);
    return usgsData;
  } catch (error) {
    console.error('❌ All APIs failed:', error.message);
    throw new Error('Unable to fetch earthquake data. Please check your internet connection.');
  }
};

/**
 * Fetch significant earthquakes worldwide
 */
export const fetchSignificantEarthquakes = async (minMagnitude = 4.5) => {
  try {
    const response = await axios.get(USGS_API, {
      params: {
        format: 'geojson',
        minmagnitude: minMagnitude,
        orderby: 'time',
        limit: 20,
        starttime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      timeout: 10000,
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
 */
export const getMagnitudeColor = (magnitude) => {
  if (magnitude >= 7.0) return '#d32f2f'; // Red - Major
  if (magnitude >= 6.0) return '#f57c00'; // Orange - Strong
  if (magnitude >= 5.0) return '#ffa726'; // Light Orange - Moderate
  if (magnitude >= 4.0) return '#fdd835'; // Yellow - Light
  if (magnitude >= 3.0) return '#9ccc65'; // Light Green - Minor
  if (magnitude >= 2.0) return '#66bb6a'; // Green - Micro
  return '#81c784'; // Light Green - Very Small
};

/**
 * Get magnitude severity label
 */
export const getMagnitudeLabel = (magnitude) => {
  if (magnitude >= 8.0) return 'Great';
  if (magnitude >= 7.0) return 'Major';
  if (magnitude >= 6.0) return 'Strong';
  if (magnitude >= 5.0) return 'Moderate';
  if (magnitude >= 4.0) return 'Light';
  if (magnitude >= 3.0) return 'Minor';
  if (magnitude >= 2.0) return 'Micro';
  return 'Very Small';
};

/**
 * Get alert level color
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