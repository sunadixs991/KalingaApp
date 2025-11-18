export async function getBarangayFromCoords(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "KalingaApp/1.0 (your-email@example.com)",
        Accept: "application/json",
      },
    });
    const text = await response.text();
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log("Reverse geocoding parse error:", e, text);
      return "Unknown";
    }
    
    if (data && data.address) {
      return (
        data.address.barangay ||
        data.address.suburb ||
        data.address.village ||
        data.address.neighbourhood ||
        data.address.city_district ||
        data.address.city ||
        data.address.town ||
        data.address.municipality ||
        "Unknown"
      );
    }
    return "Unknown";
  } catch (error) {
    console.log("Reverse geocoding error:", error);
    return "Unknown";
  }
}