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
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to read session', e)
  }
  return null
}
