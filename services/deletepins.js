import { doc, deleteDoc, collection, query, where, getDocs, setDoc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Alert } from 'react-native';

/**
 * Completely deletes a pin and all associated votes from the database,
 * saves the pin to deleted_pins, and adds/increments a "strike" field for the pin owner.
 * @param {string} pinId - The ID of the pin to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful, false otherwise
 */
export const deletePinCompletely = async (pinId, onDeleted) => {
  try {
    console.log(`Auto-deleting pin ${pinId} due to high downvote ratio`);

    // Get pin data before deleting
    const pinRef = doc(db, "pins", pinId);
    const pinSnap = await getDoc(pinRef);
    const pinData = pinSnap.exists() ? pinSnap.data() : null;

    // Save pin data to deleted_pins collection
    if (pinData) {
      await setDoc(doc(db, "deleted_pins", pinId), {
        ...pinData,
        deletedAt: new Date().toISOString(),
      });

      // Increment "strike" field for pin owner
      if (pinData.userId) {
        // Find user document by username field
        const userQuery = query(collection(db, "users"), where("username", "==", pinData.userId));
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          await updateDoc(userDoc.ref, {
            strike: increment(1),
          });
        } else {
          // Optionally handle if user not found
          console.warn("User not found for username:", pinData.userId);
        }
      }
    }

    // Delete the pin
    await deleteDoc(pinRef);

    // Delete all votes for this pin
    const votesQuery = query(collection(db, "votes"), where("pinId", "==", pinId));
    const votesSnapshot = await getDocs(votesQuery);

    const batch = [];
    votesSnapshot.forEach((voteDoc) => {
      batch.push(deleteDoc(voteDoc.ref));
    });

    await Promise.all(batch);

    Alert.alert("Pin Deleted", "This pin has been automatically removed due to excessive downvotes.", [
      {
        text: "OK",
        style: "default",
      },
    ]);

    if (typeof onDeleted === 'function') {
      onDeleted();
    }
    return true;
  } catch (error) {
    console.error("Error deleting pin:", error);
    return false;
  }
};