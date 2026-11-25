import { useState } from 'react'
import { SignOut, Trash, Warning } from '@phosphor-icons/react'
import Modal from './Modal.jsx'
import InstallButton from './InstallButton.jsx'
import { deleteMyAccount, deletionPlan } from '../lib/account.js'

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

// Deleting the account, in two steps: the button, then what will happen
// and a confirmation (the password, or Google for Google accounts).
function DeleteAccount({ session, events, invites, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const plan = deletionPlan(session, events, invites)

  async function run(e) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    const result = await deleteMyAccount(session, events, invites, password)
    setBusy(false)
    if (result.error) return setError(result.error)
    onDeleted()
  }

  if (!open) {
    return (
      <section className="settings-block danger-block">
        <h3 className="settings-title">Delete account</h3>
        <p className="field-hint">Deletes your account and the events you own, for good.</p>
        <button type="button" className="btn btn-small btn-danger" onClick={() => setOpen(true)}>
          <Trash size={14} /> Delete my account
        </button>
      </section>
    )
  }

  return (
    <form className="settings-block danger-block" onSubmit={run} noValidate>
      <h3 className="settings-title">Delete your account?</h3>
      <ul className="delete-list">
        <li>
          {plan.owned.length
            ? `${plural(plan.owned.length, 'event', 'events')} you own will be deleted for everyone, with every guest and RSVP.`
            : 'You do not own any events.'}
        </li>
        {plan.helping.length > 0 && <li>You will leave {plural(plan.helping.length, 'event', 'events')} you help with.</li>}
        <li>Your sign-in ({session.email}) is removed. This cannot be undone.</li>
      </ul>

      {!session.viaGoogle && (
        <label className="field">
          <span>Your password, to confirm</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
      )}

      {error && (
        <p className="form-error" role="alert">
          <Warning size={16} weight="fill" /> {error}
        </p>
      )}

      <div className="delete-actions">
        <button type="button" className="btn btn-small" onClick={() => setOpen(false)} disabled={busy}>
          Keep my account
        </button>
        <button type="submit" className="btn btn-small btn-danger" disabled={busy}>
          <Trash size={14} />
          {busy ? 'Deleting...' : session.viaGoogle ? 'Confirm with Google and delete' : 'Delete for good'}
        </button>
      </div>
    </form>
  )
}

// The account's own settings (not an event's): who is signed in, light or
// dark look, install, sign out, privacy, and deleting the account.
export default function SettingsSheet({ session, events, invites, onClose, onLogout }) {
  return (
    <Modal title="Settings" onClose={onClose}>
      <section className="settings-block">
        <h3 className="settings-title">Account</h3>
        <div className="account-row">
          <span className="avatar" aria-hidden="true">
            {(session.name[0] || '?').toUpperCase()}
          </span>
          <span className="person-text">
            <span className="person-name">{session.name}</span>
            <span className="person-email">{session.email}</span>
          </span>
        </div>
      </section>

      <div className="settings-actions">
        <InstallButton className="btn btn-block" />
        <button type="button" className="btn btn-block" onClick={onLogout}>
          <SignOut size={18} /> Sign out
        </button>
        <a className="settings-link" href="/privacy.html" target="_blank" rel="noopener">
          Privacy policy
        </a>
      </div>

      <DeleteAccount session={session} events={events} invites={invites} onDeleted={onLogout} />
    </Modal>
  )
}
