import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

function isUsableEnvValue(value: string | undefined): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false

  const upper = trimmed.toUpperCase()
  return !(
    trimmed.startsWith('<') ||
    trimmed.endsWith('>') ||
    upper.includes('YOUR_') ||
    upper.includes('_HERE') ||
    upper.includes('EXAMPLE') ||
    upper.includes('PLACEHOLDER')
  )
}

function configValue(envValue: string | undefined, fallback: string) {
  return isUsableEnvValue(envValue) ? envValue.trim() : fallback
}

// Values are injected at build time from environment variables (see .env.local.example).
// The Firebase web API key is a public client identifier — security is enforced by
// Firestore security rules, not by keeping this value secret.
const firebaseConfig = {
  apiKey: configValue(import.meta.env.VITE_FIREBASE_API_KEY, 'AIzaSyA7lrVXLwJjMIYocOg4hWRSTIzBo7M3YtE'),
  authDomain: configValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'evidence-vydaju.firebaseapp.com'),
  projectId: configValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'evidence-vydaju'),
  storageBucket: configValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'evidence-vydaju.firebasestorage.app'),
  messagingSenderId: configValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, '153586307551'),
  appId: configValue(import.meta.env.VITE_FIREBASE_APP_ID, '1:153586307551:web:814a28a53285f377c8b46a'),
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
