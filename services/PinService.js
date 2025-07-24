// ../services/PinService.js
import { db } from "../firebase";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Format distance for display
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
};

/**
 * Get total vote score for a pin (upvotes - downvotes)
 * @param {Object} pin - Pin object
 * @returns {number} Net vote score
 */
export const getPinVoteScore = (pin) => {
  return (pin.upvotes || 0) - (pin.downvotes || 0);
};

/**
 * Format vote information for display
 * @param {Object} pin - Pin object
 * @returns {string} Formatted vote string
 */
export const formatVotes = (pin) => {
  const upvotes = pin.upvotes || 0;
  const downvotes = pin.downvotes || 0;
  const netScore = getPinVoteScore(pin);
  
  if (netScore > 0) {
    return `+${netScore} votes (👍${upvotes} 👎${downvotes})`;
  } else if (netScore < 0) {
    return `${netScore} votes (👍${upvotes} 👎${downvotes})`;
  } else {
    return `${upvotes + downvotes} votes (👍${upvotes} 👎${downvotes})`;
  }
};

/**
 * Fetch all pins from Firestore and calculate distances
 * @param {Object} userLocation - User's current location {latitude, longitude}
 * @param {number} maxDistance - Maximum distance in km (optional, default: 50)
 * @param {number} limitCount - Maximum number of pins to return (optional, default: 20)
 * @returns {Array} Array of pins with distance information
 */
export const fetchNearbyPins = async (userLocation, maxDistance = 50, limitCount = 20) => {
  try {
    console.log('Fetching pins from database...');
    console.log('User location:', userLocation);
    console.log('Max distance:', maxDistance, 'km');
    console.log('Limit count:', limitCount);
    
    // Query pins from Firestore (ordered by creation date, newest first)
    const q = query(
      collection(db, "pins"),
      orderBy("createdAt", "desc"),
      limit(limitCount * 2) // Fetch more than needed to filter by distance
    );
    
    const querySnapshot = await getDocs(q);
    const pins = [];
    
    console.log(`Found ${querySnapshot.size} total pins from database`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Processing pin ${doc.id}:`, data);
      
      if (data.latitude && data.longitude) {
        // Calculate distance from user's location
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          data.latitude,
          data.longitude
        );
        
        console.log(`Pin ${doc.id} distance: ${distance}km`);
        
        // Only include pins within maxDistance
        if (distance <= maxDistance) {
          pins.push({
            id: doc.id,
            latitude: data.latitude,
            longitude: data.longitude,
            userId: data.userId,
            userFirstName: data.userFirstName || "Anonymous",
            description: data.description || "No description",
            category: data.category || "Unknown",
            createdAt: data.createdAt,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            distance: distance,
            formattedDistance: formatDistance(distance)
          });
        }
      } else {
        console.log(`Pin ${doc.id} missing coordinates`);
      }
    });
    
    // Sort by distance (closest first)
    pins.sort((a, b) => a.distance - b.distance);
    
    // Return only the requested number of pins
    const result = pins.slice(0, limitCount);
    console.log(`Returning ${result.length} nearby pins within ${maxDistance}km`);
    
    return result;
    
  } catch (error) {
    console.error("Error fetching nearby pins:", error);
    throw error;
  }
};

/**
 * Get pins by category
 * @param {Object} userLocation - User's current location {latitude, longitude}
 * @param {string} category - Category to filter by
 * @param {number} maxDistance - Maximum distance in km (optional, default: 50)
 * @returns {Array} Array of pins filtered by category
 */
export const fetchPinsByCategory = async (userLocation, category, maxDistance = 50) => {
  try {
    const allPins = await fetchNearbyPins(userLocation, maxDistance, 100);
    return allPins.filter(pin => pin.category === category);
  } catch (error) {
    console.error("Error fetching pins by category:", error);
    throw error;
  }
};