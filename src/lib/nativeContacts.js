// Picking guests through the Android app's own contacts screen
// (android/.../ContactsActivity.java), which reads the phone's contacts
// itself. Chrome's contact picker loses the pick on some phones, so the app
// uses this whenever it runs inside an Android build that has the screen.
//
// How the two talk:
//  - The Android app opens the site with ?app=android-contacts:<package>.
//    We remember that on this device and tidy it out of the address bar.
//  - The Contacts button navigates to an intent:// link, which opens the
//    contacts screen with the current page as the place to come back to.
//  - The screen opens the page again with the ticked people in the URL
//    fragment (#...contacts=<base64url JSON>). A fragment never reaches a
//    server; we read it once and remove it straight away.

import { phoneKey } from './vcard.js'

const KEY = 'invitations:nativeContacts'
const FLAG = 'android-contacts:'

function readFlag() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

/** Run once at start-up: note an Android build that has the contacts screen. */
export function rememberNativeApp() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const app = url.searchParams.get('app')
  if (!app) return
  if (app.startsWith(FLAG)) {
    try {
      localStorage.setItem(KEY, app.slice(FLAG.length))
    } catch {
      // private mode: the button falls back to the browser picker
    }
  }
  url.searchParams.delete('app')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}

/** True inside an Android app build that has the contacts screen. */
export function hasNativeContacts() {
  return /^[a-z][\w.]*$/i.test(readFlag())
}

/** Open the contacts screen. Must run from a tap. */
export function openNativeContacts() {
  const pkg = readFlag()
  const back = window.location.href.replace(/([?&])contacts=[^&]*/, '')
  window.location.href =
    `intent://contacts?return=${encodeURIComponent(back)}` +
    `#Intent;scheme=invitationsapp;package=${pkg};end`
}

function decode(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) =>
    c.charCodeAt(0)
  )
  return JSON.parse(new TextDecoder().decode(bytes))
}

/**
 * The people ticked on the contacts screen, taken out of the address (so a
 * reload or a copied link never carries them). Each is { name, phones }.
 * Returns null when the address has none.
 */
export function takeNativeContacts() {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  const m = hash.match(/[?&]contacts=([A-Za-z0-9_-]+)/)
  if (!m) return null
  const cleaned = hash.replace(/([?&])contacts=[A-Za-z0-9_-]+&?/, '$1').replace(/[?&]$/, '')
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + cleaned)
  try {
    const list = decode(m[1])
    if (!Array.isArray(list)) return null
    const people = []
    for (const item of list) {
      const name = String(item?.n || '').replace(/\s+/g, ' ').trim()
      const seen = new Set()
      const phones = []
      for (const raw of Array.isArray(item?.p) ? item.p : []) {
        const tel = String(raw || '').trim()
        const key = phoneKey(tel)
        if (!key || seen.has(key)) continue
        seen.add(key)
        phones.push(tel)
      }
      if (name || phones.length) people.push({ name, phones })
    }
    return people.length ? people : null
  } catch (e) {
    console.error('Could not read the picked contacts', e)
    return null
  }
}
