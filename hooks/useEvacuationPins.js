import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function useEvacuationPins() {
  const [evacPins, setEvacPins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvacPins = async () => {
      setLoading(true);
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
              description: data.description,
              category: data.category || "Evacuation",
              capacity: data.capacity || "",
              contactPerson: data.contactPerson || "",
              media: data.media || [],
              createdAt: data.createdAt,
              // You can add more fields as needed
            });
          }
        });
        setEvacPins(pins);
      } catch (error) {
        setEvacPins([]);
      }
      setLoading(false);
    };
    fetchEvacPins();
  }, []);

  return { evacPins, loading };
}