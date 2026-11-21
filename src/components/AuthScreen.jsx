import { useState } from 'react'
import { ArrowRight, CheckCircle, EnvelopeSimple, Warning } from '@phosphor-icons/react'
import { resetPassword, signIn, signInWithGoogle, signUp } from '../lib/auth.js'
import InstallButton from './InstallButton.jsx'

const COPY = {
  signin: { title: 'Welcome back', sub: 'Sign in to see your guest lists.', button: 'Sign in' },
  signup: { title: 'Create your account', sub: 'Free. Takes a few seconds.', button: 'Create account' },
  reset: { title: 'Reset password', sub: 'We will email you a link to choose a new one.', button: 'Send reset link' },
}

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

// Sign in, create an account, or get a password reset link.
// `onSession` receives the session as soon as an account is ready (Firebase
// also reports it through watchSession; this one carries the name typed at
// sign-up, which the first auth event can miss).
export default function AuthScreen({ onSession }) {
  const [mode, setMode] = useState('signin') // signin | signup | reset
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
    <div className="auth-page">
      <div className="auth-wrap rise">
        <div className="auth-intro">
          <div className="brand-row">
            <span className="brand-mark" aria-hidden="true">
              <EnvelopeSimple weight="bold" />
            </span>
            <span className="brand-name">Invitations</span>
          </div>
          <p className="kicker">Guest lists</p>
          <h1 className="auth-hero">Every guest and every invitation, in one list.</h1>
          <p className="auth-lead">
            Weddings, birthdays, Eid, anything. Track who got their invitation, and share the list
            with family who help.
          </p>
        </div>

        <div className="auth-side">
          <form className="auth-card" onSubmit={submit} noValidate>
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
          </form>
          <InstallButton className="btn btn-small btn-ghost auth-install" />
        </div>
      </div>
    </div>
  )
}
