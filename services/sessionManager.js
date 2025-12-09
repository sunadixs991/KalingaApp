// services/sessionManager.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import {
  setBadgeCount,
  dismissAllNotifications,
  cancelAllNotifications,
} from "./NotificationService";

const SESSION_EXPIRY_KEY = "session_expiry_v1";
const SESSION_WARNINGS_KEY = "session_warnings_v1";

let intervalId = null;
let cfg = {
  sessionMinutes: 30,
  warningThresholds: [20, 10], // minutes left thresholds
  checkIntervalMs: 15000, // check every 15s
  onExpire: null, // callback
  onWarning: null, // optional callback(thresholdMinutes)
};

const setConfig = (options = {}) => {
  cfg = { ...cfg, ...options };
};

const setSessionExpiry = async (minutesFromNow = cfg.sessionMinutes) => {
  try {
    const expiryTs = Date.now() + minutesFromNow * 60 * 1000;
    await AsyncStorage.setItem(SESSION_EXPIRY_KEY, String(expiryTs));
    // reset warnings shown for this session
    await AsyncStorage.removeItem(SESSION_WARNINGS_KEY);
  } catch (e) {
    console.warn("sessionManager: setSessionExpiry failed", e);
  }
};

const getSessionExpiry = async () => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    if (Number.isNaN(ts)) return null;
    return ts;
  } catch (e) {
    console.warn("sessionManager: getSessionExpiry failed", e);
    return null;
  }
};

const clearSession = async () => {
  try {
    await AsyncStorage.removeItem(SESSION_EXPIRY_KEY);
    await AsyncStorage.removeItem(SESSION_WARNINGS_KEY);
  } catch (e) {
    console.warn("sessionManager: clearSession failed", e);
  }
};

const getWarningsShown = async () => {
  try {
    const raw = await AsyncStorage.getItem(SESSION_WARNINGS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const markWarningShown = async (minutesLeft) => {
  try {
    const current = await getWarningsShown();
    if (!current.includes(minutesLeft)) {
      current.push(minutesLeft);
      await AsyncStorage.setItem(SESSION_WARNINGS_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn("sessionManager: markWarningShown failed", e);
  }
};

const _showToast = (type, title, message) => {
  try {
    Toast.show({
      type: type === "error" ? "error" : "info",
      text1: title,
      text2: message,
      visibilityTime: 5000,
    });
  } catch (e) {
    // ignore
  }
};

const _performExpireActions = async () => {
  // Clear badge and dismiss/cancel local notifications
  try {
    await setBadgeCount(0);
    await dismissAllNotifications();
    await cancelAllNotifications();
  } catch (e) {
    console.debug("sessionManager: notification cleanup failed", e);
  }

  // call user-provided expire callback
  try {
    if (typeof cfg.onExpire === "function") await cfg.onExpire();
  } catch (e) {
    console.error("sessionManager: onExpire callback failed", e);
  }

  // clear persisted session
  await clearSession();
  stop();
};

const _checkOnce = async () => {
  const expiry = await getSessionExpiry();
  if (!expiry) return;

  const msLeft = expiry - Date.now();

  if (msLeft <= 0) {
    // expired
    _showToast(
      "error",
      "Session ended",
      "Your session has expired for security reasons. You have been logged out."
    );
    await _performExpireActions();
    return;
  }

  const minutesLeft = Math.ceil(msLeft / (60 * 1000));

  // iterate thresholds in cfg.warningThresholds
  for (const threshold of cfg.warningThresholds) {
    // show when minutesLeft <= threshold and not already shown
    if (minutesLeft <= threshold && minutesLeft > threshold - 1) {
      const shown = (await getWarningsShown()).includes(threshold);
      if (!shown) {
        // professional messages
        const title = `Session expiring soon — ${threshold} minute${
          threshold === 1 ? "" : "s"
        } remaining`;
        const body =
          threshold >= 15
            ? "Please save any unsaved changes."
            : "Please save your work and prepare to sign in again.";
        _showToast("info", title, body);
        if (typeof cfg.onWarning === "function") {
          try {
            cfg.onWarning(threshold, minutesLeft);
          } catch (e) {
            console.debug("sessionManager: onWarning callback error", e);
          }
        }
        await markWarningShown(threshold);
      }
    }
  }
};

const start = () => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    _checkOnce().catch((e) => console.warn("sessionManager: check error", e));
  }, cfg.checkIntervalMs);
  // run an immediate check
  _checkOnce().catch((e) => console.warn("sessionManager: initial check error", e));
};

const stop = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

const init = (options = {}) => {
  setConfig(options);
  start();
};

export default {
  init,
  start,
  stop,
  setSessionExpiry,
  getSessionExpiry,
  clearSession,
  // exposed for tests/advanced flows:
  getWarningsShown,
  markWarningShown,
};