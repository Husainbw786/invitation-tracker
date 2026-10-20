import { useState } from 'react'
import { login } from '../lib/auth.js'
import InstallButton from './InstallButton.jsx'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { session, error } = await login(email, password)
    setBusy(false)
    if (error) {
      setError(error)
      return
    }
    onLogin(session)
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-photos">
          <figure className="polaroid polaroid-left">
            <img src="/couple-painting.jpeg" alt="Painted portrait of Husain and Zainab" />
            <figcaption>Husain + Zainab</figcaption>
            <span className="tape" aria-hidden="true" />
          </figure>
          <figure className="polaroid polaroid-right">
            <img src="/couple-art2.jpeg" alt="Watercolour of Husain and Zainab" />
            <figcaption>our story</figcaption>
            <span className="tape tape-pink" aria-hidden="true" />
          </figure>
        </div>

        <h1 className="login-title">
          <span>Husain</span>
          <span className="amp">&amp;</span>
          <span>Zainab</span>
        </h1>
        <p className="login-sub">our wedding guest book</p>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoFocus
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary login-btn" disabled={busy}>
          {busy ? 'Logging in...' : 'Login'}
        </button>

        <InstallButton className="btn btn-dashed login-install" />

        <p className="login-hint">
          Husain's side and Zainab's side each have their own login, and each sees only its
          own list.
        </p>
      </form>
    </div>
  )
}
