// Import the functions you need from the Firebase SDK
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAkWUZSGU2v1Iu1tv7tIcqGZ25oh9F7ElE',
  authDomain: 'kalingaapp-799a0.firebaseapp.com',
  projectId: 'kalingaapp-799a0',
  storageBucket: 'kalingaapp-799a0.appspot.com', // <-- fix typo here
  messagingSenderId: '536685997944',
  appId: '1:536685997944:web:59afd120b2f6837f64628d',
  // measurementId is not needed for React Native
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { db };