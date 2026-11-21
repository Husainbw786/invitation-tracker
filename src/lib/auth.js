// Accounts, backed by Firebase Auth. Anyone can create an account with email
// and password, or continue with Google. What an account can see is decided
// per event (see events.js and firestore.rules), not here.

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { auth } from './firebase.js'

function sessionFor(user) {
  if (!user) return null
  const email = (user.email || '').toLowerCase()
  return {
    uid: user.uid,
    email,
    name: user.displayName || email.split('@')[0] || 'Me',
    emailVerified: Boolean(user.emailVerified),
    // Google accounts are verified by Google; email accounts verify by link.
    viaGoogle: user.providerData.some((p) => p.providerId === 'google.com'),
  }
}

// Firebase error codes in words a guest list keeper understands.
function messageFor(e, fallback = 'Email or password is wrong. Please try again.') {
  switch (e?.code) {
    case 'auth/network-request-failed':
      return 'No internet connection. Please try again.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.'
    case 'auth/invalid-email':
      return 'That email address does not look right.'
    case 'auth/weak-password':
      return 'Choose a password of at least 6 characters.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    case 'auth/popup-blocked':
      return 'The Google window was blocked. Allow pop-ups for this site and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'This email already signs in another way. Use email and password instead.'
    case 'auth/operation-not-allowed':
      return 'This way of signing in is not switched on yet.'
    default:
      return fallback
  }
}

/** Resolves to { session } or { error } (error may be '' for a cancelled popup). */
export async function signIn(email, password) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email.trim(), password)
    return { session: sessionFor(user) }
  } catch (e) {
    console.error('Sign in failed', e.code)
    return { error: messageFor(e) }
  }
}

export async function signUp(name, email, password) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password)
    if (name.trim()) await updateProfile(user, { displayName: name.trim() })
    // Not awaited for the result: a failed verification mail must not block
    // the new account. It can be sent again from the events screen.
    sendEmailVerification(user).catch((e) => console.error('Verification mail failed', e.code))
    return { session: sessionFor(auth.currentUser) }
  } catch (e) {
    console.error('Sign up failed', e.code)
    return { error: messageFor(e, 'Could not create the account. Please try again.') }
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const { user } = await signInWithPopup(auth, provider)
    return { session: sessionFor(user) }
  } catch (e) {
    console.error('Google sign in failed', e.code)
    return { error: messageFor(e, 'Could not sign in with Google. Please try again.') }
  }
}

/** Always resolves to a neutral message, so it never reveals who has an account. */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email.trim())
  } catch (e) {
    console.error('Password reset failed', e.code)
    if (e.code === 'auth/invalid-email') return { error: messageFor(e) }
    if (e.code === 'auth/network-request-failed') return { error: messageFor(e) }
  }
  return { ok: true }
}

export async function resendVerification() {
  if (!auth.currentUser) return false
  try {
    await sendEmailVerification(auth.currentUser)
    return true
  } catch (e) {
    console.error('Verification mail failed', e.code)
    return false
  }
}

/**
 * After the user clicks the link in the verification mail (in another tab or
 * app), pick up the new state and a fresh token that carries it, so the
 * security rules see the verified email straight away.
 */
export async function refreshSession() {
  const user = auth.currentUser
  if (!user) return null
  await reload(user)
  await user.getIdToken(true)
  return sessionFor(auth.currentUser)
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
  return onAuthStateChanged(auth, (user) => fn(sessionFor(user)))
}
