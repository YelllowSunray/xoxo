import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDl7J_X8jHinJrsS8_lqbwW5GNuhCoWeuo",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "xoxo-53066.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "xoxo-53066",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "xoxo-53066.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "832070586009",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:832070586009:web:f30ef934d04538ecfb3208",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-17Z126NS7J"
};

console.log("Firebase config:", firebaseConfig);

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Only connect to emulators in development and if not already connected
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  try {
    // Check if emulators are running (optional - only if you want to use emulators)
    // connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    // connectFirestoreEmulator(db, "localhost", 8080);
  } catch (error) {
    console.log("Emulators not available, using production Firebase");
  }
}

// Add connection monitoring
if (typeof window !== 'undefined') {
  // Monitor online/offline status
  window.addEventListener('online', () => {
    console.log('Network: Back online');
  });
  
  window.addEventListener('offline', () => {
    console.log('Network: Gone offline');
  });
}

export { app, auth, db };
