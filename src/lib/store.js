// Data layer for the app. The same API works in both modes, so no component
// needs to know which one is active:
//   - Cloud mode (Firestore): live sync across every device, offline-capable.
//   - Local mode (localStorage): this device only.
//
// Each subscription is scoped to one side ('husain' | 'zainab'), so a side
// only ever downloads its own guest list.

import { app, firebaseEnabled } from './firebase.js'

const STORAGE_KEY = 'wedding-invites:families:v2'
const COLLECTION = 'families'

let fs = null // { ...firestoreModule, db } once loaded in cloud mode
let fsReady = null // promise, so concurrent writers await the same init

// ---------------------------------------------------------------- cloud mode

async function initFirestore() {
  if (fs) return fs
  if (!fsReady) {
    fsReady = (async () => {
      const m = await import('firebase/firestore')
      let db
      try {
        // Offline cache: relatives can keep adding families with no signal,
        // and writes flush once they reconnect.
        db = m.initializeFirestore(app, {
          localCache: m.persistentLocalCache({
            tabManager: m.persistentMultipleTabManager(),
          }),
        })
      } catch (e) {
        // Already initialized, or the browser blocks persistence.
        console.warn('Firestore persistent cache unavailable, using memory cache', e)
        db = m.getFirestore(app)
      }
      fs = { ...m, db }
      return fs
    })()
  }
  return fsReady
}

// ---------------------------------------------------------------- local mode

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Failed to load saved data', e)
    return []
  }
}

function saveLocal(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  localListeners.forEach((l) => l.fn(sortByCreated(all.filter((f) => f.side === l.side))))
}

let localListeners = []

// ---------------------------------------------------------------- shared

function sortByCreated(list) {
  return [...list].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
}

/**
 * Watch one side's families. Calls fn(families) immediately and on every
 * change. Returns an unsubscribe function.
 */
export function subscribe(side, fn) {
  if (!side) {
    fn([])
    return () => {}
  }

  if (firebaseEnabled) {
    let stop = null
    let cancelled = false
    initFirestore().then((f) => {
      if (cancelled) return
      // Single equality filter needs no composite index; sorting is done in JS.
      const q = f.query(f.collection(f.db, COLLECTION), f.where('side', '==', side))
      stop = f.onSnapshot(
        q,
        (snap) => fn(sortByCreated(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
        (err) => console.error('Firestore sync error', err)
      )
    })
    return () => {
      cancelled = true
      if (stop) stop()
    }
  }

  const listener = { side, fn }
  localListeners.push(listener)
  fn(sortByCreated(loadLocal().filter((f) => f.side === side)))
  return () => {
    localListeners = localListeners.filter((l) => l !== listener)
  }
}

export async function addFamily(data) {
  const family = { ...data, createdAt: Date.now() }
  if (firebaseEnabled) {
    const f = await initFirestore()
    await f.addDoc(f.collection(f.db, COLLECTION), family)
    return family
  }
  family.id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  saveLocal([...loadLocal(), family])
  return family
}

export async function updateFamily(id, patch) {
  if (firebaseEnabled) {
    const f = await initFirestore()
    await f.updateDoc(f.doc(f.db, COLLECTION, id), patch)
    return
  }
  saveLocal(loadLocal().map((f) => (f.id === id ? { ...f, ...patch } : f)))
}

export async function deleteFamily(id) {
  if (firebaseEnabled) {
    const f = await initFirestore()
    await f.deleteDoc(f.doc(f.db, COLLECTION, id))
    return
  }
  saveLocal(loadLocal().filter((f) => f.id !== id))
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
