export async function scanImageWithSightengine({ uri, type, fileName }) {
  const API_USER = "1038006017";
  const API_SECRET = "74cNJ7xhG2kwfaMVBjWogVzdN2pfCuso";

  const formData = new FormData();
  formData.append("media", {
    uri,
    type,
    name: fileName || "image.jpg",
  });
  formData.append("models", "nudity,wad,offensive");
  formData.append("api_user", API_USER);
  formData.append("api_secret", API_SECRET);

  try {
    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    return result; // <-- return the raw result, not { isSafe: false }
  } catch (error) {
    console.error("Sightengine scan failed:", error);
    return {}; // return empty object on error
  }
}