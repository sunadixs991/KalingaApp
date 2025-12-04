import { scanImageWithSightengine } from "../services/sightengine";
import * as Location from "expo-location";

// Resolve barangay/local area name from coordinates.
// - tries provided getBarangayFromCoords function first (if passed)
// - falls back to Expo Location.reverseGeocodeAsync
// - prioritizes subregion, district, neighborhood (actual barangay-level data)
// - throws error if barangay cannot be determined
async function resolveBarangayFromCoords(latitude, longitude, getBarangayFromCoords) {
  try {
    // Try custom barangay resolver first
    if (typeof getBarangayFromCoords === "function") {
      try {
        const name = await getBarangayFromCoords(latitude, longitude);
        if (name && name !== "Unknown" && name !== "Cebu" && !isCity(name)) {
          return name;
        }
      } catch (e) {
        console.warn("getBarangayFromCoords failed:", e);
      }
    }

    // Try Expo Location reverse geocoding
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (places && places.length > 0) {
          const p = places[0];

          // PRIORITY ORDER: More specific to less specific
          // 1. district (often barangay in PH)
          // 2. subregion (sometimes barangay)
          // 3. neighborhood
          // 4. name (if it's not a city/province)

          const candidates = [
            p.district,
            p.subregion,
            p.neighborhood,
            p.name,
          ].filter(Boolean); // Remove null/undefined values

          // Find the first candidate that is NOT a city or province
          for (const candidate of candidates) {
            if (candidate && !isCity(candidate) && candidate !== "Unknown") {
              return candidate;
            }
          }

          // If all else fails and we only have city-level data, throw error
          throw new Error("Only city-level location data available");
        }
      }
    } catch (e) {
      console.warn("reverseGeocodeAsync failed:", e);
      throw e;
    }
  } catch (err) {
    console.warn("resolveBarangayFromCoords unexpected error:", err);
  }

  // If we reach here, we couldn't determine the barangay
  throw new Error("Unable to determine barangay. The location may be too general (city/province level). Please:\n\n1. Zoom in closer on the map\n2. Select a more specific location\n3. Enable precise location services");
}

// Helper function to detect if a location name is a city or province
function isCity(name) {
  if (!name) return false;

  const lowerName = String(name).toLowerCase();

  // Common Philippine cities and provinces and generic terms to filter out
  const cityProvinceNames = [
    "cebu",
    "manila",
    "davao",
    "quezon city",
    "caloocan",
    "makati",
    "pasig",
    "taguig",
    "iloilo",
    "bacolod",
    "baguio",
    "cagayan de oro",
    "zamboanga",
    "antipolo",
    "cavite",
    "laguna",
    "batangas",
    "bulacan",
    "pampanga",
    "rizal",
    "metro manila",
    "ncr",
    "national capital region",
    "province",
    "city",
    "municipality",
  ];

  // Exact match or contains known city/province tokens
  for (const cityName of cityProvinceNames) {
    if (lowerName === cityName || lowerName.includes(cityName)) return true;
  }

  // If name contains words like "city" or "municipality" treat as non-barangay
  if (/\b(city|municipality|province|region|metro)\b/.test(lowerName)) return true;

  // Reject very short names as unlikely barangay (but allow common short barangays if needed)
  if (lowerName.length < 3) return true;

  return false;
}

// Helper to detect likely water/sea/ocean/bay names
function isWater(name) {
  if (!name) return false;
  const lower = String(name).toLowerCase();
  const waterKeywords = [
    "sea",
    "ocean",
    "bay",
    "gulf",
    "strait",
    "lagoon",
    "lake",
    "river",
    "marina",
    "harbor",
    "harbour",
    "channel",
    "estuary",
    "delta",
    "pond",
    "reservoir",
  ];
  for (const k of waterKeywords) {
    if (lower.includes(k)) return true;
  }
  return false;
}

