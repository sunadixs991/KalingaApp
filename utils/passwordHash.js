// utils/passwordHash.js
import * as Crypto from "expo-crypto";

const SALT_BYTES = 16;

const toHex = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/**
 * Create a salted SHA-256 hash and return "saltHex$sha256Hex"
 * @param {string} password
 * @returns {Promise<string>} saltedHash (format: saltHex$sha256Hex)
 */
export const hashPassword = async (password) => {
  // Use expo-crypto's random bytes (preferred over expo-random)
  const saltBytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const saltHex = toHex(saltBytes);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltHex + password
  );
  return `${saltHex}$${hash}`;
};

/**
 * Verify a plain password against stored value.
 * - If stored is in "saltHex$hash" format, it verifies using the salt.
 * - If stored appears to be legacy plain-text, it verifies by direct compare
 *   and also returns a migratedHash so you can update the DB.
 *
 * @param {string} plainPassword
 * @param {string} stored  // either "saltHex$hash" or legacy plain password
 * @returns {Promise<{match: boolean, migratedHash: string|null}>}
 */
export const verifyPassword = async (plainPassword, stored) => {
  if (!stored) return { match: false, migratedHash: null };

  if (stored.includes("$")) {
    const [saltHex, hash] = stored.split("$");
    const computed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      saltHex + plainPassword
    );
    return { match: computed === hash, migratedHash: null };
  } else {
    // Legacy plain-text (or previously unhashed) password
    const isMatch = plainPassword === stored;
    if (isMatch) {
      // Create new salted hash for migration
      const newHash = await hashPassword(plainPassword);
      return { match: true, migratedHash: newHash };
    }
    return { match: false, migratedHash: null };
  }
};