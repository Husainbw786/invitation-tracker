// Firebase bootstrap.
// The app runs in two modes:
//  - Firebase mode: when the VITE_FIREBASE_* env vars are set (see .env.example),
//    login uses Firebase Authentication and data lives in Firestore (shared live
//    across all devices).
//  - Local mode: with no config, everything falls back to localStorage on this
//    device — handy for development and previewing the UI.

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