// New: resolve a more accurate 'location' identifier (for pins & requests).
// Similar to resolveBarangayFromCoords but ensures it's not a water body and
// returns a general "location" string (name/street/neighborhood/district).
async function resolveLocationFromCoords(latitude, longitude, getBarangayFromCoords) {
  try {
    // Try custom resolver first (may return a precise location string)
    if (typeof getBarangayFromCoords === "function") {
      try {
        const name = await getBarangayFromCoords(latitude, longitude);
        if (name && name !== "Unknown" && !isCity(name) && !isWater(name)) {
          return name;
        }
      } catch (e) {
        console.warn("getBarangayFromCoords (location) failed:", e);
      }
    }

    // Try Expo reverse geocode
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (places && places.length > 0) {
          const p = places[0];

          // Build priority candidates (more precise first)
          const candidates = [
            p.name,
            p.street,
            p.neighborhood,
            p.district,
            p.subregion,
          ].filter(Boolean);

          for (const candidate of candidates) {
            if (candidate && !isCity(candidate) && !isWater(candidate) && candidate !== "Unknown") {
              return candidate;
            }
          }

          // If we still don't have a good candidate, attempt to compose a string
          const composed = [
            p.street,
            p.neighborhood,
            p.district,
            p.subregion,
            p.city || p.region,
          ].filter(Boolean).join(", ");

          if (composed && !isWater(composed) && composed.length > 3) {
            return composed;
          }

          // If result suggests water or is too generic, throw so callers reject saving
          throw new Error("Location appears to be water or too generic");
        }
      }
    } catch (e) {
      console.warn("reverseGeocodeAsync (location) failed:", e);
      throw e;
    }
  } catch (err) {
    console.warn("resolveLocationFromCoords unexpected error:", err);
  }

  throw new Error("Unable to determine a precise location. Please choose a different point or enable precise location services.");
}

