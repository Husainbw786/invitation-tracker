import { useState } from 'react'
import { CalendarBlank, ChartBar, Check, EnvelopeOpen, EnvelopeSimple, FlowerTulip, UsersThree } from '@phosphor-icons/react'
import { defaultSettings, wordsFor } from '../lib/eventTypes.js'
import { RSVP_LABELS, rsvpState } from '../lib/rsvp.js'
import Dashboard from './Dashboard.jsx'
import GuestList, { EMPTY_FILTERS } from './GuestList.jsx'

const event = {
  name: 'Garden wedding',
  type: 'wedding',
  venue: 'Pune',
  settings: { ...defaultSettings('wedding'), rsvp: { on: true } },
}
const guests = [
  { id: 'shaikh', name: 'Shaikh Family', city: 'Mumbai', memberCount: 4, cardStatus: 'delivered' },
  { id: 'khan', name: 'Khan Family', city: 'Pune', memberCount: 3, cardStatus: 'written' },
  { id: 'mehta', name: 'Mehta Family', city: 'Surat', memberCount: 5, cardStatus: 'pending' },
  { id: 'patel', name: 'Patel Family', city: 'Pune', memberCount: 2, cardStatus: 'delivered' },
].map(guest => ({ ...guest, phone: '', notes: '', members: [], tags: ['Reception'] }))
const initialReplies = {
  shaikh: { response: { status: 'yes', people: 4, functions: ['Reception'] } },
  khan: { response: { status: 'maybe', people: 3, functions: [] } },
  mehta: { response: null },
  patel: { response: null },
}
const words = wordsFor(event)
const invitedFamily = guests.find(guest => guest.id === 'patel')
const guestCount = guests.reduce((sum, guest) => sum + guest.memberCount, 0)

function SampleInvitation({ response, onReply }) {
  const [editing, setEditing] = useState(false)
  const [people, setPeople] = useState(response?.people || invitedFamily.memberCount)

  function reply(status) {
    onReply({ status, people: status === 'no' ? 0 : people, functions: [] })
    setEditing(false)
  }

  return (
    <article className="coral-paper guest-paper" aria-label="Guest invitation">
      <div className="paper-meta"><span>Private invitation</span><EnvelopeOpen size={20} /></div>
      <p className="invite-greeting">Dear {invitedFamily.name},</p>
      <h2>You’re invited to<br />our {event.name.toLowerCase()}.</h2>
      <p className="invite-place">{event.venue} reception</p>
      {response && !editing ? (
        <div className="sample-confirmation">
          <p role="status"><span className="ink-stamp">Reply received</span> {RSVP_LABELS[response.status]}{response.people > 0 && ` · ${response.people} ${response.people === 1 ? 'guest' : 'guests'}`}</p>
          <button type="button" className="link-btn" onClick={() => setEditing(true)}>Change reply</button>
        </div>
      ) : (
        <div className="sample-answer">
          <label>Party size
            <select value={people} onChange={e => setPeople(Number(e.target.value))}>
              {Array.from({ length: invitedFamily.memberCount }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'guest' : 'guests'}</option>
              ))}
            </select>
          </label>
          <div className="sample-choices" role="group" aria-label="Your sample RSVP">
            <button type="button" onClick={() => reply('yes')}>I’ll come</button>
            <button type="button" onClick={() => reply('maybe')}>Maybe</button>
            <button type="button" onClick={() => reply('no')}>Can’t come</button>
          </div>
        </div>
      )}
    </article>
  )
}

export default function EventPreview({ children }) {
  const [side, setSide] = useState('host')
  const [replies, setReplies] = useState(initialReplies)
  const [view, setView] = useState('list')
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  function showGuests(patch) {
    setFilters({ ...EMPTY_FILTERS, ...patch })
    setView('list')
  }

  return (
    <>
      <section className="pitch-inner pitch-hero" aria-label="Invitations">
        {children}
        <section className="coral-desk" aria-label="Interactive sample event stationery">
          <div className={`stationery stationery-${side}`}>
            <div className="desk-envelope" aria-hidden="true"><span className="envelope-flap" /></div>
            {side === 'host' ? (
              <article className="coral-paper host-paper">
                <div className="paper-meta"><span>Guest register</span><UsersThree size={20} /></div>
                <h2>{event.name}</h2>
                <p className="paper-place">{event.venue} reception</p>
                <div className="register-labels"><span>Family</span><span>RSVP</span></div>
                <ul className="coral-register">
                  {guests.map(guest => {
                    const status = rsvpState(replies[guest.id])
                    return (
                      <li key={guest.id}>
                        <a href="#event-preview" onClick={() => showGuests({ search: guest.name })}>
                          <span>{guest.name}</span>
                          <span className={status === 'yes' ? 'reply-yes' : ''}>
                            {status === 'yes' && <Check size={13} />} {RSVP_LABELS[status]}
                          </span>
                        </a>
                      </li>
                    )
                  })}
                </ul>
                <footer className="paper-foot">{guests.length} families <span>{guestCount} guests invited</span></footer>
              </article>
            ) : (
              <SampleInvitation response={replies[invitedFamily.id].response} onReply={response =>
                setReplies(prev => ({ ...prev, [invitedFamily.id]: { response } }))} />
            )}
            {side === 'host' && (
              <button type="button" className="address-slip" onClick={() => setSide('guest')} aria-label="Open the Patel Family sample invitation">
                <span className="slip-address"><small>To</small><strong>{invitedFamily.name}</strong><span>{invitedFamily.city}</span></span>
                <span className="slip-postage" aria-hidden="true"><FlowerTulip weight="duotone" /></span>
              </button>
            )}
          </div>
          <div className="desk-caption">
            <span>Sample event</span>
            <div className="side-switch" role="group" aria-label="Sample perspective">
              <button type="button" aria-pressed={side === 'host'} onClick={() => setSide('host')}><UsersThree />Host view</button>
              <button type="button" aria-pressed={side === 'guest'} onClick={() => setSide('guest')}><EnvelopeSimple />Guest view</button>
            </div>
          </div>
        </section>
      </section>
      <section id="event-preview" aria-label="Interactive sample event" className="preview-stage">
        <div className="preview-shell">
          <header className="preview-head">
            <CalendarBlank size={23} aria-hidden="true" />
            <h2>{event.name}</h2>
            <span>Sample event</span>
          </header>
          <div className="preview-body">
            <nav className="preview-nav" aria-label="Sample event views">
              <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><UsersThree /> Guest list</button>
              <button type="button" aria-pressed={view === 'overview'} onClick={() => setView('overview')}><ChartBar /> Overview</button>
            </nav>
            <div className="preview-content">
              <h3>{view === 'list' ? 'Guest list' : 'Event overview'}</h3>
              {view === 'list' ? (
                <GuestList event={event} words={words} guests={guests} rsvps={replies} cities={['Mumbai', 'Pune', 'Surat']}
                  tags={['Reception']} filters={filters} setFilters={setFilters} canEdit={false} />
              ) : (
                <Dashboard event={event} words={words} guests={guests} rsvps={replies} canEdit={false}
                  isOwner={false} onDrillDown={showGuests} />
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
