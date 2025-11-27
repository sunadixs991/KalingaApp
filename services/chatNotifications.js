import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import {
  getDoc,
  doc,
  collection,
  getDocs,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase"; // adjust if your firebase export path differs
import { notifyUsersExcept } from "./pushNotifications"; // optional, reused for push send logic

const STORAGE_KEY = "inAppNotifications_v1";
const UNREAD_KEY = "inAppNotifications_unread_v1";
const MAX_STORED = 200;

/** persist notification locally and increment unread */
async function persistNotification(payload) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(payload);
    if (list.length > MAX_STORED) list.splice(MAX_STORED);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    const rawUnread = await AsyncStorage.getItem(UNREAD_KEY);
    const unread = rawUnread ? parseInt(rawUnread, 10) || 0 : 0;
    await AsyncStorage.setItem(UNREAD_KEY, String(unread + 1));
  } catch (e) {
    console.log("persistNotification error", e);
  }
}

/** send Expo push to a single userId (reads token from users collection) */
async function sendPushToUser(userId, title, body, data = {}) {
  try {
    if (!userId) return { ok: false, error: "no userId" };
    const userDocRef = doc(db, "users", String(userId));
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return { ok: false, error: "user not found" };
    const userData = snap.data() || {};
    const token =
      userData.pushToken ||
      userData.expoPushToken ||
      userData.expo_token ||
      userData.push_token ||
      null;
    if (!token) return { ok: false, error: "no push token" };

    const message = [
      {
        to: token,
        sound: "default",
        title,
        body,
        data,
      },
    ];

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json };
  } catch (err) {
    console.error("sendPushToUser error", err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Notify the owner of a post when a new comment is added.
 * - postId: id of community_posts doc
 * - commenterId: id of the user who commented
 * - commentText: the comment content (used in notification body, truncated)
 *
 * This will:
 *  - skip notifying if owner == commenter
 *  - persist a notification to AsyncStorage (so HomeScreen shows it)
 *  - attempt to send an Expo push to the owner (if token exists)
 *  - schedule a local OS notification on the current device (optional)
 */
export async function notifyPostOwnerOnComment(postId, commenterId, commentText = "") {
  try {
    if (!postId) return { ok: false, error: "missing postId" };

    const postRef = doc(db, "community_posts", String(postId));
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return { ok: false, error: "post not found" };

    const post = postSnap.data() || {};
    const ownerId =
      post.userId ||
      post.ownerId ||
      post.createdBy ||
      (post.user && (post.user.id || post.user.uid)) ||
      null;

    if (!ownerId) return { ok: false, error: "owner not found" };
    if (String(ownerId) === String(commenterId)) {
      return { ok: true, skipped: true, reason: "owner is commenter" };
    }

    const title = "New comment on your post";
    const truncated = (commentText || "").slice(0, 120);
    const body = truncated || "Someone commented on your post.";

    const payload = {
      id: `chat_${postId}_${Date.now()}`,
      title,
      body,
      data: {
        postId,
        collection: "community_posts",
      },
      timestamp: Date.now(),
    };

    // persist in-app for HomeScreen
    await persistNotification(payload).catch(() => {});

    // try sending push to owner
    const pushResult = await sendPushToUser(ownerId, title, body, payload.data).catch(() => null);

    // try scheduling a local notification on this device (so commenter sees it locally too)
    try {
      if (Constants?.isDevice) {
        await Notifications.scheduleNotificationAsync({
          content: { title, body, data: payload.data, sound: "default" },
          trigger: null,
        });
      }
    } catch (e) {
      // ignore local notification errors
    }

    return { ok: true, pushResult };
  } catch (err) {
    console.error("notifyPostOwnerOnComment error", err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Cleanup expired posts: deletes community_posts where expiresAt <= now and no comments exist.
 * Call this on app start or periodically (best to run as server-side Cloud Function for reliability).
 */
export async function runExpiredPostsCleanup() {
  try {
    const now = Timestamp.fromDate(new Date());
    const q = query(
      collection(db, "community_posts"),
      where("expiresAt", "<=", now)
    );
    const snap = await getDocs(q);
    if (snap.empty) return { ok: true, deleted: 0 };

    let deleted = 0;
    for (const docSnap of snap.docs) {
      const postId = docSnap.id;
      // check comments subcollection
      const commentsSnap = await getDocs(collection(db, "community_posts", postId, "comments"));
      if (!commentsSnap.empty) {
        // someone commented — do not delete
        continue;
      }

      // delete post
      try {
        await deleteDoc(doc(db, "community_posts", postId));
        deleted++;
      } catch (e) {
        console.warn("failed to delete post", postId, e);
      }
    }
    return { ok: true, deleted };
  } catch (err) {
    console.error("runExpiredPostsCleanup error", err);
    return { ok: false, error: String(err) };
  }
}

/** Helper to compute server Timestamp + 24h (client-side) */
export function expiresAt24hFromNow() {
  return Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
}