export async function handleSaveEvacPin({
  evacDescription,
  evacCapacity,
  evacMedia,
  evacFacilityName,
  evacPurok,
  pendingEvacPin,
  userInfo,
  userFirstName,
  db,
  supabase,
  setEvacModalVisible,
  setEvacDescription,
  setEvacMedia,
  setEvacCapacity,
  setEvacFacilityName,
  setEvacPurok,
  setPinMode,
  setPendingEvacPin,
  setEvacPins,
  setAllPins,
  Alert,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  getBarangayFromCoords,
  manualBarangay, // optional override (manual selection in UI)
}) {
  if (!evacFacilityName || !evacFacilityName.trim()) {
    Alert.alert("Facility Name required", "Please enter the name of the facility.");
    return;
  }
  if (!evacDescription.trim()) {
    Alert.alert("Description required", "Please enter a description.");
    return;
  }
  if (!evacCapacity.trim() || isNaN(Number(evacCapacity))) {
    Alert.alert("Capacity required", "Please enter a valid capacity.");
    return;
  }

  try {
    // Use manualBarangay if provided; otherwise leave barangay blank.
    const barangayName =
      manualBarangay && String(manualBarangay).trim()
        ? String(manualBarangay).trim()
        : "";

    let mediaUrls = [];
    // --- Upload evacuation media to Supabase ---
    if (evacMedia && evacMedia.length > 0) {
      Alert.alert("Uploading", "Uploading image files...", []);
      for (let i = 0; i < evacMedia.length; i++) {
        const mediaItem = evacMedia[i];
        if (!mediaItem.type || !mediaItem.type.startsWith("image")) {
          Alert.alert(
            "Invalid File",
            "Only image files are allowed. Please remove any non-image files."
          );
          return;
        }
        const fileName = `evacuation_pins/${Date.now()}_${i}_${mediaItem.fileName || "media"}`;
        let uploadData;
        try {
          const formData = new FormData();
          formData.append("file", {
            uri: mediaItem.uri,
            type: mediaItem.type,
            name: mediaItem.fileName || `media_${i}.jpg`,
          });
          const { data, error } = await supabase.storage
            .from("pin-media")
            .upload(fileName, formData, {
              contentType: mediaItem.type,
              cacheControl: "3600",
              upsert: true,
            });
          if (error) {
            const response = await fetch(mediaItem.uri);
            if (!response.ok)
              throw new Error(`Failed to fetch media: ${response.status}`);
            const blob = await response.blob();
            const { data: blobData, error: blobError } = await supabase.storage
              .from("pin-media")
              .upload(fileName, blob, {
                contentType: mediaItem.type,
                cacheControl: "3600",
                upsert: true,
              });
            if (blobError) throw blobError;
            uploadData = blobData;
          } else {
            uploadData = data;
          }
        } catch (uploadError) {
          Alert.alert(
            "Upload Warning",
            `Failed to upload image file ${i + 1}: ${uploadError.message}. Continuing with other files...`
          );
          continue;
        }
        const { data: urlData } = supabase.storage
          .from("pin-media")
          .getPublicUrl(uploadData.path);
        mediaUrls.push({
          url: urlData.publicUrl,
          type: mediaItem.type,
          fileName: mediaItem.fileName,
          path: uploadData.path,
        });
      }
    }

    // --- Save evacuation pin to Firestore with provided Barangay (may be empty) ---
    await addDoc(collection(db, "evacuation_pins"), {
      latitude: pendingEvacPin.latitude,
      longitude: pendingEvacPin.longitude,
      userId: userInfo || "anonymous",
      userFirstName: userFirstName || "anonymous",
      facilityName: evacFacilityName.trim(),
      purok: evacPurok ? evacPurok.trim() : "",
      description: evacDescription.trim(),
      category: "Evacuation Center",
      capacity: evacCapacity.trim(),
      media: mediaUrls,
      createdAt: serverTimestamp(),
      barangay: barangayName,
    });

    setEvacModalVisible(false);
    setEvacDescription("");
    setEvacMedia(null);
    setEvacCapacity("");
    setEvacFacilityName("");
    setEvacPurok("");
    setPinMode(false);
    setPendingEvacPin(null);

    Alert.alert(
      "Evacuation Pin Added!",
      barangayName
        ? `The evacuation pin has been added successfully to ${barangayName}.`
        : "The evacuation pin has been added successfully."
    );

    // --- Refetch all evacuation pins after saving ---
    try {
      const snap = await getDocs(collection(db, "evacuation_pins"));
      const pins = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude) {
          pins.push({
            id: doc.id,
            latitude: data.latitude,
            longitude: data.longitude,
            userId: data.userId,
            userFirstName: data.userFirstName || "anonymous",
            facilityName: data.facilityName || "",
            purok: data.purok || "",
            description: data.description,
            category: data.category || "Evacuation",
            media: data.media || [],
            createdAt: data.createdAt,
            capacity: data.capacity || "",
            barangay: data.barangay || "Unknown",
          });
        }
      });
      setEvacPins(pins);
    } catch (error) {
      setEvacPins([]);
    }
    // --- Refetch all regular pins after saving ---
    try {
      const querySnapshot = await getDocs(collection(db, "pins"));
      const pins = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude) {
          pins.push({
            id: doc.id,
            latitude: data.latitude,
            longitude: data.longitude,
            userId: data.userId,
            userFirstName: data.userFirstName || "anonymous",
            description: data.description,
            category: data.category || "Unknown",
            media: data.media || [],
            createdAt: data.createdAt,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
          });
        }
      });
      setAllPins(pins);
    } catch (error) {
      setAllPins([]);
    }
  } catch (error) {
    console.error("Error saving evacuation pin:", error);
    Alert.alert(
      "Error",
      `There was an error adding the evacuation pin: ${error.message}. Please try again.`
    );
  }
}

