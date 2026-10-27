// A contact shared into the installed app from the phone's Contacts app
// (Share -> "Invitations"). The manifest's share_target posts the shared
// vCard file(s) to the service worker, which keeps them in the cache and sends
// the app to "/?shared-contact=1". This reads them back, once.

import { contactFromText, parseVCards } from './vcard.js'

// Must match sw.js.
const CACHE = 'invites-v1'
const SHARE_KEY = '/__shared-contact'

/** The shared payload as a family draft: the first person is the head of the
 *  family (name + numbers), anyone else becomes a member. */
export function contactFromShare({ files = [], title = '', text = '' } = {}) {
  let people = files.flatMap((f) => parseVCards(f))
  if (!people.length) {
    const fromText = contactFromText(title, text)
    if (fromText.name || fromText.phones.length) people = [fromText]
  }
  if (!people.length) return null
  const [head, ...rest] = people
  return {
    name: head.name,
    phones: head.phones,
    members: [...new Set(rest.map((p) => p.name).filter(Boolean))],
  }
}

/**
 * On a page opened by the share target, take the shared contact (and clear
 * it, so a reload doesn't bring it back). Resolves to null everywhere else.
 */
export async function takeSharedContact() {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  if (url.searchParams.get('shared-contact') !== '1') return null
  url.searchParams.delete('shared-contact')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  if (!('caches' in window)) return null
  try {
    const cache = await caches.open(CACHE)
    const stored = await cache.match(SHARE_KEY)
    if (!stored) return null
    await cache.delete(SHARE_KEY)
    return contactFromShare(await stored.json())
  } catch (e) {
    console.error('Could not read the shared contact', e)
    return null
  }
}
