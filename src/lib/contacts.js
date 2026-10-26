// Pick people from the phone's contacts, through the browser's Contact Picker
// API (`navigator.contacts`). On Android this opens the system contact
// picker: the browser first asks for the phone's "Contacts" permission (once),
// then shows the picker, and only the contacts the user ticks are handed to
// the app. The app never sees the rest of the address book, and nothing from
// the phone is uploaded until the family is saved.
//
// The picker reads the phone's shared contact store, the one every contacts
// app writes to (Google Contacts, Samsung Contacts, Mi Contacts, SIM and
// WhatsApp-synced contacts, ...), so it works whichever contacts app the
// phone uses.
//
// Available in Chrome, Samsung Internet and other Chromium browsers on
// Android, on HTTPS (or localhost). Not available in Firefox on Android, on
// desktop browsers, or on iPhone.

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

// Chrome hands back `name` and `tel` as arrays (a contact can have several
// numbers). Reduce that to one display name and a tidy, de-duplicated list of
// numbers, keeping each number formatted the way the phone stores it.
function normalize(contact) {
  const name = (contact.name || []).map((n) => String(n).trim()).find(Boolean) || ''
  const phones = []
  const seen = new Set()
  for (const raw of contact.tel || []) {
    const tel = String(raw).replace(/\s+/g, ' ').trim()
    const key = tel.replace(/[^\d+]/g, '') // "98200 11223" and "98200-11223" are one number
    if (!key || seen.has(key)) continue
    seen.add(key)
    phones.push(tel)
  }
  return { name, phones }
}

/**
 * Open the phone's contact picker. Must be called from a user tap (the
 * browser refuses otherwise).
 *
 * Resolves to `{ contacts }`, each `{ name, phones }`. `contacts` is empty when
 * the user closes the picker without choosing anyone, and also when they deny
 * the browser the contacts permission (the browser treats that as a cancel).
 *
 * Resolves to `{ contacts: [], error }` when the picker could not open:
 *  - 'unsupported': this browser has no contact picker
 *  - 'busy': a picker is already open
 *  - 'failed': anything else (the details are logged)
 */
export async function pickContacts({ multiple = false } = {}) {
  if (!canPickContacts()) return { contacts: [], error: 'unsupported' }
  try {
    const picked = await navigator.contacts.select(['name', 'tel'], { multiple })
    return { contacts: (picked || []).map(normalize) }
  } catch (e) {
    console.error('Contact picker failed', e?.name, e?.message)
    return { contacts: [], error: e?.name === 'InvalidStateError' ? 'busy' : 'failed' }
  }
}
