import { useState } from 'react'
import { CalendarBlank, CaretRight, EnvelopeSimple, GearSix, Plus, Sparkle } from '@phosphor-icons/react'
import { eventType } from '../lib/eventTypes.js'
import { ROLE_LABELS, acceptInvite, declineInvite, roleIn } from '../lib/events.js'
import { refreshSession, resendVerification } from '../lib/auth.js'
import InstallButton from './InstallButton.jsx'
import SettingsSheet from './SettingsSheet.jsx'
import EventIcon, { toneOf } from './EventArt.jsx'
import Logo from './Logo.jsx'
import { daysToGo, formatDate } from '../lib/dates.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function ownerName(event) {
  return event.members[event.ownerId]?.name || 'Someone'
}

// Email accounts must verify their address before they can join an event
// they were invited to (the rules check it). Google accounts already are.
function VerifyNote({ session, onSession }) {
  const [state, setState] = useState('') // '' | sending | sent | checking | still
  if (session.emailVerified) return null

  async function resend() {
    setState('sending')
    setState((await resendVerification()) ? 'sent' : '')
  }

  async function check() {
    setState('checking')
    const fresh = await refreshSession()
    if (fresh?.emailVerified) onSession(fresh)
    else setState('still')
  }

  return (
    <div className="notice">
      <EnvelopeSimple size={20} weight="duotone" />
      <div className="notice-body">
        <p>
          <strong>Verify your email</strong> ({session.email}) to join events that others invite
          you to.
        </p>
        {state === 'sent' && (
          <p className="notice-small">Sent. Open the link in the mail (check spam too), then come back here.</p>
        )}
        {state === 'still' && <p className="notice-small">Not verified yet. Open the link in the mail first.</p>}
        <div className="notice-actions">
          <button className="link-btn" onClick={check} disabled={state === 'checking'}>
            I have verified
          </button>
          <button className="link-btn" onClick={resend} disabled={state === 'sending'}>
            Send me the link
          </button>
        </div>
      </div>
    </div>
  )
}

function InviteCard({ event, session }) {
  const [busy, setBusy] = useState(false)
  const role = event.inviteRoles[session.email] === 'viewer' ? 'viewer' : 'editor'

  async function act(fn) {
    setBusy(true)
    const ok = await fn(event, session)
    setBusy(false)
    if (!ok) alert('Could not save. Check your internet connection.')
  }

  return (
    <li className="invite-card">
      <EventIcon event={event} />
      <div className="invite-text">
        <p>
          <strong>{ownerName(event)}</strong> asked you to help with <strong>{event.name}</strong>
        </p>
        <p className="row-meta">
          as {ROLE_LABELS[role]}
          {role === 'viewer' ? ' (can look, not change)' : ' (can add and edit guests)'}
        </p>
      </div>
      <div className="invite-actions">
        <button className="btn btn-small btn-primary" disabled={busy} onClick={() => act(acceptInvite)}>
          Join
        </button>
        <button className="btn btn-small" disabled={busy} onClick={() => act(declineInvite)}>
          No thanks
        </button>
      </div>
    </li>
  )
}

export default function EventList({ session, events, invites, pendingShare, onOpen, onCreate, onLogout, onSession }) {
  const firstName = session.name.split(' ')[0]
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
  const count = events?.length || 0
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="app">
      <header className="home-top">
        <div className="brand-row"><Logo className="brand-mark" /><span className="brand-name">Invitations</span></div>
        <div className="top-actions">
          <span className="avatar" aria-label={session.name}>{(firstName[0] || '?').toUpperCase()}</span>
          <InstallButton className="icon-btn" labelClassName="sr-only" />
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Settings" aria-label="Settings">
            <GearSix />
          </button>
        </div>
      </header>

      <main className="content">
        <div className="event-welcome">
          <div>
            <h1 className="page-title">
              {greeting()}, {firstName}
            </h1>
            <p className="page-sub metadata">
              <span>{today}</span>
              {count > 0 && <span>{count} {count === 1 ? 'event' : 'events'}</span>}
            </p>
          </div>
          {count > 0 && <button className="btn btn-primary" onClick={onCreate}><Plus weight="bold" /> New event</button>}
        </div>

        <VerifyNote session={session} onSession={onSession} />

        {pendingShare && (
          <div className="notice">
            <Sparkle size={20} weight="duotone" />
            <div className="notice-body">
              <p>
                Open the event to add <strong>{pendingShare.name || 'the shared contact'}</strong> to.
              </p>
            </div>
          </div>
        )}

        {invites.length > 0 && (
          <section className="section">
            <div className="section-head">
              <h2 className="section-title">Invitations to help</h2>
            </div>
            <ul className="invite-list">
              {invites.map((e) => (
                <InviteCard key={e.id} event={e} session={session} />
              ))}
            </ul>
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Your events</h2>
          </div>

          {events === null && <p className="empty-hint">Loading your events…</p>}

          {events?.length === 0 && (
            <div className="empty">
              <span className="empty-icon">
                <CalendarBlank weight="duotone" />
              </span>
              <h3>No events yet</h3>
              <p>Start a guest list for a wedding, a birthday, or anything else.</p>
              <button className="btn btn-primary" onClick={onCreate}>
                <Plus size={16} weight="bold" /> Create your first event
              </button>
            </div>
          )}

          {events?.length > 0 && (
            <ul className="rows event-register">
              {events.map((e) => {
                const role = roleIn(e, session.uid)
                const meta = [formatDate(e.date), e.venue].filter(Boolean)
                const countdown = daysToGo(e.date)
                return (
                  <li key={e.id}>
                    <button className="row" onClick={() => onOpen(e.id)}>
                      <EventIcon event={e} />
                      <span className="row-text">
                        <span className="event-kind" data-tone={toneOf(e)}>{eventType(e).label}</span>
                        <span className="row-title">{e.name}</span>
                        {meta.length > 0 && (
                          <span className="row-meta metadata">
                            {meta.map((part, i) => <span key={i}>{part}</span>)}
                            {countdown && <span className="event-countdown">{countdown}</span>}
                          </span>
                        )}
                      </span>
                      {role !== 'owner' && <span className="badge">{ROLE_LABELS[role] || 'Helper'}</span>}
                      <CaretRight className="row-chevron" weight="bold" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>

      {settingsOpen && (
        <SettingsSheet
          session={session}
          events={events}
          invites={invites}
          onClose={() => setSettingsOpen(false)}
          onLogout={onLogout}
        />
      )}
    </div>
  )
}
