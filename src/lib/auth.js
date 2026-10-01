// Simple login for the two sides of the wedding.
// Each account belongs to a side (husain / zainab) and only sees
// that side's families. Add or change accounts right here.

const SESSION_KEY = 'wedding-invites:session'

export const ACCOUNTS = [
  {
    email: 'husainhackerrank@gmail.com',
    password: 'qwerty',
    side: 'husain',
    label: "Husain's Family",
  },
  {
    email: 'zmalik1418@gmail.com',
    password: 'qwerty',
    side: 'zainab',
    label: "Zainab's Family",
  },
]

export function login(email, password) {
  const account = ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
  )
  if (!account) return null
  const session = { email: account.email, side: account.side, label: account.label }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (e) {
    // Private browsing / storage full: still log in, just not remembered.
    console.error('Failed to save session', e)
  }
  return session
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (e) {
    console.error('Failed to clear session', e)
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      // Only trust a saved session that still matches a current account, so
      // removing or changing an account also logs that browser out.
      const saved = JSON.parse(raw)
      const account = ACCOUNTS.find((a) => a.email === saved?.email)
      if (account) return { email: account.email, side: account.side, label: account.label }
      localStorage.removeItem(SESSION_KEY)
    }
  } catch (e) {
    console.error('Failed to read session', e)
  }
  return null
}
