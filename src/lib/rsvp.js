// RSVP: a guest (a family, or a single guest) gets a private link and answers
// without an account.
//
//   events/{eventId}/public/card
//     What the guest's page shows about the event: name, subtitle, type, date,
//     venue, art, hostName, and whether replies are open (rsvpOn, closesAt in
//     ms or null). Only the owner writes it, when saving Event settings.
//   events/{eventId}/rsvps/{token}
//     guestId, guestName, invited (most people who can come), functions (the
//     guest's tags, to pick from), createdAt, and response: null or
//     { status: 'yes' | 'no' | 'maybe', people, functions, note, at, by: 'guest' | 'host' }.
//
// The token in the link is the secret. Whoever holds the link can read that
// one document and the card, and set the response while replies are open.
// The guest list itself is never readable through a link (firestore.rules).

import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase.js'
import { cardRef, rsvpsRef } from './events.js'
import { effectiveCount } from './store.js'
import { endOfDay, formatDate } from './dates.js'

export const RSVP_LABELS = {
  yes: 'Coming',
  maybe: 'Maybe',
  no: 'Not coming',
  waiting: 'No reply yet',
  none: 'Link not sent',
}

// Most people one answer can bring, and the longest message (firestore.rules
// checks the same numbers).
export const MAX_PEOPLE = 500
export const MAX_NOTE = 500

// wa.me links need the country code. Numbers saved without one (most phone
// contacts in India) are taken as Indian numbers.
const DEFAULT_COUNTRY_CODE = '91'

const TOKEN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

// 24 random characters: about 140 bits, impossible to guess.
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => TOKEN_CHARS[b % TOKEN_CHARS.length]).join('')
}

function rsvpRef(eventId, token) {
  return doc(rsvpsRef(eventId), token)
}

export function rsvpLink(eventId, token) {
  return `${window.location.origin}/#/r/${encodeURIComponent(eventId)}/${token}`
}

