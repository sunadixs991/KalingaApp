// ../services/VotesHandler.js
import { db } from "../firebase";
import { deletePinCompletely } from "../services/deletepins";
import {
  doc,
  updateDoc,
  increment,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Alert } from 'react-native';


// Check if user has already voted on a pin
export const hasUserVoted = async (pinId, userId) => {
  try {
    const voteRef = doc(db, "votes", `${pinId}_${userId}`);
    const voteDoc = await getDoc(voteRef);
    return voteDoc.exists() ? voteDoc.data() : null;
  } catch (error) {
    console.error("Error checking user vote:", error);
    return null;
  }
};

// Get all votes for a specific pin
export const getPinVotes = async (pinId) => {
  try {
    const votesQuery = query(
      collection(db, "votes"),
      where("pinId", "==", pinId)
    );
    const votesSnapshot = await getDocs(votesQuery);

    let upvotes = 0;
    let downvotes = 0;

    votesSnapshot.forEach((doc) => {
      const vote = doc.data();
      if (vote.voteType === "upvote") {
        upvotes++;
      } else if (vote.voteType === "downvote") {
        downvotes++;
      }
    });

    return { upvotes, downvotes };
  } catch (error) {
    console.error("Error getting pin votes:", error);
    return { upvotes: 0, downvotes: 0 };
  }
};

// Auto-delete logic - check if pin should be deleted based on downvote ratio


// Cast a vote (upvote or downvote)
export const castVote = async (pinId, userId, voteType, onPinDeleted) => {
  // console.log("castVote function called with:", { pinId, userId, voteType });

  try {
    const voteId = `${pinId}_${userId}`;
    const voteRef = doc(db, "votes", voteId);
    const pinRef = doc(db, "pins", pinId);

    // Check if user has already voted
    const existingVote = await hasUserVoted(pinId, userId);
    // console.log("Existing vote:", existingVote);

    let result;

    if (existingVote) {
      // User has already voted
      if (existingVote.voteType === voteType) {
        // Same vote type - remove vote (toggle off)
        console.log("Removing existing vote");
        await deleteDoc(voteRef);

        // Decrement the count in pins collection
        const decrementField = voteType === "upvote" ? "upvotes" : "downvotes";
        await updateDoc(pinRef, {
          [decrementField]: increment(-1)
        });

        result = { success: true, action: "removed", voteType };
      } else {
        // Different vote type - change vote
        console.log("Changing vote type");
        await setDoc(voteRef, {
          pinId,
          userId,
          voteType,
          createdAt: new Date(),
        });

        // Update counts: decrement old, increment new
        const oldVoteField = existingVote.voteType === "upvote" ? "upvotes" : "downvotes";
        const newVoteField = voteType === "upvote" ? "upvotes" : "downvotes";

        await updateDoc(pinRef, {
          [oldVoteField]: increment(-1),
          [newVoteField]: increment(1)
        });

        result = { success: true, action: "changed", voteType, previousVote: existingVote.voteType };
      }
    } else {
      // New vote
      console.log("Adding new vote");
      await setDoc(voteRef, {
        pinId,
        userId,
        voteType,
        createdAt: new Date(),
      });

      // Increment the count in pins collection
      const incrementField = voteType === "upvote" ? "upvotes" : "downvotes";
      await updateDoc(pinRef, {
        [incrementField]: increment(1)
      });

      result = { success: true, action: "added", voteType };
    }

    // After any vote change, check if pin should be auto-deleted
    const updatedPin = await getDoc(pinRef);
    if (updatedPin.exists()) {
      const pinData = updatedPin.data();
      const upvotes = pinData.upvotes || 0;
      const downvotes = pinData.downvotes || 0;

      // console.log(`Pin ${pinId} vote counts - Upvotes: ${upvotes}, Downvotes: ${downvotes}`);

      // Delete when downvotes exceed upvotes by 20 or more
      // Note: downvotes are typically stored as negative values
      const downvoteThreshold = Math.abs(downvotes) - upvotes;

      if (downvoteThreshold >= 20) {
        const deleted = await deletePinCompletely(pinId, onPinDeleted);
        if (deleted) {
          result.pinDeleted = true;
          result.deleteReason = `Downvotes exceed upvotes by ${downvoteThreshold} (threshold: 20)`;
        }

      }
    }

    return result;
  } catch (error) {
    console.error("Error casting vote:", error);
    return { success: false, error: error.message };
  }
};

// Get user's vote status for a pin
export const getUserVoteStatus = async (pinId, userId) => {
  // console.log("getUserVoteStatus called with:", { pinId, userId });

  try {
    const existingVote = await hasUserVoted(pinId, userId);
    // console.log("Vote status result:", existingVote);

    return {
      hasVoted: !!existingVote,
      voteType: existingVote?.voteType || null,
    };
  } catch (error) {
    console.error("Error getting user vote status:", error);
    return { hasVoted: false, voteType: null };
  }
};

