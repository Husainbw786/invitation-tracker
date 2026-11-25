import { useEffect, useState } from 'react'
import { CalendarBlank, CheckCircle, MapPin, Minus, Plus, Warning } from '@phosphor-icons/react'
import { daysToGo, formatDate } from '../lib/dates.js'
import { MAX_NOTE, RSVP_LABELS, loadInvitation, repliesOpen, sendAnswer } from '../lib/rsvp.js'
import EventIcon from './EventArt.jsx'

const CHOICES = [
  ['yes', "Yes, I'll come"],
  ['maybe', 'Maybe'],
  ['no', "Can't come"],
]

function Summary({ response }) {
  const parts = [RSVP_LABELS[response.status]]
  if (response.status !== 'no') parts.push(`${response.people} ${response.people === 1 ? 'person' : 'people'}`)
  if (response.status !== 'no' && response.functions.length) parts.push(response.functions.join(', '))
  return (
    <>
      <p className="rsvp-summary metadata">{parts.map((part) => <span key={part}>{part}</span>)}</p>
      {response.note && <p className="notes">“{response.note}”</p>}
    </>
  )
}

// What a guest sees when they open their RSVP link. No account needed: the
// link's token lets them read their own invitation and answer it.
export default function RsvpPage({ eventId, token }) {
  const [state, setState] = useState({ loading: true })
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState('')
  const [people, setPeople] = useState(1)
  const [functions, setFunctions] = useState([])
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    setState({ loading: true })
    loadInvitation(eventId, token).then((result) => {
      if (cancelled) return
      setState(result)
      if (result.rsvp) {
        const r = result.rsvp.response
        setStatus(r?.status || '')
        setPeople(r && r.status !== 'no' ? Math.max(1, r.people) : result.rsvp.invited)
        setFunctions(r && r.status !== 'no' ? r.functions : result.rsvp.functions)
        setNote(r?.note || '')
        setEditing(!r)
      }
    })
    return () => {
      cancelled = true
    }
  }, [eventId, token])

  useEffect(() => {
    if (!state.card?.name) return
    const before = document.title
    document.title = `${state.card.name} · RSVP`
    return () => {
      document.title = before
    }
  }, [state.card])

  if (state.loading) return <div className="blank-page" />

  if (state.error) {
    return (
      <div className="rsvp-page">
        <div className="rsvp-wrap">
          <div className="empty">
            <span className="empty-icon">
              <Warning weight="duotone" />
            </span>
            <h3>{state.error === 'offline' ? 'Could not open the invitation' : 'This link does not work anymore'}</h3>
            <p>
              {state.error === 'offline'
                ? 'Check your internet connection and open the link again.'
                : 'Ask the person who sent it for a new link.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const { card, rsvp } = state
  const open = repliesOpen(card)
  const response = rsvp.response
  const countdown = daysToGo(card.date)
  const coming = status === 'yes' || status === 'maybe'

  function toggleFunction(f) {
    setFunctions((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }

  async function submit(e) {
    e.preventDefault()
    if (sending) return
    if (!status) return setError('Choose whether you can come.')
    if (coming && people < 1) return setError('How many people are coming?')
    setError('')
    setSending(true)
    const answer = { status, people: coming ? people : 0, functions: coming ? functions : [], note }
    const result = await sendAnswer(eventId, token, answer)
    setSending(false)
    if (result.error === 'closed') return setError('Replies are closed for this event, so the answer was not sent.')
    if (result.error) return setError('Could not send. Check your internet connection and try again.')
    setState({ card, rsvp: { ...rsvp, response: { ...answer, note: note.trim() } } })
    setEditing(false)
  }

  return (
    <div className="rsvp-page">
      <div className="rsvp-wrap">
        <header className="rsvp-head">
          <div className="invitation-letterhead">
            <span>Private invitation</span>
            <EventIcon event={card} />
          </div>
          <p className="invite-addressee">Dear {rsvp.guestName},</p>
          <h1 className="rsvp-title">{card.name}</h1>
          {card.subtitle && <p className="rsvp-sub">{card.subtitle}</p>}
          <ul className="rsvp-facts">
            {card.date && (
              <li>
                <CalendarBlank weight="duotone" />
                <span>
                  {formatDate(card.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {countdown && <span className="rsvp-countdown">{countdown}</span>}
                </span>
              </li>
            )}
            {card.venue && (
              <li>
                <MapPin weight="duotone" />
                <span>{card.venue}</span>
              </li>
            )}
          </ul>
        </header>

        {!editing && response ? (
          <section className="auth-card rsvp-card">
            <p className="reply-receipt" role="status"><CheckCircle /> Reply received</p>
            <h2 className="auth-title">Thank you, {rsvp.guestName}</h2>
            <p className="auth-sub">
              {card.hostName ? `${card.hostName} can see your answer.` : 'The hosts can see your answer.'}
            </p>
            <Summary response={response} />
            {open ? (
              <button type="button" className="btn btn-block rsvp-change" onClick={() => setEditing(true)}>
                Change my answer
              </button>
            ) : (
              <p className="field-hint rsvp-closed-note">Replies are closed now.</p>
            )}
          </section>
        ) : !open ? (
          <section className="auth-card rsvp-card">
            <h2 className="auth-title">Your RSVP</h2>
            <p className="auth-sub">
              {card.rsvpOn
                ? 'Replies for this event are closed.'
                : 'The hosts are not taking replies right now. Please check with them directly.'}
            </p>
          </section>
        ) : (
          <form className="auth-card rsvp-card" onSubmit={submit} noValidate>
            <h2 className="auth-title">Your RSVP</h2>
            <p className="auth-sub">
              {card.hostName ? `${card.hostName} would love to know if you can come.` : 'Please let the hosts know if you can come.'}
            </p>

            <div className="rsvp-choices" role="radiogroup" aria-label="Can you come?">
              {CHOICES.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  role="radio"
                  aria-checked={status === id}
                  className={status === id ? `rsvp-choice rsvp-choice-${id} selected` : `rsvp-choice rsvp-choice-${id}`}
                  onClick={() => setStatus(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {coming && (
              <div className="field">
                <span>How many people{rsvp.invited > 1 ? ` (up to ${rsvp.invited})` : ''}?</span>
                <div className="stepper">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setPeople((n) => Math.max(1, n - 1))}
                    disabled={people <= 1}
                    aria-label="One less"
                  >
                    <Minus weight="bold" />
                  </button>
                  <output className="stepper-value" aria-live="polite">
                    {people}
                  </output>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setPeople((n) => Math.min(rsvp.invited, n + 1))}
                    disabled={people >= rsvp.invited}
                    aria-label="One more"
                  >
                    <Plus weight="bold" />
                  </button>
                </div>
              </div>
            )}

            {coming && rsvp.functions.length > 0 && (
              <div className="field">
                <span>Which ones will you come to?</span>
                <div className="tag-cloud">
                  {rsvp.functions.map((f) => (
                    <button
                      type="button"
                      key={f}
                      aria-pressed={functions.includes(f)}
                      className={functions.includes(f) ? 'tag-chip selected' : 'tag-chip'}
                      onClick={() => toggleFunction(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="field">
              <span>Message for the hosts (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows="3"
                maxLength={MAX_NOTE}
                placeholder="Congratulations! / We will arrive late / ..."
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                <Warning size={16} weight="fill" /> {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={sending}>
              {sending ? 'Sending...' : response ? 'Update my answer' : 'Send my answer'}
            </button>
            {response && (
              <button type="button" className="btn btn-ghost btn-block" onClick={() => setEditing(false)}>
                Keep my earlier answer
              </button>
            )}
          </form>
        )}

        <p className="rsvp-foot">
          Sent with <a href="/">Invitations</a>
        </p>
      </div>
    </div>
  )
}