export async function handleSavePin({
  selectedCategory,
  description,
  media,
  pendingPin,
  userInfo,
  userFirstName,
  db,
  supabase,
  setDescModalVisible,
  setDescription,
  setSelectedCategory,
  setMedia,
  setPinMode,
  setPendingPin,
  setAllPins,
  Alert,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  getBarangayFromCoords,
}) {
  if (!selectedCategory.trim()) {
    Alert.alert("Category required", "Please select a category.");
    return;
  }
  if (!description.trim()) {
    Alert.alert("Description required", "Please enter a description.");
    return;
  }

  try {
    // Resolve precise location FIRST - before uploading media
    Alert.alert("Please wait", "Determining precise location...", []);
    let locationName;
    try {
      locationName = await resolveLocationFromCoords(
        pendingPin.latitude,
        pendingPin.longitude,
        getBarangayFromCoords
      );
    } catch (error) {
      Alert.alert(
        "Location Required",
        "Unable to determine a precise location for this pin. Please:\n\n1. Move the pin to a more specific spot on land\n2. Enable precise location services\n3. Try selecting a different location\n\nPins cannot be placed on water or very general areas."
      );
      return;
    }

    let mediaUrls = [];

    // 1. Upload image files to SUPABASE STORAGE
    if (media && media.length > 0) {
      Alert.alert("Uploading", "Uploading image files...", []);

      for (let i = 0; i < media.length; i++) {
        const mediaItem = media[i];

        if (!mediaItem.type || !mediaItem.type.startsWith("image")) {
          Alert.alert(
            "Invalid File",
            "Only image files are allowed. Please remove any non-image files."
          );
          return;
        }

        const fileName = `pins/${Date.now()}_${i}_${mediaItem.fileName || "media"}`;

        let uploadData;
        try {
          const formData = new FormData();
          formData.append("file", {
            uri: mediaItem.uri,
            type: mediaItem.type,
            name: mediaItem.fileName || `media_${i}.jpg`,
          });

          const { data, error } = await supabase.storage
            .from("pin-media")
            .upload(fileName, formData, {
              contentType: mediaItem.type,
              cacheControl: "3600",
              upsert: true,
            });

          if (error) {
            const response = await fetch(mediaItem.uri);
            if (!response.ok)
              throw new Error(`Failed to fetch media: ${response.status}`);
            const blob = await response.blob();

            const { data: blobData, error: blobError } = await supabase.storage
              .from("pin-media")
              .upload(fileName, blob, {
                contentType: mediaItem.type,
                cacheControl: "3600",
                upsert: true,
              });

            if (blobError) throw blobError;
            uploadData = blobData;
          } else {
            uploadData = data;
          }
        } catch (uploadError) {
          Alert.alert(
            "Upload Warning",
            `Failed to upload image file ${i + 1}: ${uploadError.message}. Continuing with other files...`
          );
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("pin-media")
          .getPublicUrl(uploadData.path);

        mediaUrls.push({
          url: urlData.publicUrl,
          type: mediaItem.type,
          fileName: mediaItem.fileName,
          path: uploadData.path,
        });
      }
    }

    // 2. Save pin data with verified location to FIRESTORE
    await addDoc(collection(db, "pins"), {
      latitude: pendingPin.latitude,
      longitude: pendingPin.longitude,
      userId: userInfo || "anonymous",
      userFirstName: userFirstName || "anonymous",
      description: description.trim(),
      category: selectedCategory.trim(),
      media: mediaUrls,
      createdAt: serverTimestamp(),
      upvotes: 0,
      downvotes: 0,
      location: locationName,
    });

    setDescModalVisible(false);
    setDescription("");
    setSelectedCategory("");
    setMedia(null);
    setPinMode(false);
    setPendingPin(null);

    const successMessage =
      mediaUrls.length > 0
        ? `Your location has been pinned successfully at ${locationName} with ${mediaUrls.length} image(s).`
        : `Your location has been pinned successfully at ${locationName}.`;

    Alert.alert("Location pinned!", successMessage);

    // 4. Refresh pins from FIRESTORE
    const querySnapshot = await getDocs(collection(db, "pins"));
    const pins = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.latitude && data.longitude) {
        pins.push({
          id: doc.id,
          latitude: data.latitude,
          longitude: data.longitude,
          userId: data.userId,
          userFirstName: data.userFirstName || "anonymous",
          description: data.description,
          category: data.category || "Unknown",
          media: data.media || [],
          createdAt: data.createdAt,
          upvotes: data.upvotes || 0,
          downvotes: data.downvotes || 0,
          location: data.location || "Unknown",
        });
      }
    });
    setAllPins(pins);
  } catch (error) {
    console.error("Error saving pin:", error);
    Alert.alert(
      "Error",
      `There was an error pinning your location: ${error.message}. Please try again.`
    );
  }
}

