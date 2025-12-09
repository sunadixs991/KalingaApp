export async function scanImageWithSightengine(uri) {
  const API_USER = "1038006017";
  const API_SECRET = "74cNJ7xhG2kwfaMVBjWogVzdN2pfCuso";

  try {
    console.log("Starting image scan for:", uri);
    
    // Extract file info from URI
    const uriParts = uri.split('/');
    const fileName = uriParts[uriParts.length - 1] || 'image.jpg';
    
    // Determine file type
    let fileType = 'image/jpeg';
    if (uri.toLowerCase().includes('.png')) fileType = 'image/png';
    else if (uri.toLowerCase().includes('.jpg') || uri.toLowerCase().includes('.jpeg')) fileType = 'image/jpeg';
    
    console.log("File info - name:", fileName, "type:", fileType);
    
    // Create FormData with URI object (React Native specific)
    const formData = new FormData();
    formData.append('media', {
      uri: uri,
      type: fileType,
      name: fileName,
    });
    formData.append('models', 'nudity-2.1,wad,offensive');
    formData.append('api_user', API_USER);
    formData.append('api_secret', API_SECRET);

    console.log("Sending to Sightengine API...");
    
    const apiResponse = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData,
    });

    const responseText = await apiResponse.text();
    // console.log("API Response Status:", apiResponse.status);
    // console.log("API Response:", responseText);

    if (!apiResponse.ok) {
      throw new Error(`API returned ${apiResponse.status}: ${responseText}`);
    }

    const result = JSON.parse(responseText);
    console.log("Sightengine scan result:", JSON.stringify(result, null, 2));
    
    // Check if content should be flagged
    const flagged = 
      (result.nudity?.sexual_activity > 0.5) ||
      (result.nudity?.sexual_display > 0.5) ||
      (result.nudity?.erotica > 0.5) ||
      (result.weapon > 0.5) ||
      (result.alcohol > 0.5) ||
      (result.drugs > 0.5) ||
      (result.offensive?.prob > 0.5);

    console.log("Content flagged:", flagged);

    return { 
      flagged,
      details: result 
    };
  } catch (error) {
    console.error("Sightengine scan failed:", error);
    console.error("Error message:", error.message);
    
    // Allow uploads to continue if scanning fails
    return { 
      flagged: false,
      error: error.message 
    };
  }
}