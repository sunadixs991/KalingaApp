import { getDocs, collection } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Send Expo push notifications to all users except excludeUserId.
 * Expects user docs to include an Expo push token in `pushToken` or `expoPushToken`.
 */
export async function notifyUsersExcept(message, excludeUserId = null) {
  try {
    const snap = await getDocs(collection(db, "users"));
    const tokens = [];

    snap.forEach((doc) => {
      const data = doc.data() || {};
      const uid = doc.id || data.id || data.uid;
      const token = data.pushToken || data.expoPushToken || data.expo_token || null;
      if (!token) return;
      if (excludeUserId && String(uid) === String(excludeUserId)) return;
      tokens.push(token);
    });

    if (!tokens.length) return { ok: true, sent: 0 };

    // chunk tokens into batches of 100
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
      chunks.push(tokens.slice(i, i + chunkSize));
    }

    const responses = [];
    for (const chunk of chunks) {
      const messages = chunk.map((t) => ({
        to: t,
        sound: "default",
        title: "Kalinga App",
        body: message,
        data: { source: "broadcast" },
      }));

      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      });

      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        json = { error: "invalid_json_response" };
      }

      responses.push({ ok: res.ok, status: res.status, json });
    }

    return { ok: true, sent: tokens.length, responses };
  } catch (err) {
    console.error("notifyUsersExcept error", err);
    return { ok: false, error: String(err) };
  }
}