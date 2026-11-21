// Guests of one event, backed by Cloud Firestore: every guest (a family, or
// a single guest, depending on the event) is one document in
// `events/{eventId}/guests`, shared across every device and live-synced.
// Who may read or change them is decided by the event's members, in
// firestore.rules.

import { addDoc, doc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { guestsRef, rsvpsRef } from './events.js'

// The fields a guest document may hold. Anything else is dropped on write,
// and `id` is the document id, never a field.
export const GUEST_FIELDS = [
  'name',
  'city',
  'phone',
  'members',
  'memberTags',
  'tagCounts',
  'tags',
  'maleCount',
  'femaleCount',
  'childCount',
  'memberCount',
  'gift',
  'cardStatus',
  'notes',
]

function fromDoc(snap) {
  const d = snap.data()
  return {
    id: snap.id,
    name: d.name || '',
    city: d.city || '',
    phone: d.phone || '',
    members: d.members || [],
    memberTags: d.memberTags || {},
    tagCounts: d.tagCounts || {},
    tags: d.tags || [],
    maleCount: d.maleCount ?? null,
    femaleCount: d.femaleCount ?? null,
    childCount: d.childCount ?? null,
    memberCount: d.memberCount ?? null,
    gift: Boolean(d.gift),
    cardStatus: d.cardStatus || 'pending',
    notes: d.notes || '',
    createdAt: Number(d.createdAt) || 0,
  }
}

// Only copies keys that are present, so partial updates stay partial.
export function pickGuest(obj) {
  const out = {}
  for (const key of GUEST_FIELDS) {
    if (key in obj) out[key] = obj[key]
  }
  return out
}

// ---------------------------------------------------------------- public API

/**
 * Watch one event's guests. Calls fn(guests) with the current list and again
 * on every change, including this device's own writes (instantly) and other
 * devices' writes (live). Returns an unsubscribe function.
 */
export function subscribe(eventId, fn) {
  if (!eventId) {
    fn([])
    return () => {}
  }
  // Sorted here rather than with orderBy, which would need an index.
  return onSnapshot(
    guestsRef(eventId),
    (snap) => fn(snap.docs.map(fromDoc).sort((a, b) => a.createdAt - b.createdAt)),
    (error) => console.error('Firestore load failed', error.code, error.message)
  )
}

export async function addGuest(eventId, data) {
  try {
    const ref = await addDoc(guestsRef(eventId), { ...pickGuest(data), createdAt: Date.now() })
    return { ...data, id: ref.id }
  } catch (e) {
    console.error('Could not add guest', e.code, e.message)
    alert('Could not save. Check your internet connection.')
    return null
  }
}

export async function updateGuest(eventId, id, patch) {
  try {
    // Fails with not-found if the guest was deleted on another device,
    // instead of silently reporting success.
    await updateDoc(doc(guestsRef(eventId), id), pickGuest(patch))
    return true
  } catch (e) {
    console.error('Could not update guest', e.code, e.message)
    alert(
      e.code === 'not-found'
        ? 'This was deleted on another device.'
        : e.code === 'permission-denied'
          ? 'You can only look at this list, not change it.'
          : 'Could not save that change. Check your internet connection.'
    )
    return false
  }
}

/** Deletes a guest and any RSVP links made for them (`rsvpTokens`). */
export async function deleteGuest(eventId, id, rsvpTokens = []) {
  try {
    const batch = writeBatch(db)
    batch.delete(doc(guestsRef(eventId), id))
    for (const token of rsvpTokens) batch.delete(doc(rsvpsRef(eventId), token))
    await batch.commit()
    return true
  } catch (e) {
    console.error('Could not delete guest', e.code, e.message)
    alert('Could not delete that. Check your internet connection.')
    return false
  }
}

// ---------------------------------------------------------------- counting

// City filter value for rows saved without a city.
export const NO_CITY = '(no city)'


// Men / women / children split for a family.
// Families saved before this feature existed only had a single `memberCount`,
// so that value is reported as an untyped total instead of being lost.
export function countBreakdown(family) {
  const male = Number(family.maleCount) || 0
  const female = Number(family.femaleCount) || 0
  const child = Number(family.childCount) || 0
  const total = male + female + child
  if (total === 0 && Number(family.memberCount) > 0) {
    return { male: 0, female: 0, child: 0, total: Number(family.memberCount), untyped: true }
  }
  return { male, female, child, total, untyped: false }
}

// How many people a family counts for: listed member names, else the
// men/women/children split, else at least the head of the family (1).
export function effectiveCount(family) {
  if (family.members && family.members.length > 0) return family.members.length
  const { total } = countBreakdown(family)
  if (total > 0) return total
  return 1
}

// How many of a family's guests are attending a specific tag/function
// (e.g. "mehndi", "mamera"). Defaults to "everyone" until told otherwise:
//  - named members: a member with no explicit tag list is assumed to attend
//    every one of the family's tags; assigning tags to them overrides that.
//  - count-mode families: an unset tagCounts[tag] falls back to the full
//    family headcount; an explicit number (including 0) overrides it.
export function tagAttendance(family, tag) {
  if (!(family.tags || []).includes(tag)) return 0
  if (family.members && family.members.length > 0) {
    const mt = family.memberTags || {}
    return family.members.filter((m) => {
      const explicit = mt[m]
      if (explicit === undefined) return true
      return explicit.includes(tag)
    }).length
  }
  const tc = family.tagCounts || {}
  if (Object.prototype.hasOwnProperty.call(tc, tag)) return Number(tc[tag]) || 0
  return effectiveCount(family)
}
