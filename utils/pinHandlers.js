import { scanImageWithSightengine } from "../services/sightengine";


export async function handleSaveEvacPin({
  evacDescription,
  evacCapacity,
  evacMedia,
  evacFacilityName,
  evacPurok,
  evacSitio,
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
  setEvacSitio,
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

    // --- Save evacuation pin to Firestore with Supabase URLs and Barangay ---
    let barangayName = await getBarangayFromCoords(
      pendingEvacPin.latitude,
      pendingEvacPin.longitude
    );
    await addDoc(collection(db, "evacuation_pins"), {
      latitude: pendingEvacPin.latitude,
      longitude: pendingEvacPin.longitude,
      userId: userInfo || "anonymous",
      userFirstName: userFirstName || "anonymous",
      facilityName: evacFacilityName.trim(),
      purok: evacPurok ? evacPurok.trim() : "",
      sitio: evacSitio ? evacSitio.trim() : "",
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
    setEvacSitio("");
    setPinMode(false);
    setPendingEvacPin(null);

    Alert.alert("Evacuation Pin Added!", "The evacuation pin has been added successfully.");

    // --- Refetch all evacuation pins nnnnter saving ---
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
            sitio: data.sitio || "",
            description: data.description,
            category: data.category || "Evacuation",
            media: data.media || [],
            createdAt: data.createdAt,
            capacity: data.capacity || "",
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
    let mediaUrls = [];

    // 1. Upload image files to SUPABASE STORAGE
    if (media && media.length > 0) {
      Alert.alert("Uploading", "Uploading image files...", []);

      // Scan all images first
      const results = await Promise.all(
        media.map((img) => scanImageWithSightengine(img))
      );

      // Check if all images are safe
      const allSafe = results.every(
        (result) =>
          result.nudity?.safe > 0.8 &&
          (result.weapon === undefined || result.weapon < 0.2) &&
          (result.offensive?.prob === undefined || result.offensive.prob < 0.1)
      );

      if (!allSafe) {
        Alert.alert(
          "Content Blocked",
          "One or more of your images contain prohibited content and cannot be uploaded.",
          [{ text: "OK", onPress: () => setDescModalVisible(false) }]
        );
        return;
      }

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

    // 2. Save pin data (including Supabase URLs) to FIRESTORE
    let barangayName = await getBarangayFromCoords(
      pendingPin.latitude,
      pendingPin.longitude
    );

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
      Barangay: barangayName,
    });

    setDescModalVisible(false);
    setDescription("");
    setSelectedCategory("");
    setMedia(null);
    setPinMode(false);
    setPendingPin(null);

    const successMessage =
      mediaUrls.length > 0
        ? `Your location has been pinned successfully with ${mediaUrls.length} image(s).`
        : "Your location has been pinned successfully (some image uploads may have failed).";

    Alert.alert("Location pinned!", successMessage);

    // 3. Refresh pins from FIRESTORE
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
  setMedicalPins, // <-- ADD THIS LINE
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
    let barangayName = await getBarangayFromCoords(
      pendingMedicalPin.latitude,
      pendingMedicalPin.longitude
    );
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
    Alert.alert("Medical Support Pin Added!", "The medical support pin has been added successfully.");

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
            barangay: data.barangay || "",
          });
        }
      });
      setMedicalPins(pins);
    } catch (error) {
      setMedicalPins([]);
    }
    // Optionally, refetch medical pins separately if needed
  } catch (error) {
    console.error("Error saving medical pin:", error);
    Alert.alert("Error", `There was an error adding the medical support pin: ${error.message}.`);
  }
}

export async function handleSaveRequestPin({
  payload, // { supplyType, numberOfPeople, contact, notes, urgency, media }
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
}) {
  // Basic validation
  if (!payload || !payload.supplyType) {
    Alert.alert("Validation", "Please select the type of supply needed.");
    return;
  }
  if (!payload.numberOfPeople || isNaN(Number(payload.numberOfPeople))) {
    Alert.alert("Validation", "Enter valid number of people.");
    return;
  }
  if (!payload.urgency) {
    Alert.alert("Validation", "Select urgency level.");
    return;
  }
  if (!pendingPin) {
    Alert.alert("Error", "Location not selected.");
    return;
  }

  try {
    let mediaUrls = [];

    // Upload media to same Supabase bucket used by handleSavePin
    if (payload.media && payload.media.length > 0) {
      Alert.alert("Uploading", "Uploading media files...", []);
      for (let i = 0; i < payload.media.length; i++) {
        const mediaItem = payload.media[i];

        // Only allow images/videos; adapt if you allow other types
        const fileName = `request_pins/${Date.now()}_${i}_${mediaItem.fileName || "media"}`;

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
            // fallback: fetch blob and upload
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
          Alert.alert("Upload Warning", `Failed to upload media file ${i + 1}: ${uploadError.message}. Continuing...`);
          continue;
        }

        const { data: urlData } = supabase.storage.from("pin-media").getPublicUrl(uploadData.path);
        mediaUrls.push({
          url: urlData.publicUrl,
          type: mediaItem.type,
          fileName: mediaItem.fileName,
          path: uploadData.path,
        });
      }
    }

    // Get barangay (optional)
    const barangayName = await getBarangayFromCoords(pendingPin.latitude, pendingPin.longitude);

    // Prepare doc
    const docData = {
      latitude: pendingPin.latitude,
      longitude: pendingPin.longitude,
      userId: userInfo || "anonymous",
      userFullName: userFirstName || "anonymous",
      description: payload.notes || "",
      category: "Supply Request",
      supplyType: payload.supplyType || "",
      numberOfPeople: Number(payload.numberOfPeople) || 1,
      urgency: payload.urgency || "",
      contact: payload.contact || "",
      media: mediaUrls,
      createdAt: serverTimestamp(),
      barangay: barangayName,
    };

    // Save to Firestore request_pins
    const docRef = await addDoc(collection(db, "request_pins"), docData);

    // Close modal / clear pending pin
    setProvideSupplyModalVisible(false);
    setPendingPin(null);

    Alert.alert("Request Posted", "Your relief request has been posted.");

    // Refresh request_pins local state
    try {
      const snap = await getDocs(collection(db, "request_pins"));
      const reqs = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.latitude && data.longitude) {
          reqs.push({
            id: d.id,
            latitude: data.latitude,
            longitude: data.longitude,
            userId: data.userId,
            userFullName: data.userFullName || "anonymous",
            description: data.description,
            category: data.category || "Supply Request",
            media: data.media || [],
            createdAt: data.createdAt,
            supplyType: data.supplyType || "",
            numberOfPeople: data.numberOfPeople || 0,
            urgency: data.urgency || "",
            contact: data.contact || "",
          });
        }
      });
      setRequestPins(reqs);
    } catch (err) {
      console.warn("Failed to refresh request_pins:", err);
    }

    return docRef;
  } catch (err) {
    console.error("Error saving request pin:", err);
    Alert.alert("Error", `Failed to save request: ${err.message}`);
    // Ensure modal closed & pending cleared
    setProvideSupplyModalVisible(false);
    setPendingPin(null);
    throw err;
  }
}