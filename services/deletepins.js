import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Go up one level to find firebase.js
import { Alert } from 'react-native';



/**
 * Completely deletes a pin and all associated votes from the database
 * @param {string} pinId - The ID of the pin to delete
 * @returns {Promise<boolean>} - Returns true if deletion was successful, false otherwise
 */


export const deletePinCompletely = async (pinId, onDeleted) => {
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