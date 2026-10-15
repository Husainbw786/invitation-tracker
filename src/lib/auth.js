// Login for the two sides of the wedding, backed by Firebase Auth.
// Each account belongs to a side (husain / zainab) and only sees that side's
// families. Passwords live in Firebase (Authentication -> Users), not here.
//
// To add an account for a relative: create the user in the Firebase console,
// add it below, and add the same email to `firestore.rules`.

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from './firebase.js'

export const ACCOUNTS = [
  { email: 'husainhackerrank@gmail.com', side: 'husain', label: "Husain's Family" },
  { email: 'zmalik1418@gmail.com', side: 'zainab', label: "Zainab's Family" },
]

function sessionFor(user) {
  const email = user?.email?.toLowerCase()
  const account = ACCOUNTS.find((a) => a.email === email)
  return account ? { email: account.email, side: account.side, label: account.label } : null
}

/**
 * Log in. Resolves to { session } on success or { error } with a message
 * that can be shown to the user.
 */
export async function login(email, password) {
  const account = ACCOUNTS.find((a) => a.email === email.trim().toLowerCase())
  if (!account) return { error: 'This email is not on the invitation list.' }
  try {
    const { user } = await signInWithEmailAndPassword(auth, account.email, password)
    return { session: sessionFor(user) }
  } catch (e) {
    console.error('Login failed', e.code)
    if (e.code === 'auth/network-request-failed') {
      return { error: 'No internet connection. Please try again.' }
    }
    if (e.code === 'auth/too-many-requests') {
      return { error: 'Too many attempts. Please wait a few minutes and try again.' }
    }
    return { error: 'Email or password is wrong. Please try again.' }
  }
}

export function logout() {
  return signOut(auth)
}

/**
 * Watch the logged-in session. Calls fn(session | null) once Firebase has
 * restored any saved login, and again on every login/logout.
 * Returns an unsubscribe function.
 */
export function watchSession(fn) {
  return onAuthStateChanged(auth, (user) => {
    const session = sessionFor(user)
    // A Firebase user that is no longer in ACCOUNTS is logged out here too.
    if (user && !session) signOut(auth)
    fn(session)
  })
}