export async function handleSaveMedicalPin({
  medicalDescription,
  medicalMedia,
  medicalOpenTime,
  pendingMedicalPin,
  userInfo,
  userFirstName,
  db,
  supabase,
  setMedicalModalVisible,
  setMedicalDescription,
  setMedicalMedia,
  setMedicalOpenTime,
  setPendingMedicalPin,
  setPinMode,
  setMedicalPinMode,
  Alert,
  collection,
  addDoc,
  serverTimestamp,
  getBarangayFromCoords,
  getDocs,
  setAllPins,
  setMedicalPins,
  manualBarangay, // optional override (manual selection in UI)
}) {
  if (!medicalDescription.trim()) {
    Alert.alert("Description required", "Please enter a description.");
    return;
  }
  // Default openTime to "24/7" if empty
  const timeOpenToSave =
    medicalOpenTime && medicalOpenTime.trim()
      ? medicalOpenTime.trim()
      : "24/7";

  try {
    // Use manualBarangay if provided; otherwise leave barangay blank.
    const barangayName =
      manualBarangay && String(manualBarangay).trim()
        ? String(manualBarangay).trim()
        : "";

    let mediaUrls = [];
    if (medicalMedia && medicalMedia.length > 0) {
      Alert.alert("Uploading", "Uploading image files...", []);
      for (let i = 0; i < medicalMedia.length; i++) {
        const mediaItem = medicalMedia[i];
        if (!mediaItem.type || !mediaItem.type.startsWith("image")) {
          Alert.alert("Invalid File", "Only image files are allowed.");
          return;
        }
        const fileName = `medical_pins/${Date.now()}_${i}_${mediaItem.fileName || "media"}`;
        let uploadData;
        try {
          const formData = new FormData();
          formData.append("file", {
            uri: mediaItem.uri,
            type: mediaItem.type,
            name: mediaItem.fileName || `media_${i}.jpg`,
          });
          const { data, error } = await supabase.storage
            .from("pin-media")
            .upload(fileName, formData, {
              contentType: mediaItem.type,
              cacheControl: "3600",
              upsert: true,
            });
          if (error) {
            const response = await fetch(mediaItem.uri);
            if (!response.ok) throw new Error(`Failed to fetch media: ${response.status}`);
            const blob = await response.blob();
            const { data: blobData, error: blobError } = await supabase.storage
              .from("pin-media")
              .upload(fileName, blob, {
                contentType: mediaItem.type,
                cacheControl: "3600",
                upsert: true,
              });
            if (blobError) throw blobError;
            uploadData = blobData;
          } else {
            uploadData = data;
          }
        } catch (uploadError) {
          Alert.alert("Upload Warning", `Failed to upload image file ${i + 1}: ${uploadError.message}.`);
          continue;
        }
        const { data: urlData } = supabase.storage
          .from("pin-media")
          .getPublicUrl(uploadData.path);
        mediaUrls.push({
          url: urlData.publicUrl,
          type: mediaItem.type,
          fileName: mediaItem.fileName,
          path: uploadData.path,
        });
      }
    }

    await addDoc(collection(db, "medical_pins"), {
      latitude: pendingMedicalPin.latitude,
      longitude: pendingMedicalPin.longitude,
      userId: userInfo || "anonymous",
      userFirstName: userFirstName || "anonymous",
      description: medicalDescription.trim(),
      category: "Medical Support",
      openTime: timeOpenToSave,
      media: mediaUrls,
      createdAt: serverTimestamp(),
      barangay: barangayName,
    });

    setMedicalModalVisible(false);
    setMedicalDescription("");
    setMedicalMedia(null);
    setMedicalOpenTime("");
    setPendingMedicalPin(null);
    setPinMode(false);
    setMedicalPinMode(false);

    Alert.alert(
      "Medical Support Pin Added!",
      barangayName
        ? `The medical support pin has been added successfully to ${barangayName}.`
        : "The medical support pin has been added successfully."
    );

    // --- Refetch all pins after saving ---
    try {
      const querySnapshot = await getDocs(collection(db, "pins"));
      const pins = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude) {
          pins.push({
            id: doc.id,
            latitude: data.latitude,
            longitude: data.longitude,
            userId: data.userId,
            userFirstName: data.userFirstName || "anonymous",
            description: data.description,
            category: data.category || "Unknown",
            media: data.media || [],
            createdAt: data.createdAt,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            location: data.location || "Unknown",
          });
        }
      });
      setAllPins(pins);
    } catch (error) {
      setAllPins([]);
    }
    // --- Refetch medical pins after saving ---
    try {
      const querySnapshot = await getDocs(collection(db, "medical_pins"));
      const pins = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.latitude && data.longitude) {
          pins.push({
            id: doc.id,
            latitude: data.latitude,
            longitude: data.longitude,
            userId: data.userId,
            userFirstName: data.userFirstName || "anonymous",
            description: data.description,
            category: data.category || "Medical Support",
            media: data.media || [],
            createdAt: data.createdAt,
            openTime: data.openTime || "",
            barangay: data.barangay || "Unknown",
          });
        }
      });
      setMedicalPins(pins);
    } catch (error) {
      setMedicalPins([]);
    }
  } catch (error) {
    console.error("Error saving medical pin:", error);
    Alert.alert("Error", `There was an error adding the medical support pin: ${error.message}.`);
  }
}

