import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// Values are injected at build time from environment variables (see .env.local.example).
// The Firebase web API key is a public client identifier — security is enforced by
// Firestore security rules, not by keeping this value secret.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Emulator setup (dev only - optional)
const isDev = process.env.NODE_ENV === 'development'
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost'

// Try to connect to emulator, but don't fail if not available
if (isDev && isLocalhost) {
  try {
    // First check if emulator is available
    fetch('http://localhost:9099/__/health', { method: 'HEAD' })
      .then(() => {
        // Emulator is available, connect to it
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
        connectFirestoreEmulator(db, 'localhost', 8080)
      })
      .catch(() => {
        // Emulator not available, use real Firebase
      })
  } catch (err) {
    // Silently fall back to real Firebase
  }
}
