// Firebase web configuration.
// Values are injected at build time from environment variables (see .env.local.example).
// The Firebase web API key is a public client identifier — security is enforced by
// Firestore security rules, not by keeping this value secret.

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
