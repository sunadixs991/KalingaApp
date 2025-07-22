import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function loginWithUsernameAndPassword(username, password) {
  const q = query(
    collection(db, 'users'),
    where('username', '==', username),
    where('password', '==', password)
  );
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}