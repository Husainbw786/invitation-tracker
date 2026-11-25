import { useRef, useState } from 'react'
import { CheckCircle, ChatCircleText, EnvelopeSimple, ShieldCheck, UsersThree, Warning, X } from '@phosphor-icons/react'
import { resetPassword, signIn, signInWithGoogle, signUp } from '../lib/auth.js'
import InstallButton from './InstallButton.jsx'
import Logo from './Logo.jsx'
import EventPreview from './EventPreview.jsx'
import '../coral-landing.css'

const COPY = {
  signin: { title: 'Welcome back', sub: 'Sign in to see your guest lists.', button: 'Sign in' },
  signup: { title: 'Create your account', sub: 'Free. Takes a few seconds.', button: 'Create account' },
  reset: { title: 'Reset password', sub: 'We will email you a link to choose a new one.', button: 'Send reset link' },
}

const FEATURES = [
  [EnvelopeSimple, 'Invitation delivery', 'Track each card from the first draft to delivery. Filter by city when it’s time to head out.'],
  [ChatCircleText, 'Guest replies', 'Share private RSVP links on WhatsApp. See who is coming and how many places to set.'],
  [UsersThree, 'Shared planning', 'Invite family members to edit or view the list. Everyone sees the latest headcount.'],
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

// Auth state stays mounted when the dialog is closed.
export default function AuthScreen({ onSession }) {
  const [mode, setMode] = useState('signin') // signin | signup | reset
  const dialog = useRef(null)
  const pressedOnBackdrop = useRef(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const copy = COPY[mode]

  function switchTo(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

  function open(next) {
    switchTo(next)
    dialog.current?.showModal()
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
    <div className="landing coral-landing">
      <header className="pitch-top">
        <div className="pitch-inner pitch-masthead">
          <div className="brand-row">
            <Logo className="brand-mark" />
            <span className="brand-name">Invitations</span>
          </div>
          <nav className="mast-links" aria-label="Product">
            <a href="#event-preview">Product tour</a>
            <a href="#features-heading">Features</a>
          </nav>
          <button type="button" className="btn pitch-signin" onClick={() => open('signin')}>Sign in</button>
        </div>
      </header>

      <main className="pitch">
        <EventPreview>
          <div className="pitch-intro">
            <h1 className="pitch-title">You’re invited.<br />Who’s coming?</h1>
            <p className="pitch-lead">From the first invitation to the final headcount, keep every guest and reply on one shared list.</p>
            <div className="pitch-ctas">
              <button type="button" className="btn cap-button" onClick={() => open('signup')}>
                Create an account
              </button>
              <a className="btn tour-link" href="#event-preview">Try the guest list</a>
            </div>
          </div>
        </EventPreview>

        <section className="pitch-features" aria-labelledby="features-heading">
          <div className="pitch-inner pitch-section">
            <h2 id="features-heading" className="pitch-h2">How it works</h2>
            <dl className="features">
              {FEATURES.map(([Icon, title, text]) => (
                <div key={title} className="feature">
                  <dt><Icon size={24} weight="duotone" aria-hidden="true" />{title}</dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

      </main>

      <footer className="pitch-inner pitch-foot">
        <p><ShieldCheck size={18} aria-hidden="true" /> <span>Your lists are private. Only you and the people you add can see them. <a href="/privacy.html">Privacy policy</a></span></p>
      </footer>

      <dialog
        ref={dialog}
        className="auth-panel"
        aria-labelledby="auth-title"
        onPointerDown={(e) => (pressedOnBackdrop.current = e.target === e.currentTarget)}
        onClick={(e) => {
          if (pressedOnBackdrop.current && e.target === e.currentTarget) dialog.current.close()
          pressedOnBackdrop.current = false
        }}
      >
        <form className="auth-card" onSubmit={submit} noValidate>
          <button type="button" className="close-btn sheet-close" onClick={() => dialog.current.close()} aria-label="Close">
            <X />
          </button>
          <h2 id="auth-title" className="auth-title">{copy.title}</h2>
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

          <button type="submit" className="btn btn-primary btn-block" disabled={busy} aria-busy={busy}>
            {busy ? 'Please wait...' : copy.button}
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
      </dialog>
    </div>
  )
}
