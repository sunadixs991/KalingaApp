import AsyncStorage from "@react-native-async-storage/async-storage";
import { notifyUsersExcept } from "./pushNotifications";

const STORAGE_KEY = "inAppNotifications_v1"; // same as pinNotifications so HomeScreen picks up items
const UNREAD_KEY = "inAppNotifications_unread_v1";
const MAX_STORED = 200;

/**
 * Persist a notification payload to AsyncStorage and increment unread count.
 */
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

/**
 * Send schedule notification to all users except the creator and persist it
 * scheduleItem: { id, title, date, time, location, ... }
 * excludeUserId: string|null
 */
export async function sendScheduleNotification(scheduleItem, excludeUserId = null) {
  try {
    const title = "New Food Distribution Schedule";
    const shortDate = scheduleItem.date || (scheduleItem.dateString || "");
    const shortTime = scheduleItem.time || (scheduleItem.timeString || "");
    const body =
      `${scheduleItem.title ? `${scheduleItem.title} — ` : ""}` +
      `${shortDate} ${shortTime}`.trim() +
      (scheduleItem.location ? ` • ${scheduleItem.location}` : "");

    const payload = {
      id: scheduleItem.id || `sched_${Date.now()}`,
      title,
      body,
      data: {
        scheduleId: scheduleItem.id || null,
        collection: "schedules",
        barangay: scheduleItem.title || null,
        location: scheduleItem.location || null,
      },
      timestamp: Date.now(),
    };

    // Persist locally (so HomeScreen badge/list shows it)
    await persistNotification(payload).catch(() => {});

    // Send push notifications to all users except the schedule creator
    // notifyUsersExcept expects (message, excludeUserId)
    const pushMessage = `[Kalinga App] ${title}\n${scheduleItem.title || ""}\n${shortDate} ${shortTime}\n${scheduleItem.location || ""}`;
    const result = await notifyUsersExcept(pushMessage, excludeUserId).catch((e) => {
      console.log("notifyUsersExcept error", e);
      return { ok: false, error: String(e) };
    });

    return { ok: true, sent: result?.sent || 0, result };
  } catch (err) {
    console.error("sendScheduleNotification error", err);
    return { ok: false, error: String(err) };
  }
}