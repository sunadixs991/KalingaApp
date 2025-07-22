import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function getUserInfo(username) {
  const trimmedUsername = username.trim(); // Trim spaces
  const q = query(collection(db, 'users'), where('username', '==', trimmedUsername));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}