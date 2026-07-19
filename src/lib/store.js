// Data layer for the app. Same API in both modes (components never change):
//  - Firebase mode: Firestore `families` collection with realtime sync,
//    so every phone sees updates instantly.
//  - Local mode: localStorage on this device only.

import { app, firebaseEnabled } from './firebase.js'

const STORAGE_KEY = 'wedding-invites:families:v2'

let families = []
let listeners = []
let fs = null // firestore module + db, loaded lazily in firebase mode
let started = false

function notify() {
  listeners.forEach((fn) => fn(families))
}

async function start() {
  if (started) return
  started = true
  if (firebaseEnabled) {
    const firestore = await import('firebase/firestore')
    const db = firestore.getFirestore(app)
    fs = { ...firestore, db }
    firestore.onSnapshot(
      firestore.query(firestore.collection(db, 'families'), firestore.orderBy('createdAt')),
      (snap) => {
        families = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        notify()
      },
      (err) => console.error('Firestore sync error', err)
    )
  } else {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      families = raw ? JSON.parse(raw) : []
    } catch (e) {
      console.error('Failed to load saved data', e)
      families = []
    }
    notify()
  }
}

function persistLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(families))
  notify()
}

export function subscribe(fn) {
  listeners.push(fn)
  fn(families)
  start()
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export async function addFamily(data) {
  const family = { ...data, createdAt: Date.now() }
  if (firebaseEnabled && fs) {
    await fs.addDoc(fs.collection(fs.db, 'families'), family)
    return family
  }
  family.id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  families = [...families, family]
  persistLocal()
  return family
}

export async function updateFamily(id, patch) {
  if (firebaseEnabled && fs) {
    await fs.updateDoc(fs.doc(fs.db, 'families', id), patch)
    return
  }
  families = families.map((f) => (f.id === id ? { ...f, ...patch } : f))
  persistLocal()
}

export async function deleteFamily(id) {
  if (firebaseEnabled && fs) {
    await fs.deleteDoc(fs.doc(fs.db, 'families', id))
    return
  }
  families = families.filter((f) => f.id !== id)
  persistLocal()
}

// How many people a family counts for: listed members, else the manual
// count, else at least the head of the family (1).
export function effectiveCount(family) {
  if (family.members && family.members.length > 0) return family.members.length
  if (family.memberCount && family.memberCount > 0) return family.memberCount
  return 1
}

export const CARD_STATUSES = ['pending', 'written', 'delivered']

export const CARD_STATUS_LABELS = {
  pending: 'Pending',
  written: 'Card Written',
  delivered: 'Delivered',
}
