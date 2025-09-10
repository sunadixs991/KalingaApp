import { db } from "../firebase";
import { collection, getDocs, query, where, updateDoc, doc, orderBy, limit } from "firebase/firestore";

/**
 * Marks users as inactive if they have not logged in for 6 months.
 * Uses the latest login_activity timestamp for each user.
 * Assumes:
 * - Users collection: "users"
 * - Each user document has an "accountStatus" field ("active" or "inactive")
 * - Login activity collection: "login_activity"
 * - Each login_activity document has "username" and "timestamp" fields
 */
export async function markInactiveUsers() {
  const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months in ms
  const now = new Date();

  // Get all users (not just active, so you can also reactivate if needed)
  const usersSnap = await getDocs(collection(db, "users"));
  for (const userDoc of usersSnap.docs) {
    const username = userDoc.data().username;
    if (!username) continue;

    // Get latest login activity for this user (order by timestamp desc, limit 1)
    const loginQ = query(
      collection(db, "login_activity"),
      where("username", "==", username),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const loginSnap = await getDocs(loginQ);

    let latestLogin = null;
    loginSnap.forEach((doc) => {
      const ts = doc.data().timestamp;
      if (ts && ts.toDate) {
        latestLogin = ts.toDate();
      }
    });

    // Determine accountStatus based on latest login
    let newStatus = "inactive";
    if (latestLogin && now - latestLogin <= SIX_MONTHS_MS) {
      newStatus = "active";
    }

    // Only update if accountStatus changed
    if (userDoc.data().accountStatus !== newStatus) {
      await updateDoc(doc(db, "users", userDoc.id), { accountStatus: newStatus });
      console.log(`User ${username} marked as ${newStatus}.`);
    }
  }
}