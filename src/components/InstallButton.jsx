import { useEffect, useState } from 'react'
import { DownloadSimple } from '@phosphor-icons/react'
import { installMode, onInstallChange, promptInstall } from '../lib/install.js'

// Shows an "Install App" button only when the app can actually be installed
// and isn't already running as an installed app.
export default function InstallButton({ className, labelClassName }) {
  const [mode, setMode] = useState(installMode)

  useEffect(() => onInstallChange(() => setMode(installMode())), [])

  if (!mode) return null

  function handleClick() {
    if (mode === 'prompt') {
      promptInstall()
    } else {
      alert(
        'To install on iPhone:\n\n' +
          '1. Open this site in Safari\n' +
          '2. Tap the Share button (square with an arrow)\n' +
          '3. Tap "Add to Home Screen", then "Add"'
      )
    }
  }

  return (
    <button type="button" className={className} onClick={handleClick} title="Install as an app">
      <DownloadSimple size={16} weight="bold" />
      <span className={labelClassName}>Install App</span>
    </button>
  )
}
