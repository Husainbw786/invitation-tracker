// One-time move of the original wedding lists into events.
//
// Before events existed, the app held one wedding with two sides. Every
// family was a document in the top-level `families` collection with a `side`
// field, and two fixed accounts each saw their own side. On sign-in, each of
// those two accounts gets its side copied into its own event:
//
//   families (side == 'husain')  ->  events/legacy-husain/guests/{same id}
//   families (side == 'zainab')  ->  events/legacy-zainab/guests/{same id}
//
// The event id and the guest ids are fixed, so running this twice (two
// phones at once, or a copy cut short by a lost connection) just writes the
// same documents again. The old `families` documents are never changed or
// deleted: they stay as a backup until the legacy rule in firestore.rules is
// removed.

import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { eventRef } from './events.js'
import { defaultSettings } from './eventTypes.js'
import { pickGuest } from './store.js'

// Must match legacySide() in firestore.rules.
const LEGACY = {
  'husainhackerrank@gmail.com': { side: 'husain', subtitle: "Husain's Family" },
  'zmalik1418@gmail.com': { side: 'zainab', subtitle: "Zainab's Family" },
}

// Every guest write makes the rules look up the event once; keep batches small.
const BATCH = 100

/**
 * Resolves to { eventId, count } when a list was copied just now, to
 * { eventId } when it had been copied before, and to null for every other
 * account (or when the copy failed; it is tried again on the next sign-in).
 */
export async function migrateLegacyList(session) {
  const legacy = LEGACY[session?.email]
  if (!legacy) return null
  const eventId = `legacy-${legacy.side}`
  const ref = eventRef(eventId)
  try {
    const existing = await getDoc(ref)
    if (existing.exists() && existing.data().migratedAt) return { eventId }

    const old = await getDocs(query(collection(db, 'families'), where('side', '==', legacy.side)))

    if (!existing.exists()) {
      const now = Date.now()
      await setDoc(ref, {
        name: 'Husain & Zainab',
        subtitle: legacy.subtitle,
        type: 'wedding',
        date: '',
        venue: '',
        art: '',
        ownerId: session.uid,
        memberIds: [session.uid],
        members: { [session.uid]: { role: 'owner', name: session.name, email: session.email } },
        invitedEmails: [],
        inviteRoles: {},
        // Same wording as before; their own tags come from their families.
        settings: { ...defaultSettings('wedding'), tagPresets: [] },
        migratedFrom: `families:${legacy.side}`,
        createdAt: now,
        updatedAt: now,
      })
    }

    for (let i = 0; i < old.docs.length; i += BATCH) {
      const batch = writeBatch(db)
      for (const snap of old.docs.slice(i, i + BATCH)) {
        const d = snap.data()
        batch.set(doc(ref, 'guests', snap.id), {
          ...pickGuest(d),
          // Keep the original order of the list.
          createdAt: Number(d.createdAt) || 0,
        })
      }
      await batch.commit()
    }

    await updateDoc(ref, { migratedAt: Date.now(), migratedCount: old.size })
    return { eventId, count: old.size }
  } catch (e) {
    console.error('Could not move the old list', e.code, e.message)
    return null
  }
}
