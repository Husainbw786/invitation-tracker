import { useEffect, useState } from 'react'
import {
  AddressBook,
  ArrowRight,
  ChartPieSlice,
  CheckCircle,
  Confetti,
  DeviceMobile,
  EnvelopeSimple,
  Printer,
  ShieldCheck,
  UsersThree,
  Warning,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react'
import { resetPassword, signIn, signInWithGoogle, signUp } from '../lib/auth.js'
import InstallButton from './InstallButton.jsx'
import EventIcon from './EventArt.jsx'
import Logo from './Logo.jsx'
import ThemeSwitch from './ThemeSwitch.jsx'

const COPY = {
  signin: { title: 'Welcome back', sub: 'Sign in to see your guest lists.', button: 'Sign in' },
  signup: { title: 'Create your account', sub: 'Free. Takes a few seconds.', button: 'Create account' },
  reset: { title: 'Reset password', sub: 'We will email you a link to choose a new one.', button: 'Send reset link' },
}

const FEATURES = [
  {
    icon: Confetti,
    title: 'Any event',
    text: 'Weddings, birthdays, Eid, aqiqah, housewarmings and more. Each event gets its own steps, words and functions.',
  },
  {
    icon: EnvelopeSimple,
    title: 'Track every invitation',
    text: 'Pending, card written, delivered: one tap moves a family to the next step. See who is left, and who gets a gift.',
  },
  {
    icon: WhatsappLogo,
    title: 'RSVP on WhatsApp',
    text: 'Send each family a private link. They answer in seconds with no app: coming or not, how many, which functions.',
  },
  {
    icon: UsersThree,
    title: 'Plan together',
    text: 'Add family as editors or viewers. Everyone sees the same list, live, on their own phone.',
  },
  {
    icon: ChartPieSlice,
    title: 'Headcount at a glance',
    text: 'Men, women and children, guests per city and per function. The number for the caterer is always ready.',
  },
  {
    icon: AddressBook,
    title: 'Straight from contacts',
    text: "Share a contact from your phone's Contacts app, or pick several at once on Android.",
  },
  {
    icon: Printer,
    title: 'Print and export',
    text: 'A checklist by city for delivering cards, and a CSV file for anything else.',
  },
  {
    icon: DeviceMobile,
    title: 'Made for your phone',
    text: 'Install it like an app. Works offline, follows dark mode, and it is free.',
  },
]

const STEPS = [
  ['Create an event', 'Pick the kind of event, give it a name and a date.'],
  ['Add your guests', 'Families or single guests, typed in or taken from contacts.'],
  ['Send invitations', 'Mark cards as delivered and send RSVP links on WhatsApp.'],
  ['Watch it come together', 'Answers and headcounts update live for everyone helping.'],
]

// Google's own four-colour "G", as its sign-in buttons show it.
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}

