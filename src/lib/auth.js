// Login for the two sides of the wedding.
//  - Firebase mode: real Firebase Authentication (email/password accounts you
//    create in the Firebase console). SIDE_BY_EMAIL below decides which side
//    (Husain / Zainab) an email belongs to — add new family members' emails here.
//  - Local mode (no Firebase config): simple built-in accounts for previewing.

import { app, firebaseEnabled } from './firebase.js'

const SESSION_KEY = 'wedding-invites:session'

// Which side does each email belong to? Used in BOTH modes.
export const SIDE_BY_EMAIL = {
  'husainhackerrank@gmail.com': { side: 'husain', label: "Husain's Family" },
  'zmalik1418@gmail.com': { side: 'zainab', label: "Zainab's Family" },
}

// Local-mode passwords (Firebase mode ignores these — passwords live safely
// in Firebase Authentication instead).
const LOCAL_PASSWORDS = {
  'husainhackerrank@gmail.com': 'qwerty',
  'zmalik1418@gmail.com': 'qwerty',
}

export async function login(email, password) {
  const normalized = email.trim().toLowerCase()
  const sideInfo = SIDE_BY_EMAIL[normalized]
  if (!sideInfo) return null

  if (firebaseEnabled) {
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth')
    try {
      await signInWithEmailAndPassword(getAuth(app), normalized, password)
    } catch (e) {
      console.error('Firebase login failed', e.code)
      return null
    }
  } else if (LOCAL_PASSWORDS[normalized] !== password) {
    return null
  }

  const session = { email: normalized, ...sideInfo }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function logout() {
  localStorage.removeItem(SESSION_KEY)
  if (firebaseEnabled) {
    const { getAuth, signOut } = await import('firebase/auth')
    await signOut(getAuth(app)).catch(() => {})
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to read session', e)
  }
  return null
}
