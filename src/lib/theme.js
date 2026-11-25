// Light or dark look. 'auto' follows the phone's setting; 'light' and 'dark'
// are saved on this device and set data-theme on <html>, which styles.css
// reads. index.html applies a saved choice before the page is drawn, so
// there is no flash of the wrong colours.

import { useEffect, useState } from 'react'

const KEY = 'invitations:theme'
export const THEMES = ['auto', 'light', 'dark']

// The browser bar colour for each look (same as --bg in styles.css).
const BAR = { light: '#eeebe7', dark: '#292625' }

const listeners = new Set()

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    return THEMES.includes(saved) ? saved : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  // index.html has one theme-color per phone setting; a fixed choice wins
  // over both, and Auto puts each back.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.dataset.auto ??= meta.content
    meta.content = BAR[theme] || meta.dataset.auto
  }
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // private mode: the choice lasts until the page is closed
  }
  applyTheme(theme)
  for (const fn of listeners) fn(theme)
}

/** The current choice, kept in step across every component that shows it. */
export function useTheme() {
  const [theme, setState] = useState(getTheme)
  useEffect(() => {
    listeners.add(setState)
    return () => listeners.delete(setState)
  }, [])
  return [theme, setTheme]
}
