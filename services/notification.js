import { collection, addDoc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Alert } from 'react-native';

// Replace with your real IPROG API token and endpoint
const IPROG_API_TOKEN = "41ff414342d8ecaf2e4ebfaa7ead67690679b976";
// bulk send endpoint (used by sendIprogSMS)
const IPROG_BASE_URL = "https://sms.iprogtech.com/api/v1/sms_messages/send_bulk";
// OTP-specific endpoint (use this for single OTP requests)
const IPROG_OTP_URL = "https://www.iprogsms.com/api/v1/sms_messages";

// Format phone to +63XXXXXXXXXX or return null
export const formatPhoneNumber = (phoneNumber) => {
  try {
    if (!phoneNumber || typeof phoneNumber !== "string") return null;
    const digits = phoneNumber.replace(/\D/g, ""); // remove non-digits

    let normalized = digits;
    if (normalized.startsWith("0")) normalized = "63" + normalized.substring(1);
    else if (normalized.length === 10) normalized = "63" + normalized; // assume local 10-digit
    // if already starts with 63 and correct length, leave as is

    const e164 = "+" + normalized;
    return /^\+63\d{10}$/.test(e164) ? e164 : null;
  } catch (err) {
    console.warn("formatPhoneNumber error:", err);
    return null;
  }
};

export const getAllPhoneNumbers = async () => {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const phones = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data?.phone) {
        const raw = String(data.phone);
        const formatted = formatPhoneNumber(raw);
        if (formatted) {
          phones.push({ raw, formatted });
        } else {
          console.warn(`Skipping invalid phone: ${raw}`);
        }
      }
    });

    // Debug: show collected numbers (readable)
    if (phones.length) {
      console.log(
        `getAllPhoneNumbers: found ${phones.length} entries. Sample:\n` +
        phones.slice(0, 50).map(p => `raw: ${p.raw} -> formatted: ${p.formatted}`).join("\n")
      );
    } else {
      console.log("getAllPhoneNumbers: no valid phone numbers found.");
    }

    // return array of formatted numbers only
    return phones.map(p => p.formatted);
  } catch (err) {
    console.error("getAllPhoneNumbers error:", err);
    return [];
  }
};

