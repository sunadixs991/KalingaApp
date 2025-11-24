import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatPhoneNumber } from './notification';

const IPROG_API_TOKEN = "41ff414342d8ecaf2e4ebfaa7ead67690679b976";
const IPROG_BASE_URL = "https://www.iprogsms.com/api/v1/sms_messages";

/**
 * Robust single SMS sender — accepts (phone, message) or (message, phone)
 * @param {string} maybePhoneOrMessage
 * @param {string} maybeMessageOrPhone
 * @param {object} metadata - optional metadata to log
 */
const sendSecuritySMS = async (maybePhoneOrMessage, maybeMessageOrPhone, metadata = {}) => {
  try {
    // helper to test phone-like string (allows +63..., 09..., digits)
    const looksLikePhone = (s) => {
      if (typeof s !== 'string') return false;
      const cleaned = s.replace(/\s|-/g, '');
      return /^(\+?\d{10,15}|0\d{9,11})$/.test(cleaned);
    };

    // determine phone and message
    let phoneCandidate = maybePhoneOrMessage;
    let messageCandidate = maybeMessageOrPhone;

    if (!looksLikePhone(phoneCandidate) && looksLikePhone(messageCandidate)) {
      // swapped args -> fix
      [phoneCandidate, messageCandidate] = [messageCandidate, phoneCandidate];
    } else if (!looksLikePhone(phoneCandidate) && !looksLikePhone(messageCandidate)) {
      // neither looks like phone — try to infer: shorter one likely phone-ish digits
      if (maybePhoneOrMessage.length < 20 && /\d/.test(maybePhoneOrMessage)) {
        phoneCandidate = maybePhoneOrMessage;
        messageCandidate = maybeMessageOrPhone;
      } else if (maybeMessageOrPhone.length < 20 && /\d/.test(maybeMessageOrPhone)) {
        phoneCandidate = maybeMessageOrPhone;
        messageCandidate = maybePhoneOrMessage;
      } else {
        throw new Error("Invalid phone number");
      }
    }

    // format phone like OTP service
    const formatted = formatPhoneNumber(phoneCandidate);
    if (!formatted) throw new Error(`Phone number format invalid: ${phoneCandidate}`);

    // Use same payload/endpoint pattern as OTP
    const cleanedNumber = formatted.replace("+", "");
    const payload = {
      api_token: IPROG_API_TOKEN,
      phone_number: cleanedNumber,
      message: String(messageCandidate),
      sms_provider: 0
    };

    console.log(`sendSecuritySMS: sending to ${formatted}`);

    const res = await fetch(IPROG_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let data = null;
    try { data = await res.json(); } catch (e) {
      const text = await res.text().catch(() => null);
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    }

    const ok = res.ok || (data && (data.status === 200 || String(data.status) === "200"));

    // log
    try {
      await addDoc(collection(db, "securityNotifications"), {
        phone: formatted,
        message: String(messageCandidate),
        status: ok ? "sent" : "failed",
        response: data,
        method: "iprog",
        sentAt: serverTimestamp(),
        ...metadata
      });
    } catch (logErr) {
      console.warn("Failed to log security notification:", logErr);
    }

    console.log(`sendSecuritySMS: ${ok ? "success" : "failed"}. Response:`, data);
    return { success: ok, phone: formatted, response: data };
  } catch (error) {
    console.error("sendSecuritySMS error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

export { sendSecuritySMS };

/**
 * Send SMS notification for account lockout
 * UPDATED: Removed trigger words like "SECURITY ALERT", "LOCKED", all caps
 */
export const notifyAccountLocked = async (
  phoneNumber,
  username,
  reason = "Multiple failed login attempts",
  lockDurationMinutes = 15
) => {
  try {
    if (!phoneNumber) {
      console.warn("notifyAccountLocked: No phone number provided");
      return { success: false, error: "No phone number" };
    }

    // Carrier-friendly message: no all caps, no trigger words
    const message = `Hi ${username}, your Kalinga App account access has been paused for ${lockDurationMinutes} minutes due to unusual activity. If you need assistance, please contact our support team.`;

    return await sendSecuritySMS(phoneNumber, message);
  } catch (error) {
    console.error("notifyAccountLocked error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

/**
 * Send SMS notification for suspicious login attempt
 * UPDATED: Removed "SUSPICIOUS", "DETECTED", all caps, password mentions
 */
export const notifySuspiciousLogin = async (
  phoneNumber,
  username,
  deviceInfo,
  timestamp
) => {
  try {
    if (!phoneNumber) {
      console.warn("notifySuspiciousLogin: No phone number provided");
      return { success: false, error: "No phone number" };
    }

    // Casual, non-threatening message
    const message = `Hello ${username}, we noticed a new login to your Kalinga App from ${deviceInfo} on ${new Date(timestamp).toLocaleString()}. Was this you? If not, please contact us right away.`;

    return await sendSecuritySMS(message, phoneNumber, "suspicious_login", {
      username,
      deviceInfo,
      attemptTime: timestamp
    });
  } catch (error) {
    console.error("notifySuspiciousLogin error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

/**
 * Send SMS notification for brute force attack
 * UPDATED: Removed "SECURITY ALERT", "FAILED", "LOCKED", all caps
 */
export const notifyBruteForceAttempt = async (
  phoneNumber,
  username,
  attemptCount
) => {
  try {
    if (!phoneNumber) {
      console.warn("notifyBruteForceAttempt: No phone number provided");
      return { success: false, error: "No phone number" };
    }

    // Informational, non-alarming message
    const message = `Hi ${username}, there have been ${attemptCount} unsuccessful login tries on your Kalinga App account. Please verify this was you. If you need help accessing your account, contact support.`;

    return await sendSecuritySMS(message, phoneNumber, "brute_force_attempt", {
      username,
      attemptCount
    });
  } catch (error) {
    console.error("notifyBruteForceAttempt error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

/**
 * Send SMS notification for password change
 * UPDATED: Removed "PASSWORD", all caps, alarming language
 */
export const notifyPasswordChanged = async (phoneNumber, username) => {
  try {
    if (!phoneNumber) {
      console.warn("notifyPasswordChanged: No phone number provided");
      return { success: false, error: "No phone number" };
    }

    // Neutral, informational message
    const message = `Hello ${username}, your Kalinga App login credentials were recently updated on ${new Date().toLocaleString()}. If this wasn't you, please reach out to our support team.`;

    return await sendSecuritySMS(message, phoneNumber, "password_changed", {
      username,
      changedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("notifyPasswordChanged error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

/**
 * Send SMS notification for admin account unlock
 * UPDATED: Removed "UNLOCKED", emojis, all caps
 */
export const notifyAccountUnlocked = async (phoneNumber, username) => {
  try {
    if (!phoneNumber) {
      console.warn("notifyAccountUnlocked: No phone number provided");
      return { success: false, error: "No phone number" };
    }

    // Positive, simple message
    const message = `Good news ${username}! Your Kalinga App account is now accessible again. You can log in at any time. Need help? Contact support.`;

    return await sendSecuritySMS(message, phoneNumber, "account_unlocked", {
      username,
      unlockedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("notifyAccountUnlocked error:", error);
    return { success: false, error: error.message || String(error) };
  }
};

/**
 * Get user's phone number from Firestore
 */
export const getUserPhoneNumber = async (username) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", username));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      return userData.phone || null;
    }
    return null;
  } catch (error) {
    console.error("getUserPhoneNumber error:", error);
    return null;
  }
};

/**
 * Send account locked notification after failed attempts
 */
export const sendLockedAccountNotification = async (username, reason = "Multiple failed login attempts") => {
  try {
    console.log(`Attempting to notify locked account: ${username}`);

    const phoneNumber = await getUserPhoneNumber(username);

    if (!phoneNumber) {
      console.warn(`No phone number found for user: ${username}`);
      return { success: false, error: "User has no phone number on file" };
    }

    return await notifyAccountLocked(phoneNumber, username, reason, 15);
  } catch (error) {
    console.error("sendLockedAccountNotification error:", error);
    return { success: false, error: error.message || String(error) };
  }
};