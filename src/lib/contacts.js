// Pick people from the phone's contacts, through the browser's Contact Picker
// API (`navigator.contacts`). On Android this opens a contact picker: the
// browser first asks for the phone's "Contacts" permission (once), then shows
// the picker, and only the contacts the user ticks are handed to the app. The
// app never sees the rest of the address book, and nothing from the phone is
// uploaded until the family is saved.
//
// Depending on the Android version, Chrome either shows its own picker sheet
// or opens the phone's contacts app and then shows a short confirmation sheet
// (name and number chips, then Done). Both read the phone's shared contact
// store, the one every contacts app writes to (Google Contacts, Samsung
// Contacts, Mi Contacts, SIM and WhatsApp-synced contacts, ...), so it works
// whichever contacts app the phone uses.
//
// Available in Chrome, Samsung Internet and other Chromium browsers on
// Android, on HTTPS (or localhost). Not available in Firefox on Android, on
// desktop browsers, or on iPhone.

import { phoneKey } from './vcard.js'

export function canPickContacts() {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof navigator.contacts?.select === 'function'
  )
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

// The API hands back `name` and `tel` as arrays of strings. Accept a bare
// string or a stray null too, so an unusual browser never breaks the form.
function asList(value) {
  if (value == null) return []
  if (Array.isArray(value)) return value
  if (typeof value[Symbol.iterator] === 'function' && typeof value !== 'string') return [...value]
  return [value]
}

function asText(value) {
  if (value == null) return ''
  if (typeof value === 'object') return asText(value.value ?? value.number ?? value.name ?? '')
  return String(value).replace(/\s+/g, ' ').trim()
}

// One display name and a tidy, de-duplicated list of numbers, each number
// kept formatted the way the phone stores it.
export function normalizeContact(contact) {
  const name = asList(contact?.name).map(asText).find(Boolean) || ''
  const phones = []
  const seen = new Set()
  for (const raw of asList(contact?.tel)) {
    const tel = asText(raw)
    const key = phoneKey(tel) // "+91 98200 11223" and "98200-11223" are one number
    if (!key || seen.has(key)) continue
    seen.add(key)
    phones.push(tel)
  }
  return { name, phones }
}

/**
 * Open the phone's contact picker. Must be called straight from a user tap
 * (the browser refuses otherwise).
 *
 * Resolves to `{ contacts }`, each `{ name, phones }`. `contacts` is empty when
 * the user closes the picker without choosing anyone, and also when they deny
 * the browser the contacts permission (the browser treats that as a cancel).
 *
 * Resolves to `{ contacts: [], error, detail }` when the pick failed:
 *  - 'unsupported': this browser has no contact picker
 *  - 'busy': a picker is already open
 *  - 'failed': anything else; `detail` carries the browser's own message
 */
export async function pickContacts({ multiple = false } = {}) {
  if (!canPickContacts()) return { contacts: [], error: 'unsupported', detail: '' }
  // Newer Chrome builds open the phone's own Contacts app for the pick, which
  // sends this page to the background, and Chrome then cancels the pick as
  // soon as that happens (its picker is torn down whenever the tab is
  // hidden). An empty answer after the page was hidden is that case, and the
  // form explains it and points to Share instead.
  let wentHidden = false
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') wentHidden = true
  }
  document.addEventListener('visibilitychange', onVisibility)
  let picked
  try {
    picked = await navigator.contacts.select(['name', 'tel'], { multiple })
  } catch (e) {
    console.error('Contact picker failed', e)
    const detail = e?.message ? `${e.name || 'Error'}: ${e.message}` : String(e)
    const busy = e?.name === 'InvalidStateError' && /in use|already/i.test(e?.message || '')
    return { contacts: [], error: busy ? 'busy' : 'failed', detail, wentHidden }
  } finally {
    document.removeEventListener('visibilitychange', onVisibility)
  }
  // Left in on purpose: with the phone plugged into chrome://inspect this
  // shows exactly what the picker handed over.
  console.info('Contact picker returned', picked)
  try {
    return { contacts: asList(picked).filter(Boolean).map(normalizeContact), wentHidden }
  } catch (e) {
    console.error('Could not read the picked contacts', e, picked)
    return {
      contacts: [],
      error: 'failed',
      detail: `Could not read the contact (${e?.message || e})`,
      wentHidden,
    }
  }
}
