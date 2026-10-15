// "Install app" support. Chrome (Android and desktop) fires
// `beforeinstallprompt` when the site can be installed; we keep that event so
// our own button can show the install dialog later. It can fire before React
// mounts, so the listener is set up as soon as this module loads.
//
// iPhone Safari has no install dialog: the app is added from the Share menu,
// so for iOS we only show instructions.

let deferredPrompt = null
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // keep Chrome's mini-bar away; our button does it
    deferredPrompt = e
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    notify()
  })
}

export function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iPhone home-screen app
  )
}

export function isIOS() {
  const ua = window.navigator.userAgent
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

/** 'prompt' (Chrome can install), 'ios' (show instructions) or null (hide). */
export function installMode() {
  if (isInstalled()) return null
  if (deferredPrompt) return 'prompt'
  if (isIOS()) return 'ios'
  return null
}

export async function promptInstall() {
  if (!deferredPrompt) return
  const e = deferredPrompt
  deferredPrompt = null // a prompt can only be shown once
  e.prompt()
  await e.userChoice
  notify()
}

export function onInstallChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
