import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Alert } from 'react-native';
import { db } from '../firebase'; // Go up one level to find firebase.js
import { closePinInfoModal } from '../screens/MapScreen';


/**
 * Completely deletes a pin and all associated votes from the database
 * @param {string} pinId - The ID of the pin to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful, false otherwise
 */


const deletePinCompletely = async (pinId, closePinInfoModal) => {
  try {
    console.log(`Auto-deleting pin ${pinId} due to high downvote ratio`);

    const pinRef = doc(db, "pins", pinId);
    await deleteDoc(pinRef);

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
        onPress: () => {
          closePinInfoModal(); // ✅ Close modal after OK
        },
      },
    ]);

    return true;
  } catch (error) {
    console.error("Error deleting pin:", error);
    return false;
  }
};



// Export the function
export { deletePinCompletely };

// Also provide default export as fallback
export default deletePinCompletely;