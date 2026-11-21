// Firebase connection.
//
// This is the web app config from the Firebase console. These values are not
// secrets: Firebase web config is designed to ship inside the browser bundle.
// Access is controlled by Firebase Auth plus the Firestore security rules in
// `firestore.rules`, not by hiding these values. They are kept here (with an
// env override) so the app just works on every device without extra deploy
// configuration.
//
// `npm run dev:local` sets VITE_USE_EMULATORS=1: the app then talks to the
// Firebase emulators on this computer (`npm run emulators`) and never touches
// the live data.

import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env

export const USE_EMULATORS = env.VITE_USE_EMULATORS === '1'

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCxRxVWvvtcoDn2JZ7oZQOfLCZFYAlL0vs',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'wedding-invites-8e5ff.firebaseapp.com',
  // A "demo-" project id makes the emulators refuse to reach any real project.
  projectId: USE_EMULATORS ? 'demo-invitations' : env.VITE_FIREBASE_PROJECT_ID || 'wedding-invites-8e5ff',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'wedding-invites-8e5ff.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '538171285341',
  appId: env.VITE_FIREBASE_APP_ID || '1:538171285341:web:2ec09eb60d817304be52b4',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

export const db = initializeFirestore(app, {
  // Firestore rejects `undefined` values; drop them instead of failing a save.
  ignoreUndefinedProperties: true,
  // Keep a copy of the lists on the phone, so opening an event again only
  // fetches what changed (fewer reads on the free plan) and works offline.
  // The emulator's data is thrown away on every restart, so no cache there.
  localCache: USE_EMULATORS
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8180)
}
