import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';

let unsubscribeHandlers = [];

const STORAGE_KEY = 'inAppNotifications_v1';
const UNREAD_KEY = 'inAppNotifications_unread_v1';
const MAX_STORED = 200;

// Configure handler so notifications show in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function saveNotificationToStorage(payload) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // prepend and cap
    list.unshift(payload);
    if (list.length > MAX_STORED) list.splice(MAX_STORED);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));

    // increment unread count
    const rawUnread = await AsyncStorage.getItem(UNREAD_KEY);
    const unread = rawUnread ? parseInt(rawUnread, 10) || 0 : 0;
    await AsyncStorage.setItem(UNREAD_KEY, String(unread + 1));
  } catch (e) {
    console.log('saveNotificationToStorage error', e);
  }
}

export async function getStoredNotifications() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function getUnreadCount() {
  try {
    const raw = await AsyncStorage.getItem(UNREAD_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

export async function clearUnreadCount() {
  try {
    await AsyncStorage.setItem(UNREAD_KEY, '0');
  } catch (e) {
    // ignore
  }
}

export async function registerForLocalNotificationsAsync() {
  if (!Constants?.isDevice) return { granted: false };
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return { granted: false };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pins', {
      name: 'Pin Notifications',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return { granted: true };
}

export async function showLocalPinNotification({ title, body, data }) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title || 'New pin added',
        body: body || '',
        data: data || {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch (e) {
    console.log('showLocalPinNotification error', e);
  }
}

// start real-time listeners for new pins and request_pins
// db: firebase firestore instance
// currentUserId: string or null - notifications from same user will be ignored
// onNewNotification (optional) callback will still be invoked if provided
export function startPinListener(db, currentUserId = null, onNewNotification = null) {
  stopPinListener();
  const seenAt = Date.now();

  // normalize currentUserId param (accept object/user record or string)
  const normalizeCurrentUserId = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return v;
    if (typeof v === 'object') {
      return v.id || v.uid || v.userId || (v.user && (v.user.id || v.user.uid)) || null;
    }
    return null;
  };
  const meId = normalizeCurrentUserId(currentUserId);

  const extractOwnerIdFromDoc = (docData) => {
    if (!docData) return null;
    return (
      docData.userId ||
      docData.ownerId ||
      docData.createdBy ||
      (docData.user && (docData.user.id || docData.user.uid)) ||
      (docData.owner && (docData.owner.id || docData.owner.uid)) ||
      null
    );
  };

  const listenToCollection = (colName, friendlyTitle) => {
    try {
      const q = query(collection(db, colName), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== 'added') return;

          const data = change.doc.data();
          let createdAtMs = Date.now();
          if (data?.createdAt) {
            if (typeof data.createdAt.seconds === 'number') {
              createdAtMs = data.createdAt.seconds * 1000;
            } else {
              createdAtMs = new Date(data.createdAt).getTime();
            }
          }

          // ignore historical docs present before listener start
          if (createdAtMs <= seenAt - 1000) return;
          // determine owner id from doc and skip if owner is the current user
          const ownerId = extractOwnerIdFromDoc(data);
          if (meId && ownerId && String(ownerId) === String(meId)) return;

          const title =
            colName === 'request_pins' ? 'New supply request' : friendlyTitle || 'New location pinned';

          let body =
            data?.description ||
            data?.category ||
            (colName === 'request_pins' ? 'Someone requested supplies nearby' : 'A new pin was added nearby');

          // append category as suffix if not already present
          if (data?.category && !body.includes(data.category)) {
            body += ` — ${data.category}`;
          }

          const payload = {
            id: change.doc.id,
            title,
            body,
            data: {
              pinId: change.doc.id,
              latitude: data?.latitude,
              longitude: data?.longitude,
              collection: colName,
              category: data?.category || null,
            },
            timestamp: createdAtMs,
          };

          // OS local notification
          showLocalPinNotification({
            title: payload.title,
            body: payload.body,
            data: payload.data,
          }).catch(() => {});

          // persist for in-app HomeScreen badge/list
          await saveNotificationToStorage(payload).catch(() => {});

          // optional in-app callback
          try {
            if (typeof onNewNotification === 'function') {
              onNewNotification(payload);
            }
          } catch (e) {
            console.log('onNewNotification error', e);
          }
        });
      });

      unsubscribeHandlers.push(unsubscribe);
    } catch (e) {
      console.log(`startPinListener (${colName}) error`, e);
    }
  };

  listenToCollection('pins', 'New location pinned');
  listenToCollection('request_pins', 'New supply request');
}

export function stopPinListener() {
  if (unsubscribeHandlers.length) {
    unsubscribeHandlers.forEach((u) => {
      try {
        u();
      } catch (e) {}
    });
    unsubscribeHandlers = [];
  }
}