import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { verifyPassword } from '../utils/passwordHash';
import { sendOTPSMS } from './notification'; // used to send OTP via SMS

// Admin userTypes that require MFA
const ADMIN_TYPES_REQUIRING_MFA = new Set([
  'DRRM Admin',
  'CSWD Admin',
  'Super Admin'
]);

export async function loginWithUsernameAndPassword(username, password) {
  try {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, userData: null };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const userDocId = userDoc.id;

    // Verify password using helper that supports legacy plaintext and migration
    const { match, migratedHash } = await verifyPassword(password, userData.password || '');

    if (!match) {
      return { success: false, userData: null };
    }

    // Persist migrated hash if suggested
    if (migratedHash) {
      try {
        await updateDoc(doc(db, 'users', userDocId), { password: migratedHash });
      } catch (err) {
        console.warn('Failed to persist migrated password hash:', err);
      }
    }

    const isAdmin = ADMIN_TYPES_REQUIRING_MFA.has(userData.userType) || !!userData.isAdmin;

    // If admin and MFA is required, send OTP SMS and ask caller to verify OTP
    if (isAdmin && ADMIN_TYPES_REQUIRING_MFA.has(userData.userType)) {
      // phone may be stored on user record; fallback to null
      const phone = userData.phone || null;

      // Attempt to send OTP (sendOTPSMS logs the OTP to Firestore)
      let sendResult = null;
      if (phone) {
        try {
          sendResult = await sendOTPSMS(phone);
        } catch (err) {
          console.warn('Failed to send OTP SMS:', err);
          sendResult = { success: false, error: String(err) };
        }
      }

      // Return indicates password ok but MFA pending
      return {
        success: true,
        userData: { ...userData, isAdmin },
        requiresMFA: true,
        mfaPhone: sendResult?.phone || phone || null,
        mfaSmsSent: !!sendResult?.success
      };
    }

    // Non-admin or admin not requiring MFA: treat as normal login success
    return {
      success: true,
      userData: {
        ...userData,
        isAdmin,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, userData: null, error: error.message };
  }
}