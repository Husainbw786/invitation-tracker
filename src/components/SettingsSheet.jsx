import { SignOut } from '@phosphor-icons/react'
import Modal from './Modal.jsx'
import ThemeSwitch from './ThemeSwitch.jsx'
import InstallButton from './InstallButton.jsx'

// The account's own settings (not an event's): who is signed in, light or
// dark look, install, sign out.
export default function SettingsSheet({ session, onClose, onLogout }) {
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

      <section className="settings-block">
        <h3 className="settings-title">Appearance</h3>
        <ThemeSwitch />
        <p className="field-hint">Auto follows your phone&apos;s light or dark setting.</p>
      </section>

      <div className="settings-actions">
        <InstallButton className="btn btn-block" />
        <button type="button" className="btn btn-block" onClick={onLogout}>
          <SignOut size={18} /> Sign out
        </button>
      </div>
    </Modal>
  )
}
