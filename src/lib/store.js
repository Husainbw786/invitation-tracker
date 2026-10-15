// Data layer for the app, backed by Cloud Firestore. Every family is one
// document in the `families` collection, shared across every device and
// live-synced.
//
// Every subscription is scoped to one side ('husain' | 'zainab'), so a side
// only ever fetches its own guest list. The Firestore rules enforce the same
// thing on the server.

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db, COLLECTION } from './firebase.js'

const families = collection(db, COLLECTION)

// The fields a family document may hold. Anything else is dropped on write,
// and `id` is the document id, never a field.
const FIELDS = [
  'side',
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
    side: d.side,
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
function pick(obj) {
  const out = {}
  for (const key of FIELDS) {
    if (key in obj) out[key] = obj[key]
  }
  return out
}

// ---------------------------------------------------------------- public API

/**
 * Watch one side's families. Calls fn(families) with the current list and
 * again on every change, including this device's own writes (instantly) and
 * other devices' writes (live). Returns an unsubscribe function.
 */
export function subscribe(side, fn) {
  if (!side) {
    fn([])
    return () => {}
  }
  // Sorted here rather than with orderBy, which would need a composite index.
  return onSnapshot(
    query(families, where('side', '==', side)),
    (snap) => fn(snap.docs.map(fromDoc).sort((a, b) => a.createdAt - b.createdAt)),
    (error) => console.error('Firestore load failed', error.code, error.message)
  )
}

export async function addFamily(data) {
  try {
    const ref = await addDoc(families, { ...pick(data), createdAt: Date.now() })
    return { ...data, id: ref.id }
  } catch (e) {
    console.error('Could not add family', e.code, e.message)
    alert('Could not save this family. Check your internet connection.')
    return null
  }
}

export async function updateFamily(id, patch) {
  try {
    // Fails with not-found if the family was deleted on another device,
    // instead of silently reporting success.
    await updateDoc(doc(families, id), pick(patch))
    return true
  } catch (e) {
    console.error('Could not update family', e.code, e.message)
    alert(
      e.code === 'not-found'
        ? 'This family was deleted on another device.'
        : 'Could not save that change. Check your internet connection.'
    )
    return false
  }
}

export async function deleteFamily(id) {
  try {
    await deleteDoc(doc(families, id))
    return true
  } catch (e) {
    console.error('Could not delete family', e.code, e.message)
    alert('Could not delete that family. Check your internet connection.')
    return false
  }
}

// ---------------------------------------------------------------- counting

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

export const CARD_STATUSES = ['pending', 'written', 'delivered']

export const CARD_STATUS_LABELS = {
  pending: 'Pending',
  written: 'Card Written',
  delivered: 'Delivered',
}