export const handleSaveRequestPin = async ({
  payload,
  pendingPin,
  userInfo,
  userFirstName,
  db,
  supabase,
  setProvideSupplyModalVisible,
  setPendingPin,
  setRequestPins,
  Alert,
  collection,
  addDoc,
  serverTimestamp,
  getBarangayFromCoords,
  getDocs,
}) => {
  try {
    // Resolve precise location FIRST
    let locationName;
    try {
      locationName = await resolveLocationFromCoords(
        pendingPin.latitude,
        pendingPin.longitude,
        getBarangayFromCoords
      );
    } catch (error) {
      Alert.alert(
        "Location Required",
        "Unable to determine a precise location for this request. Please:\n\n1. Move the pin to a more specific spot on land\n2. Enable precise location services\n3. Try selecting a different location\n\nRequests cannot be published for water locations."
      );
      return;
    }

    const docData = {
      latitude: pendingPin.latitude,
      longitude: pendingPin.longitude,
      userId: userInfo || null,
      userFullName: userFirstName || "anonymous",
      description: payload.notes || "",
      category: "Supply Request",
      supplyType: payload.supplyType || "",
      numberOfPeople: Number(payload.numberOfPeople) || 0,
      urgency: payload.urgency || "Medium",
      contact: payload.contact || "",
      media: payload.media || [],
      createdAt: serverTimestamp(),
      location: locationName,
    };

    // Save to request_pins collection
    const docRef = await addDoc(collection(db, "request_pins"), docData);

    // Update local state
    setRequestPins((prev) => [
      ...prev,
      {
        id: docRef.id,
        ...docData,
      },
    ]);

    Alert.alert("Success", `Supply request published successfully to ${locationName}!`);
    setProvideSupplyModalVisible(false);
    setPendingPin(null);
  } catch (error) {
    console.error("Error saving request pin:", error);
    Alert.alert("Error", "Failed to publish supply request.");
  }
};