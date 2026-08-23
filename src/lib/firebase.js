// Firebase bootstrap.
//
// The app runs in one of two modes, decided automatically:
//   - Cloud mode: when the VITE_FIREBASE_* env vars are present, families are
//     stored in Firestore and sync live across every device.
//   - Local mode: with no config, everything falls back to this device's
//     localStorage. Handy for development and for previewing the UI.
//
// Login stays a simple hardcoded check either way (see auth.js). Because of
// that, Firestore rules must allow open access, so treat the deployed URL as
// the only thing keeping the guest list private, and keep CSV backups.

import { initializeApp } from 'firebase/app'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

export const app = firebaseEnabled ? initializeApp(config) : null
