// Firebase web configuration.
// Values are injected at build time from environment variables (see .env.local.example).
// The Firebase web API key is a public client identifier — security is enforced by
// Firestore security rules, not by keeping this value secret.

function isUsableEnvValue(value) {
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

function configValue(envValue, fallback) {
  return isUsableEnvValue(envValue) ? envValue.trim() : fallback
}

// Env vars (set at build time) take precedence only when they contain usable
// values; otherwise we fall back to the public project web config so the deployed
// site keeps working. These are public client identifiers, not secrets.
export const firebaseConfig = {
  apiKey: configValue(import.meta.env.VITE_FIREBASE_API_KEY, 'AIzaSyA7lrVXLwJjMIYocOg4hWRSTIzBo7M3YtE'),
  authDomain: configValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'evidence-vydaju.firebaseapp.com'),
  projectId: configValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'evidence-vydaju'),
  storageBucket: configValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'evidence-vydaju.firebasestorage.app'),
  messagingSenderId: configValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, '153586307551'),
  appId: configValue(import.meta.env.VITE_FIREBASE_APP_ID, '1:153586307551:web:814a28a53285f377c8b46a'),
};

export const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