// Optimistic update logic for voting
export const optimisticVoteUpdate = ({
  pins,
  selectedPin,
  userVoteStatus,
  voteType,
}) => {
  return pins.map((pin) => {
    if (pin.id !== selectedPin.id) return pin;

    let upvotes = pin.upvotes || 0;
    let downvotes = pin.downvotes || 0;

    if (userVoteStatus.voteType === "upvote" && voteType === "downvote") {
      upvotes = upvotes - 1;
      downvotes = downvotes + 1;
    } else if (
      userVoteStatus.voteType === "downvote" &&
      voteType === "upvote"
    ) {
      downvotes = downvotes - 1;
      upvotes = upvotes + 1;
    } else if (userVoteStatus.voteType === voteType) {
      // Unvote (toggle off)
      if (voteType === "upvote") upvotes = upvotes - 1;
      if (voteType === "downvote") downvotes = downvotes - 1;
    } else {
      // New vote
      if (voteType === "upvote") upvotes = upvotes + 1;
      if (voteType === "downvote") downvotes = downvotes + 1;
    }

    return {
      ...pin,
      upvotes,
      downvotes,
    };
  });
};

// Main voting handler
export const handleVote = async ({
  voteType,
  voteMessage = "",
  userInfo,
  selectedPin,
  userVoteStatus,
  setAllPins,
  setSelectedPin,
  setUserVoteStatus,
  setIsVoting,
  closePinInfoModal,
  getUserInfo,
  userFirstName,
}) => {
  setIsVoting(true);

  // Determine the next voteType for the user
  let nextVoteType;
  if (userVoteStatus.voteType === voteType) {
    // Unvote
    nextVoteType = null;
  } else {
    // New vote or switch
    nextVoteType = voteType;
  }

  // OPTIMISTIC UPDATE
  setAllPins((prevPins) =>
    optimisticVoteUpdate({
      pins: prevPins,
      selectedPin,
      userVoteStatus,
      voteType,
    })
  );

  setSelectedPin((prev) => {
    if (!prev) return prev;

    let upvotes = prev.upvotes || 0;
    let downvotes = prev.downvotes || 0;

    if (userVoteStatus.voteType === "upvote" && voteType === "downvote") {
      upvotes = upvotes - 1;
      downvotes = downvotes + 1;
    } else if (
      userVoteStatus.voteType === "downvote" &&
      voteType === "upvote"
    ) {
      downvotes = downvotes - 1;
      upvotes = upvotes + 1;
    } else if (userVoteStatus.voteType === voteType) {
      if (voteType === "upvote") upvotes = upvotes - 1;
      if (voteType === "downvote") downvotes = downvotes - 1;
    } else {
      if (voteType === "upvote") upvotes = upvotes + 1;
      if (voteType === "downvote") downvotes = downvotes + 1;
    }

    return {
      ...prev,
      upvotes,
      downvotes,
    };
  });

  // Optimistically update userVoteStatus for instant color feedback
  setUserVoteStatus({
    hasVoted: !!nextVoteType,
    voteType: nextVoteType,
  });
  // --- OPTIMISTIC UPDATE END ---

  try {
    // Cast the vote in Firestore
    await castVote(selectedPin.id, userInfo, voteType, closePinInfoModal);

    // Save vote to top-level votes collection (not subcollection)
    if (selectedPin && userInfo) {
      // Use a composite key for the document ID (e.g. `${pinId}_${userId}`)
      const voteDocId = `${selectedPin.id}_${userInfo}`;
      await setDoc(
        doc(db, "votes", voteDocId),
        {
          pinId: selectedPin.id,
          userId: userInfo,
          userFirstName: userFirstName || "",
          userLastName: (typeof getUserInfo === "function" && userInfo)
            ? (await getUserInfo(userInfo))?.lastName || ""
            : "",
          voteType,
          voteMessage: voteMessage ? voteMessage.trim() : "",
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Get updated pin data
    const updatedPin = await getUpdatedPinData(selectedPin.id);
    if (updatedPin) {
      // Update selected pin
      setSelectedPin(updatedPin);

      // Update the pin in allPins array
      setAllPins((prevPins) =>
        prevPins.map((pin) =>
          pin.id === selectedPin.id
            ? {
                ...pin,
                upvotes: updatedPin.upvotes,
                downvotes: updatedPin.downvotes,
              }
            : pin
        )
      );
    }

    // Update user vote status
    const newVoteStatus = await getUserVoteStatus(selectedPin.id, userInfo);
    setUserVoteStatus(newVoteStatus);

    // Optionally, refetch all pins (if needed)
    // You can add a function here to refetch pins if your UI needs it
  } catch (error) {
    console.error("Error voting:", error);
    if (typeof Alert !== "undefined") {
      Alert.alert("Error", "Failed to record vote. Please try again.");
    }
  } finally {
    setIsVoting(false);
  }
};

// Get updated pin data with current vote counts
export const getUpdatedPinData = async (pinId) => {
  // console.log("getUpdatedPinData called with:", pinId);

  try {
    const pinRef = doc(db, "pins", pinId);
    const pinDoc = await getDoc(pinRef);

    if (pinDoc.exists()) {
      const result = { id: pinDoc.id, ...pinDoc.data() };
      // console.log("Updated pin data:", result);
      return result;
    }
    return null;
  } catch (error) {
    console.error("Error getting updated pin data:", error);
    return null;
  }
};