/** The RSVP page's address parts from the current hash, or null. */
export function rsvpRouteFromHash() {
  const m = window.location.hash.match(/^#\/r\/([^/?#]+)\/([A-Za-z0-9]{20,64})/)
  return m ? { eventId: decodeURIComponent(m[1]), token: m[2] } : null
}

/** The public card for an event as it now stands (`rsvp` = settings.rsvp). */
export function cardFor(event, rsvp) {
  return {
    name: event.name,
    subtitle: event.subtitle || '',
    type: event.type || 'custom',
    date: event.date || '',
    venue: event.venue || '',
    art: event.art || '',
    hostName: event.members?.[event.ownerId]?.name || '',
    rsvpOn: Boolean(rsvp?.on),
    closesAt: endOfDay(rsvp?.closes),
    updatedAt: Date.now(),
  }
}

function fromDoc(snap) {
  const d = snap.data()
  const r = d.response
  return {
    token: snap.id,
    guestId: d.guestId || '',
    guestName: d.guestName || '',
    invited: Number(d.invited) || 1,
    functions: d.functions || [],
    createdAt: Number(d.createdAt) || 0,
    response: r
      ? {
          status: r.status,
          people: Number(r.people) || 0,
          functions: r.functions || [],
          note: r.note || '',
          at: r.at?.toMillis?.() || 0,
          by: r.by || 'guest',
        }
      : null,
    raw: r || null, // as stored, so a new link can carry it over unchanged
  }
}

/** 'none' (no link yet) | 'waiting' | 'yes' | 'maybe' | 'no' */
export function rsvpState(rsvp) {
  if (!rsvp) return 'none'
  return rsvp.response?.status || 'waiting'
}

/** Every token of a guest's links, for deleting them with the guest. */
export function rsvpTokens(rsvp) {
  return rsvp ? [rsvp.token, ...rsvp.older] : []
}

/**
 * Every RSVP of an event, live, as { guestId: rsvp }. If a guest somehow has
 * two links, the newest wins and the others are listed in `older`.
 */
export function subscribeRsvps(eventId, fn) {
  if (!eventId) {
    fn({})
    return () => {}
  }
  return onSnapshot(
    rsvpsRef(eventId),
    (snap) => {
      const byGuest = {}
      for (const r of snap.docs.map(fromDoc).sort((a, b) => b.createdAt - a.createdAt)) {
        if (byGuest[r.guestId]) byGuest[r.guestId].older.push(r.token)
        else byGuest[r.guestId] = { ...r, older: [] }
      }
      fn(byGuest)
    },
    (error) => console.error('Could not load RSVPs', error.code, error.message)
  )
}

function guestPart(guest) {
  return {
    guestId: guest.id,
    guestName: guest.name,
    invited: Math.min(effectiveCount(guest), MAX_PEOPLE),
    functions: (guest.tags || []).slice(0, 30),
  }
}

/**
 * The guest's link, making one when there is none. Returns at once (so the
 * same tap can open WhatsApp or copy the link) with `saved`, a promise of
 * true/false for when the new link reaches the database.
 */
export function linkFor(eventId, guest, rsvp) {
  if (rsvp) return { link: rsvpLink(eventId, rsvp.token), saved: Promise.resolve(true) }
  const token = newToken()
  const saved = setDoc(rsvpRef(eventId, token), { ...guestPart(guest), createdAt: Date.now(), response: null })
    .then(() => true)
    .catch((e) => {
      console.error('Could not save the RSVP link', e.code, e.message)
      return false
    })
  return { link: rsvpLink(eventId, token), saved }
}

/** A fresh link for a guest whose old one went to the wrong person. The answer is kept. */
export async function replaceLink(eventId, guest, rsvp) {
  try {
    const batch = writeBatch(db)
    batch.set(rsvpRef(eventId, newToken()), { ...guestPart(guest), createdAt: Date.now(), response: rsvp?.raw || null })
    for (const token of rsvpTokens(rsvp)) batch.delete(rsvpRef(eventId, token))
    await batch.commit()
    return true
  } catch (e) {
    console.error('Could not make a new RSVP link', e.code, e.message)
    return false
  }
}

/**
 * The host notes an answer given by phone or in person, or clears it
 * (status ''). Also brings the guest's name, headcount and functions up to
 * date on the link.
 */
export async function recordAnswer(eventId, guest, rsvp, status, people) {
  const part = guestPart(guest)
  const response = status
    ? {
        status,
        people: status === 'no' ? 0 : Math.max(0, Math.min(Math.floor(Number(people)) || 0, MAX_PEOPLE)),
        functions: status === 'no' ? [] : rsvp?.response?.functions?.length ? rsvp.response.functions : part.functions,
        note: rsvp?.response?.note || '',
        at: serverTimestamp(),
        by: 'host',
      }
    : null
  try {
    if (rsvp) await updateDoc(rsvpRef(eventId, rsvp.token), { ...part, response })
    else if (response) await setDoc(rsvpRef(eventId, newToken()), { ...part, createdAt: Date.now(), response })
    return true
  } catch (e) {
    console.error('Could not save the RSVP answer', e.code, e.message)
    return false
  }
}

/** After a guest is edited: keep the name, headcount and functions on their link in step. */
export async function syncRsvp(eventId, guest, rsvp) {
  if (!rsvp) return true
  const part = guestPart(guest)
  if (
    part.guestName === rsvp.guestName &&
    part.invited === rsvp.invited &&
    part.functions.join('\n') === rsvp.functions.join('\n')
  ) {
    return true
  }
  const { guestId: _same, ...changes } = part
  try {
    await updateDoc(rsvpRef(eventId, rsvp.token), changes)
    return true
  } catch (e) {
    console.error('Could not update the RSVP link', e.code, e.message)
    return false
  }
}

// ---------------------------------------------------------------- the guest's side

/** Resolves to { card, rsvp } or { error: 'not-found' | 'offline' }. Needs no account. */
export async function loadInvitation(eventId, token) {
  try {
    const [card, rsvp] = await Promise.all([getDoc(cardRef(eventId)), getDoc(rsvpRef(eventId, token))])
    if (!card.exists() || !rsvp.exists()) return { error: 'not-found' }
    return { card: card.data(), rsvp: fromDoc(rsvp) }
  } catch (e) {
    console.error('Could not load the invitation', e.code, e.message)
    return { error: e.code === 'permission-denied' ? 'not-found' : 'offline' }
  }
}

export function repliesOpen(card) {
  return Boolean(card?.rsvpOn) && (card.closesAt == null || Date.now() < card.closesAt)
}

/** The guest's answer. Resolves to { ok } or { error: 'closed' | 'offline' }. */
export async function sendAnswer(eventId, token, { status, people, functions, note }) {
  try {
    await updateDoc(rsvpRef(eventId, token), {
      response: {
        status,
        people: status === 'no' ? 0 : people,
        functions: status === 'no' ? [] : functions,
        note: note.trim().slice(0, MAX_NOTE),
        at: serverTimestamp(),
        by: 'guest',
      },
    })
    return { ok: true }
  } catch (e) {
    console.error('Could not send the answer', e.code, e.message)
    return { error: e.code === 'permission-denied' ? 'closed' : 'offline' }
  }
}

// ---------------------------------------------------------------- sending

/** A phone number as wa.me wants it: digits with the country code, or ''. */
export function whatsappNumber(phone) {
  const raw = String(phone || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (raw.startsWith('+')) return digits
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits
  if (digits.length === 11 && digits.startsWith('0')) return DEFAULT_COUNTRY_CODE + digits.slice(1)
  return digits
}

/** Opens WhatsApp with the message; without a number WhatsApp asks who to send it to. */
export function whatsappUrl(phone, text) {
  return `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`
}

/** The message that goes with a link. A reminder when the guest has the link but has not answered. */
export function inviteMessage(event, guestName, link, reminder) {
  const date = formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long' })
  const details = `${event.name}${date ? ` on ${date}` : ''}${event.venue ? ` at ${event.venue}` : ''}`
  return [
    `Hi ${guestName}!`,
    reminder ? `A gentle reminder about ${details}.` : `You are invited to ${details}.`,
    'Please let us know if you can come:',
    link,
  ].join('\n')
}

// ---------------------------------------------------------------- counting

/** Totals for the Overview: answers per kind, people coming, and people per function. */
export function rsvpSummary(guests, rsvps) {
  const s = { yes: 0, maybe: 0, no: 0, waiting: 0, none: 0, people: 0, maybePeople: 0, byFunction: {} }
  for (const g of guests) {
    const r = rsvps[g.id]
    const state = rsvpState(r)
    s[state] += 1
    if (state === 'yes') {
      s.people += r.response.people
      for (const f of r.response.functions) s.byFunction[f] = (s.byFunction[f] || 0) + r.response.people
    }
    if (state === 'maybe') s.maybePeople += r.response.people
  }
  return s
}
