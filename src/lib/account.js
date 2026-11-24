// Deleting an account (Google Play requires apps with sign-in to offer it).
//
// Order matters: first prove it is really the account holder (Firebase only
// deletes a login that signed in recently, and asking again also confirms
// the choice), then remove the account's data, then the login itself. So a
// wrong password never leaves the data half deleted.

import {
  EmailAuthProvider,
  GoogleAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from 'firebase/auth'
import { auth } from './firebase.js'
import { declineInvite, deleteEvent, removeHelper } from './events.js'

/** What deleting would do: events deleted for everyone, events left. */
export function deletionPlan(session, events, invites) {
  const owned = (events || []).filter((e) => e.ownerId === session.uid)
  const helping = (events || []).filter((e) => e.ownerId !== session.uid)
  return { owned, helping, invites: invites || [] }
}

function reauthError(e) {
  switch (e?.code) {
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'That password is wrong.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Confirm with Google to delete your account.'
    case 'auth/user-mismatch':
      return 'Choose the same Google account you are signed in with.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.'
    case 'auth/network-request-failed':
      return 'No internet connection. Please try again.'
    default:
      return 'Could not confirm it is you. Please try again.'
  }
}

/**
 * Deletes every event this account owns (with all guests and RSVP links),
 * leaves the events it helps with, declines open invitations, then deletes
 * the login. Email accounts pass their password; Google accounts confirm in
 * a Google window. Resolves to { ok } or { error }.
 */
export async function deleteMyAccount(session, events, invites, password) {
  const user = auth.currentUser
  if (!user) return { error: 'You are signed out. Sign in again first.' }

  try {
    if (session.viaGoogle) {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await reauthenticateWithPopup(user, provider)
    } else {
      if (!password) return { error: 'Enter your password to confirm.' }
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))
    }
  } catch (e) {
    console.error('Re-sign-in for account deletion failed', e.code)
    return { error: reauthError(e) }
  }

  const { owned, helping, invites: open } = deletionPlan(session, events, invites)
  for (const event of owned) {
    if (!(await deleteEvent(event.id))) return { error: `Could not delete "${event.name}". Check your internet connection and try again.` }
  }
  for (const event of helping) {
    if (!(await removeHelper(event, session.uid))) return { error: `Could not leave "${event.name}". Check your internet connection and try again.` }
  }
  for (const event of open) await declineInvite(event, session)

  try {
    await deleteUser(user)
    return { ok: true }
  } catch (e) {
    console.error('Could not delete the login', e.code)
    return { error: 'Your lists are deleted, but the login could not be removed. Please try again.' }
  }
}
