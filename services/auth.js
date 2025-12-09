import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { verifyPassword } from '../utils/passwordHash';

const ADMIN_USER_ID = 'USER1756355450115337';

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

    // If verification suggests a migrated hash, persist it once
    if (migratedHash) {
      try {
        await updateDoc(doc(db, 'users', userDocId), { password: migratedHash });
      } catch (err) {
        console.warn('Failed to persist migrated password hash:', err);
      }
    }

    const isAdmin = userData.userId === ADMIN_USER_ID;
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