import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Alert } from 'react-native';

// Replace with your real IPROG API token and endpoint
const IPROG_API_TOKEN = "41ff414342d8ecaf2e4ebfaa7ead67690679b976";
const IPROG_BASE_URL = "https://sms.iprogtech.com/api/v1/sms_messages/send_bulk";

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