// A still picture of the app: an event's progress, its RSVPs and a few rows.
// Built from the app's own styles, so it always looks like the real thing.
function Preview() {
  const rows = [
    ['Shaikh Family', 'Mumbai · 4 guests', 'yes', 'Coming (4)', 'done', 'Delivered'],
    ['Khan Family', 'Pune · 3 guests', 'maybe', 'Maybe (2)', 'progress', 'Card written'],
    ['Mehta Family', 'Surat · 5 guests', 'waiting', 'No reply yet', 'pending', 'Pending'],
  ]
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-head">
        <EventIcon event={{ type: 'wedding' }} size="sm" />
        <span className="row-text">
          <span className="row-title">Sara &amp; Ayaan</span>
          <span className="row-meta">Wedding · Sun, 14 Feb</span>
        </span>
        <span className="hero-chip">85 days to go</span>
      </div>
      <div className="preview-stats">
        <div className="preview-stat">
          <span className="preview-label">Cards delivered</span>
          <span className="preview-num">
            18<span className="hero-of"> / 24</span>
          </span>
          <span className="progress">
            <span style={{ width: '75%' }} />
          </span>
        </div>
        <div className="preview-stat">
          <span className="preview-label">RSVP</span>
          <span className="preview-num">
            64<span className="preview-unit"> coming</span>
          </span>
          <span className="preview-functions">
            <span>mehndi 52</span>
            <span>nikah 64</span>
          </span>
        </div>
      </div>
      <ul className="rows">
        {rows.map(([name, meta, rsvp, rsvpText, tone, status]) => (
          <li key={name}>
            <div className="row">
              <span className="row-text">
                <span className="row-title">{name}</span>
                <span className="row-meta">
                  {meta}
                  <span className={`rsvp-tag rsvp-${rsvp}`}>{rsvpText}</span>
                </span>
              </span>
              <span className={`status status-${tone}`}>{status}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// The front page for anyone signed out: what the app does, and the sign-in
// form. Wide screens show both side by side; on a phone the page is the pitch
// and the form slides up from the bottom.
// `onSession` receives the session as soon as an account is ready (Firebase
// also reports it through watchSession; this one carries the name typed at
// sign-up, which the first auth event can miss).
export default function AuthScreen({ onSession }) {
  const [mode, setMode] = useState('signin') // signin | signup | reset
  const [sheetOpen, setSheetOpen] = useState(false) // phones only
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const copy = COPY[mode]

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e) => e.key === 'Escape' && setSheetOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  function switchTo(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

  function open(next) {
    switchTo(next)
    setSheetOpen(true)
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setInfo('')
    if (!email.trim()) return setError('Enter your email.')
    if (mode !== 'reset' && !password) return setError('Enter your password.')
    if (mode === 'signup' && !name.trim()) return setError('Enter your name, so helpers know who you are.')
    if (mode === 'signup' && password.length < 6) return setError('Choose a password of at least 6 characters.')
    setBusy(true)
    if (mode === 'reset') {
      const result = await resetPassword(email)
      setBusy(false)
      if (result.error) return setError(result.error)
      setInfo('If there is an account for this email, a link to choose a new password is on its way. Check your inbox (and spam).')
      return
    }
    const result = mode === 'signup' ? await signUp(name, email, password) : await signIn(email, password)
    setBusy(false)
    if (result.error) return setError(result.error)
    onSession(result.session)
  }

  async function google() {
    if (busy) return
    setError('')
    setBusy(true)
    const result = await signInWithGoogle()
    setBusy(false)
    if (result.error) return setError(result.error)
    if (result.session) onSession(result.session)
  }

  return (
    <div className="landing">
      <main className="pitch">
        <div className="pitch-inner">
          <header className="pitch-top">
            <div className="brand-row">
              <Logo className="brand-mark" />
              <span className="brand-name">Invitations</span>
            </div>
            <button type="button" className="btn btn-small btn-primary pitch-signin" onClick={() => open('signin')}>
              Sign in <ArrowRight size={14} weight="bold" />
            </button>
          </header>

          <section className="pitch-hero rise">
            <p className="kicker">Guest lists for every occasion</p>
            <h1 className="pitch-title">Every guest, every invitation, every RSVP. In one list.</h1>
            <p className="pitch-lead">
              Weddings, birthdays, Eid and more. Track who got their invitation, collect RSVPs on
              WhatsApp, and plan it with family, all from your phone.
            </p>
            <div className="pitch-ctas">
              <button type="button" className="btn btn-dark" onClick={() => open('signup')}>
                Get started free
              </button>
              <button type="button" className="btn" onClick={() => open('signin')}>
                I have an account
              </button>
            </div>
          </section>

          <Preview />

          <section className="pitch-section">
            <p className="kicker">What it does</p>
            <h2 className="pitch-h2">Everything the guest list needs</h2>
            <ul className="features">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="feature">
                  <span className="feature-icon" aria-hidden="true">
                    <Icon weight="duotone" />
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <span className="feature-text">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="pitch-section">
            <p className="kicker">How it works</p>
            <h2 className="pitch-h2">Ready in four steps</h2>
            <ol className="how">
              {STEPS.map(([title, text], i) => (
                <li key={title}>
                  <span className="how-num">{i + 1}</span>
                  <span>
                    <strong>{title}</strong>
                    <span className="feature-text">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="pitch-final">
            <h2 className="pitch-h2">Start your list today</h2>
            <p className="pitch-lead">Free, on any phone or computer. No app store needed.</p>
            <button type="button" className="btn btn-primary btn-block" onClick={() => open('signup')}>
              Create your free account <ArrowRight size={16} weight="bold" />
            </button>
          </section>

          <footer className="pitch-foot">
            <ShieldCheck size={16} weight="duotone" />
            <span>
              Your lists are private. Only you and the people you add can see them.{' '}
              <a href="/privacy.html">Privacy policy</a>
            </span>
          </footer>
          <ThemeSwitch className="pitch-theme" />
        </div>
      </main>

      {sheetOpen && <div className="auth-scrim" onClick={() => setSheetOpen(false)} />}

      <aside className={sheetOpen ? 'auth-panel open' : 'auth-panel'} aria-label="Sign in">
        <form className="auth-card" onSubmit={submit} noValidate>
          <button type="button" className="close-btn sheet-close" onClick={() => setSheetOpen(false)} aria-label="Close">
            <X />
          </button>
          <h2 className="auth-title">{copy.title}</h2>
          <p className="auth-sub">{copy.sub}</p>

          {mode !== 'reset' && (
            <>
              <button type="button" className="btn btn-block" onClick={google} disabled={busy}>
                <GoogleG />
                Continue with Google
              </button>
              <p className="divider">or</p>
            </>
          )}

          {mode === 'signup' && (
            <label className="field">
              <span>Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sara Khan"
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          {mode !== 'reset' && (
            <div className="field">
              <div className="label-row">
                <label htmlFor="auth-password">Password</label>
                {mode === 'signin' && (
                  <button type="button" className="link-btn" onClick={() => switchTo('reset')}>
                    Forgot?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </div>
          )}

          {error && (
            <p className="form-error" role="alert">
              <Warning size={16} weight="fill" /> {error}
            </p>
          )}
          {info && (
            <p className="field-note ok" role="status">
              <CheckCircle size={16} weight="fill" />
              <span>{info}</span>
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait...' : copy.button}
            {!busy && <ArrowRight size={16} weight="bold" />}
          </button>

          <p className="auth-switch">
            {mode === 'signin' ? (
              <>
                New here?{' '}
                <button type="button" className="link-btn" onClick={() => switchTo('signup')}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                {mode === 'signup' ? 'Already have an account? ' : ''}
                <button type="button" className="link-btn" onClick={() => switchTo('signin')}>
                  {mode === 'signup' ? 'Sign in' : 'Back to sign in'}
                </button>
              </>
            )}
          </p>
          <InstallButton className="btn btn-small btn-ghost auth-install" />
        </form>
      </aside>
    </div>
  )
}
