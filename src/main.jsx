import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './lib/install.js' // must listen for Chrome's install event early
import './styles.css'

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
