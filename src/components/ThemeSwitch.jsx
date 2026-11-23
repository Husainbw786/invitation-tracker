import { CircleHalf, Moon, Sun } from '@phosphor-icons/react'
import { useTheme } from '../lib/theme.js'

const OPTIONS = [
  ['auto', 'Auto', CircleHalf],
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
]

/** Auto / Light / Dark. The choice is saved on this device. */
export default function ThemeSwitch({ className = '' }) {
  const [theme, setTheme] = useTheme()
  return (
    <div className={`segmented theme-switch ${className}`} role="radiogroup" aria-label="Appearance">
      {OPTIONS.map(([id, label, Icon]) => (
        <button
          type="button"
          key={id}
          role="radio"
          aria-checked={theme === id}
          className={theme === id ? 'segment active' : 'segment'}
          onClick={() => setTheme(id)}
        >
          <Icon size={16} weight={theme === id ? 'fill' : 'regular'} />
          {label}
        </button>
      ))}
    </div>
  )
}
