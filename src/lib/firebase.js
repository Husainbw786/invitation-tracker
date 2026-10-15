// Firebase connection.
//
// This is the web app config from the Firebase console. These values are not
// secrets: Firebase web config is designed to ship inside the browser bundle.
// Access is controlled by Firebase Auth plus the Firestore security rules in
// `firestore.rules`, not by hiding these values. They are kept here (with an
// env override) so the app just works on every device without extra deploy
// configuration.

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCxRxVWvvtcoDn2JZ7oZQOfLCZFYAlL0vs',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'wedding-invites-8e5ff.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'wedding-invites-8e5ff',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'wedding-invites-8e5ff.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '538171285341',
  appId: env.VITE_FIREBASE_APP_ID || '1:538171285341:web:2ec09eb60d817304be52b4',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)

// Firestore rejects `undefined` values; drop them instead of failing a save.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })

export const COLLECTION = 'families'
