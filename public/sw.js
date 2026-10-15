// Service worker: makes the app installable and lets it open instantly (and
// without internet) from the home screen.
//
// Only this site's own files are cached. Firebase requests go to Google's
// servers and are never touched here, so the guest list is always live.

const CACHE = 'invites-v1'

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