// Send SMS via IPROG in bulk. Batches numbers to avoid too-large URLs.
export const sendIprogSMS = async (message, phoneNumbers = [], batchSize = 100) => {
  try {
    if (!phoneNumbers.length) phoneNumbers = await getAllPhoneNumbers();

    const formatted = phoneNumbers
      .map((p) => formatPhoneNumber(String(p)))
      .filter(Boolean);

    if (!formatted.length) throw new Error("No valid phone numbers after formatting");

    // IPROG expects numbers as 63XXXXXXXXX (no +), comma separated
    const cleanedList = formatted.map((p) => p.replace("+", ""));

    // Log what will be sent (readable)
    console.log(`sendIprogSMS: sending message to ${cleanedList.length} numbers.`);
    console.log("Recipients (E.164):", JSON.stringify(formatted, null, 2));

    const batches = [];
    for (let i = 0; i < cleanedList.length; i += batchSize) {
      batches.push(cleanedList.slice(i, i + batchSize));
    }

    const batchResults = [];
    for (const batch of batches) {
      const numbersCSV = batch.join(",");

      // Build JSON payload per IPROG docs
      const payload = {
        api_token: IPROG_API_TOKEN,
        phone_number: numbersCSV,
        message: message,
        sms_provider: 0
      };

      try {
        const res = await fetch(IPROG_BASE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        // parse response (JSON expected)
        let data = null;
        try {
          data = await res.json();
        } catch (parseErr) {
          const text = await res.text().catch(() => null);
          try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
        }

        const ok = res.ok || (data && (data.status === 200 || String(data.status) === "200"));
        const status = ok ? "sent" : "failed";

        // Construct readable per-number results for this batch
        const perNumberResults = batch.map(n => ({
          phone: `+${n}`,
          status,
          provider_response: data || null
        }));

        // Log batch result to Firestore (non-blocking)
        try {
          await addDoc(collection(db, "smsNotifications"), {
            recipients: perNumberResults.map(r => r.phone),
            message,
            status,
            response: data,
            method: "iprog",
            sentAt: new Date(),
          });
        } catch (logErr) {
          console.warn("Firestore log failed for batch", logErr);
        }

        // Console readable summary for this batch
        console.log(`IPROG batch sent: ${batch.length} recipients. status: ${status}`);
        if (data) console.log("IPROG response:", JSON.stringify(data));

        batchResults.push({ batch: perNumberResults, success: ok, rawResponse: data });
      } catch (err) {
        console.error("IPROG request failed for batch:", err);
        const perNumberResults = batch.map(n => ({
          phone: `+${n}`,
          status: "failed",
          provider_response: null,
          error: String(err)
        }));

        try {
          await addDoc(collection(db, "smsNotifications"), {
            recipients: perNumberResults.map(r => r.phone),
            message,
            status: "failed",
            error: String(err),
            method: "iprog",
            sentAt: new Date(),
          });
        } catch {}

        batchResults.push({ batch: perNumberResults, success: false, error: String(err) });
      }
    }

    // Build a readable results summary
    const totalRecipients = cleanedList.length;
    const sentCount = batchResults.reduce((acc, r) => acc + (r.success ? r.batch.length : 0), 0);

    console.log(`sendIprogSMS: finished. Sent (approx): ${sentCount} / ${totalRecipients}`);
    // Log a concise per-number status for quick debugging
    batchResults.forEach((r, idx) => {
      console.log(`Batch ${idx + 1} summary:`);
      r.batch.forEach(item => console.log(`  ${item.phone} -> ${item.status}`));
    });

    Alert.alert("SMS Result", `Sent (approx): ${sentCount} / ${totalRecipients} recipients`);
    return { success: sentCount > 0, results: batchResults, method: "iprog" };
  } catch (error) {
    console.error("IPROG SMS error:", error);
    Alert.alert("SMS Error", error.message || String(error));
    return { success: false, error: error.message || String(error) };
  }
};

// Always use IPROG
export const notifyUsers = async (message, phoneNumbers = []) => {
  try {
    return await sendIprogSMS(message, phoneNumbers);
  } catch (err) {
    console.error("notifyUsers error:", err);
    return { success: false, error: String(err) };
  }
};

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS to a single phone number
export const sendOTPSMS = async (phoneNumber, otp = null) => {
  try {
    if (!phoneNumber || typeof phoneNumber !== "string") {
      throw new Error("Invalid phone number");
    }

    const formatted = formatPhoneNumber(phoneNumber);
    if (!formatted) {
      throw new Error(`Phone number format invalid: ${phoneNumber}`);
    }

    // Generate OTP if not provided
    const otpCode = otp || generateOTP();
    const message = `Your Kalinga App verification code is: ${otpCode}. This code will expire in 10 minutes.`;

    // Remove + for IPROG API
    const cleanedNumber = formatted.replace("+", "");

    const payload = {
      api_token: IPROG_API_TOKEN,
      phone_number: cleanedNumber,
      message: message,
      sms_provider: 0
    };

    console.log(`sendOTPSMS: sending OTP to ${formatted}`);

    // use OTP-specific endpoint
    const res = await fetch(IPROG_OTP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let data = null;
    try {
      data = await res.json();
    } catch (parseErr) {
      const text = await res.text().catch(() => null);
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    }

    const ok = res.ok || (data && (data.status === 200 || String(data.status) === "200"));

    // Log OTP attempt to Firestore
    try {
      await addDoc(collection(db, "otpNotifications"), {
        phone: formatted,
        otp: otpCode,
        message,
        status: ok ? "sent" : "failed",
        response: data,
        method: "iprog",
        sentAt: new Date(),
      });
    } catch (logErr) {
      console.warn("Firestore OTP log failed:", logErr);
    }

    console.log(`sendOTPSMS: ${ok ? "success" : "failed"}. Response:`, data);

    return {
      success: ok,
      otp: otpCode,
      phone: formatted,
      response: data,
      method: "iprog"
    };
  } catch (error) {
    console.error("sendOTPSMS error:", error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};

// Verify OTP (basic client-side check + Firestore validation)
export const verifyOTP = async (phoneNumber, enteredOTP) => {
  try {
    if (!phoneNumber || !enteredOTP) {
      throw new Error("Phone number and OTP required");
    }

    const formatted = formatPhoneNumber(phoneNumber);
    if (!formatted) {
      throw new Error("Invalid phone number format");
    }

    // Query Firestore for matching OTP (most recent, not expired)
    const snapshot = await getDocs(
      collection(db, "otpNotifications")
    );

    let validOTP = null;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const sentTime = data.sentAt?.toDate ? data.sentAt.toDate() : new Date(data.sentAt);
      const now = new Date();
      const expiresIn = 10 * 60 * 1000; // 10 minutes

      // Check if OTP matches phone, is correct code, and not expired
      if (
        data.phone === formatted &&
        data.otp === enteredOTP.trim() &&
        (now - sentTime) < expiresIn &&
        !data.verified
      ) {
        validOTP = doc;
      }
    });

    if (!validOTP) {
      return {
        success: false,
        error: "Invalid or expired OTP"
      };
    }

    // Mark OTP as verified in Firestore
    try {
      await updateDoc(validOTP.ref, {
        verified: true,
        verifiedAt: new Date(),
      });
    } catch (updateErr) {
      console.warn("Failed to mark OTP as verified:", updateErr);
    }

    console.log("OTP verified successfully for:", formatted);

    return {
      success: true,
      phone: formatted,
      message: "OTP verified successfully"
    };
  } catch (error) {
    console.error("verifyOTP error:", error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
};