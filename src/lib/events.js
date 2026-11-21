// Events: each event is one guest list with an owner and optional helpers.
//
//   events/{eventId}
//     name, subtitle, type, date ('YYYY-MM-DD' or ''), venue, art
//     ownerId
//     memberIds      [uid, ...]               who can open it (for "my events")
//     members        { uid: { role, name, email } }   role: owner | editor | viewer
//     invitedEmails  ['helper@gmail.com', ...] helpers asked to join, not joined yet
//     inviteRoles    { 'helper@gmail.com': 'editor' | 'viewer' }
//     settings       see eventTypes.js (defaultSettings)
//     createdAt, updatedAt
//   events/{eventId}/guests/{guestId}         see store.js
//   events/{eventId}/public/card              see rsvp.js
//   events/{eventId}/rsvps/{token}            see rsvp.js
//
// firestore.rules enforces who may do what; the helpers below only make the
// writes the rules allow.

import {
  FieldPath,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { defaultSettings } from './eventTypes.js'

const events = collection(db, 'events')

export const ROLE_LABELS = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' }

export function eventRef(eventId) {
  return doc(events, eventId)
}

export function guestsRef(eventId) {
  return collection(db, 'events', eventId, 'guests')
}

export function rsvpsRef(eventId) {
  return collection(db, 'events', eventId, 'rsvps')
}

/** What a guest's RSVP page may show about the event (see rsvp.js). */
export function cardRef(eventId) {
  return doc(db, 'events', eventId, 'public', 'card')
}

function fromDoc(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    name: d.name || 'Untitled event',
    subtitle: d.subtitle || '',
    type: d.type || 'custom',
    date: d.date || '',
    venue: d.venue || '',
    art: d.art || '',
    ownerId: d.ownerId,
    memberIds: d.memberIds || [],
    members: d.members || {},
    invitedEmails: d.invitedEmails || [],
    inviteRoles: d.inviteRoles || {},
    settings: d.settings || {},
    migratedFrom: d.migratedFrom || '',
    createdAt: Number(d.createdAt) || 0,
  }
}

export function roleIn(event, uid) {
  return event?.members?.[uid]?.role || null
}

export function canEditEvent(event, uid) {
  return ['owner', 'editor'].includes(roleIn(event, uid))
}

