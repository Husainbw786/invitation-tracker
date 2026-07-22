import { useState } from 'react'
import { Heart } from '@phosphor-icons/react'
import { login } from '../lib/auth.js'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const session = await login(email, password)
    setBusy(false)
    if (!session) {
      setError('Email or password is wrong. Please try again.')
      return
    }
    onLogin(session)
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="login-photo">
          <img src="/couple-sticker.jpeg" alt="Husain & Zainab" />
        </span>
        <h1 className="login-title">
          Husain
          <Heart className="brand-heart i" size={26} weight="fill" />
          Zainab
        </h1>
        <p className="login-sub">Wedding invitation manager</p>

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

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary login-btn" disabled={busy}>
          {busy ? 'Logging in...' : 'Login'}
        </button>

        <p className="login-hint">
          Husain's side and Zainab's side each have their own login. Every side sees
          only its own invitation list.
        </p>
      </form>
    </div>
  )
}
