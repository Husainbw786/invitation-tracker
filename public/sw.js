// Service worker: makes the app installable and lets it open instantly (and
// without internet) from the home screen.
//
// Only this site's own files are cached. Firebase requests go to Google's
// servers and are never touched here, so the guest list is always live.

const CACHE = 'invites-v1'

// A contact shared into the app from the phone's Contacts app arrives here as
// a POST from the manifest's share_target. Keep the file(s) in the cache and
// send the app to its start page, which reads them (see src/lib/share.js).
const SHARE_PATH = '/share-contact'
const SHARE_KEY = '/__shared-contact'

async function receiveSharedContact(request) {
  try {
    const form = await request.formData()
    const files = []
    for (const file of form.getAll('contact')) {
      if (file && typeof file.text === 'function') files.push(await file.text())
    }
    const payload = {
      files,
      title: String(form.get('title') || ''),
      text: String(form.get('text') || ''),
      at: Date.now(),
    }
    const cache = await caches.open(CACHE)
    await cache.put(
      SHARE_KEY,
      new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })
    )
  } catch (e) {
    console.error('Could not read the shared contact', e)
  }
  return Response.redirect(new URL('/?shared-contact=1', self.location.origin).href, 303)
}

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method === 'POST' && url.origin === self.location.origin && url.pathname === SHARE_PATH) {
    event.respondWith(receiveSharedContact(request))
    return
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Pages: always try the network first so a new deploy shows up right away;
  // fall back to the cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }

  // Built assets have a content hash in their name, so a cached copy is
  // always correct. Other files (images, icons) are served from cache and
  // refreshed in the background.
  const fetchAndCache = () =>
    fetch(request).then((res) => {
      if (res.ok) {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy))
      }
      return res
    })

  event.respondWith(
    caches.match(request).then((cached) => {
      if (!cached) return fetchAndCache()
      if (!url.pathname.startsWith('/assets/')) fetchAndCache().catch(() => {})
      return cached
    })
  )
})