export function isOwnerOf(event, uid) {
  return roleIn(event, uid) === 'owner'
}

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Coming up first (soonest on top), then events without a date (newest
// first), then past events (most recent first).
function byWhen(a, b) {
  const now = today()
  const rank = (e) => (!e.date ? 1 : e.date >= now ? 0 : 2)
  const ra = rank(a)
  const rb = rank(b)
  if (ra !== rb) return ra - rb
  if (ra === 0) return a.date.localeCompare(b.date)
  if (ra === 2) return b.date.localeCompare(a.date)
  return b.createdAt - a.createdAt
}

function report(what) {
  return (error) => console.error(what, error.code, error.message)
}

// ---------------------------------------------------------------- reading

/** Every event this account owns or helps with, live. */
export function subscribeMyEvents(uid, fn) {
  return onSnapshot(
    query(events, where('memberIds', 'array-contains', uid)),
    (snap) => fn(snap.docs.map(fromDoc).sort(byWhen)),
    report('Could not load events')
  )
}

/** Events this (verified) email has been asked to help with, live. */
export function subscribeMyInvites(email, fn) {
  return onSnapshot(
    query(events, where('invitedEmails', 'array-contains', email)),
    (snap) => fn(snap.docs.map(fromDoc)),
    report('Could not load invitations')
  )
}

// ---------------------------------------------------------------- owner

/** Resolves to the new event's id, or null when it could not be saved. */
export async function createEvent(session, { type, name, subtitle, date, venue }) {
  const now = Date.now()
  try {
    const ref = await addDoc(events, {
      name: name.trim(),
      subtitle: (subtitle || '').trim(),
      type,
      date: date || '',
      venue: (venue || '').trim(),
      art: '',
      ownerId: session.uid,
      memberIds: [session.uid],
      members: { [session.uid]: { role: 'owner', name: session.name, email: session.email } },
      invitedEmails: [],
      inviteRoles: {},
      settings: defaultSettings(type),
      createdAt: now,
      updatedAt: now,
    })
    return ref.id
  } catch (e) {
    console.error('Could not create event', e.code, e.message)
    return null
  }
}

const DETAIL_FIELDS = ['name', 'subtitle', 'type', 'date', 'venue', 'settings']

/**
 * Owner only: name, date, type, settings and so on. With `card`, the public
 * card RSVP pages read is saved in the same write. Resolves to true/false.
 */
export async function updateEvent(eventId, patch, card) {
  const data = { updatedAt: Date.now() }
  for (const key of DETAIL_FIELDS) if (key in patch) data[key] = patch[key]
  try {
    const batch = writeBatch(db)
    batch.update(eventRef(eventId), data)
    if (card) batch.set(cardRef(eventId), card)
    await batch.commit()
    return true
  } catch (e) {
    console.error('Could not update event', e.code, e.message)
    return false
  }
}

// Small batches: every delete makes the rules look up the event once.
const DELETE_BATCH = 100

async function deleteAll(ref) {
  const snap = await getDocs(ref)
  for (let i = 0; i < snap.docs.length; i += DELETE_BATCH) {
    const batch = writeBatch(db)
    snap.docs.slice(i, i + DELETE_BATCH).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

/** Owner only: removes every guest, RSVP link and the public card, then the event itself. */
export async function deleteEvent(eventId) {
  try {
    await deleteAll(guestsRef(eventId))
    await deleteAll(rsvpsRef(eventId))
    await deleteDoc(cardRef(eventId))
    await deleteDoc(eventRef(eventId))
    return true
  } catch (e) {
    console.error('Could not delete event', e.code, e.message)
    return false
  }
}

// ---------------------------------------------------------------- helpers

export function normalEmail(email) {
  return String(email || '').trim().toLowerCase()
}

/** Owner asks someone to help, by email. Resolves to { ok } or { error }. */
export async function inviteHelper(event, email, role) {
  const address = normalEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return { error: 'That email address does not look right.' }
  if (Object.values(event.members).some((m) => m.email === address)) {
    return { error: 'This person already has access.' }
  }
  try {
    await updateDoc(
      eventRef(event.id),
      'invitedEmails',
      arrayUnion(address),
      new FieldPath('inviteRoles', address),
      role,
      'updatedAt',
      Date.now()
    )
    return { ok: true }
  } catch (e) {
    console.error('Could not invite helper', e.code, e.message)
    return { error: 'Could not save. Check your internet connection.' }
  }
}

export async function cancelInvite(event, email) {
  try {
    await updateDoc(
      eventRef(event.id),
      'invitedEmails',
      arrayRemove(email),
      new FieldPath('inviteRoles', email),
      deleteField(),
      'updatedAt',
      Date.now()
    )
    return true
  } catch (e) {
    console.error('Could not cancel invite', e.code, e.message)
    return false
  }
}

export async function setHelperRole(event, uid, role) {
  try {
    await updateDoc(eventRef(event.id), new FieldPath('members', uid, 'role'), role, 'updatedAt', Date.now())
    return true
  } catch (e) {
    console.error('Could not change role', e.code, e.message)
    return false
  }
}

/** Owner removes a helper, or a helper leaves on their own. */
export async function removeHelper(event, uid) {
  try {
    await updateDoc(
      eventRef(event.id),
      'memberIds',
      arrayRemove(uid),
      new FieldPath('members', uid),
      deleteField()
    )
    return true
  } catch (e) {
    console.error('Could not remove helper', e.code, e.message)
    return false
  }
}

// ---------------------------------------------------------------- invited

/** Join an event this account's email was invited to. */
export async function acceptInvite(event, session) {
  const role = event.inviteRoles[session.email] === 'viewer' ? 'viewer' : 'editor'
  try {
    await updateDoc(
      eventRef(event.id),
      'memberIds',
      arrayUnion(session.uid),
      new FieldPath('members', session.uid),
      { role, name: session.name, email: session.email },
      'invitedEmails',
      arrayRemove(session.email),
      new FieldPath('inviteRoles', session.email),
      deleteField()
    )
    return true
  } catch (e) {
    console.error('Could not accept invite', e.code, e.message)
    return false
  }
}

export async function declineInvite(event, session) {
  try {
    await updateDoc(
      eventRef(event.id),
      'invitedEmails',
      arrayRemove(session.email),
      new FieldPath('inviteRoles', session.email),
      deleteField()
    )
    return true
  } catch (e) {
    console.error('Could not decline invite', e.code, e.message)
    return false
  }
}
