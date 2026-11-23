import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Bundled fonts (the same pair as ai-tools-profit), so the app looks right offline.
import '@fontsource-variable/manrope'
import '@fontsource-variable/source-serif-4/opsz.css'
import './lib/install.js' // must listen for Chrome's install event early
import './styles.css'
import { applyTheme, getTheme } from './lib/theme.js'

// Also sets the browser bar colour for a saved Light or Dark choice.
applyTheme(getTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Register the service worker that makes the app installable. Skipped in dev
// so Vite's hot reload never fights a cache.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.error('Service worker failed', e))
  })
}
