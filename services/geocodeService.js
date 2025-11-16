// simple server-side resolver using Google Geocoding + Firestore cache
import fetch from "node-fetch";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const db = getFirestore();
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function resolveBarangay(lat, lng) {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const cacheRef = doc(db, "geocode_cache", key);
  const cached = await getDoc(cacheRef);
  if (cached.exists()) return cached.data().barangay || null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocode failed");
  const data = await res.json();
  const comps = data.results?.flatMap(r => r.address_components) || [];
  const find = (types) => comps.find(c => types.some(t => c.types.includes(t)))?.long_name || null;
  const barangay = find(["sublocality_level_1","sublocality","neighborhood","administrative_area_level_3"]) || null;

  await setDoc(cacheRef, { barangay, updatedAt: new Date() });
  return barangay;
}