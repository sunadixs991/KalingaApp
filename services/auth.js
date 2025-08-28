import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const ADMIN_USER_ID = 'USER1756355450115337';

export async function loginWithUsernameAndPassword(username, password) {
  try {
    const q = query(
      collection(db, 'users'),
      where('username', '==', username),
      where('password', '==', password)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      const isAdmin = userData.userId === ADMIN_USER_ID;
      
      return {
        success: true,
        userData: {
          ...userData,
          isAdmin
        }
      };
    }
    
    return {
      success: false,
      userData: null
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      userData: null,
      error: error.message
    };
  }
}