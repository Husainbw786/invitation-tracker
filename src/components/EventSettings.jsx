import { useState } from 'react'
import { CheckCircle, Plus, ShareNetwork, Trash, UserPlus, Warning, X } from '@phosphor-icons/react'
import { EVENT_TYPES, STEP_PRESETS, plural, wordsFor } from '../lib/eventTypes.js'
import {
  ROLE_LABELS,
  cancelInvite,
  deleteEvent,
  inviteHelper,
  isOwnerOf,
  removeHelper,
  setHelperRole,
  updateEvent,
} from '../lib/events.js'
import Modal from './Modal.jsx'

const MAX_STEPS = 5

function Note({ note }) {
  if (!note) return null
  return note.kind === 'error' ? (
    <p className="form-error" role="alert">
      <Warning size={16} weight="fill" /> {note.text}
    </p>
  ) : (
    <p className="field-note ok" role="status">
      <CheckCircle size={16} weight="fill" />
      <span>{note.text}</span>
    </p>
  )
}

// Who can open the list: the owner, helpers who joined, and people invited
// who have not joined yet. Only the owner changes any of it.
function Helpers({ event, session, owner }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [note, setNote] = useState(null)
  const [busy, setBusy] = useState(false)

  const people = Object.entries(event.members)
    .map(([uid, m]) => ({ uid, ...m }))
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : (a.name || '').localeCompare(b.name || '')))

  async function invite(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setNote(null)
    const result = await inviteHelper(event, email, role)
    setBusy(false)
    if (result.error) return setNote({ kind: 'error', text: result.error })
    setNote({ kind: 'ok', text: `Added. Now tap Share next to ${email.trim().toLowerCase()} to send them the link.` })
    setEmail('')
  }

  async function share(address) {
    const text =
      `I added you to the guest list for "${event.name}" on Invitations. ` +
      `Open ${window.location.origin} and sign in with ${address} (Google, or create an account with that email) to see it.`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Invitations', text })
      } catch {
        // closed the share sheet
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setNote({ kind: 'ok', text: 'Message copied. Paste it in WhatsApp or a mail to them.' })
    } catch {
      setNote({ kind: 'error', text: 'Could not copy. Tell them to sign in with this email.' })
    }
  }

  async function run(fn, ...args) {
    const ok = await fn(event, ...args)
    if (!ok) setNote({ kind: 'error', text: 'Could not save. Check your internet connection.' })
  }

  return (
    <section className="settings-block">
      <h3 className="settings-title">People who can open this list</h3>
      <ul className="people-list">
        {people.map((p) => (
          <li key={p.uid} className="person-row">
            <span className="person-text">
              <span className="person-name">
                {p.name || p.email}
                {p.uid === session.uid && ' (you)'}
              </span>
              <span className="person-email">{p.email}</span>
            </span>
            {p.role === 'owner' || !owner ? (
              <span className="role-badge">{ROLE_LABELS[p.role] || p.role}</span>
            ) : (
              <span className="person-actions">
                <select
                  aria-label={`Role of ${p.name || p.email}`}
                  value={p.role}
                  onChange={(e) => run(setHelperRole, p.uid, e.target.value)}
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  type="button"
                  className="icon-btn icon-btn-small"
                  aria-label={`Remove ${p.name || p.email}`}
                  title="Remove"
                  onClick={() => confirm(`Remove ${p.name || p.email} from this list?`) && run(removeHelper, p.uid)}
                >
                  <X size={14} weight="bold" />
                </button>
              </span>
            )}
          </li>
        ))}
        {event.invitedEmails.map((address) => (
          <li key={address} className="person-row pending">
            <span className="person-text">
              <span className="person-name">{address}</span>
              <span className="person-email">
                invited as {ROLE_LABELS[event.inviteRoles[address]] || 'Editor'}, not joined yet
              </span>
            </span>
            {owner && (
              <span className="person-actions">
                <button type="button" className="btn btn-small" onClick={() => share(address)}>
                  <ShareNetwork size={14} /> Share
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn-small"
                  aria-label={`Cancel invite for ${address}`}
                  title="Cancel invite"
                  onClick={() => run(cancelInvite, address)}
                >
                  <X size={14} weight="bold" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>

      {owner && (
        <form className="invite-form" onSubmit={invite}>
          <div className="inline-add">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="helper@email.com"
              aria-label="Helper's email"
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="What they can do">
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" className="btn btn-small" disabled={busy}>
              <UserPlus size={15} /> Add
            </button>
          </div>
          <p className="field-hint">
            Editors add and change guests; viewers only look. They sign in with this email and the
            list appears for them. No mail is sent on its own, so use Share to tell them.
          </p>
        </form>
      )}
      <Note note={note} />
    </section>
  )
}

export default function EventSettings({ event, session, guestCount, onClose, onGone }) {
  const owner = isOwnerOf(event, session.uid)
  const words = wordsFor(event)
  const [name, setName] = useState(event.name)
  const [subtitle, setSubtitle] = useState(event.subtitle)
  const [type, setType] = useState(event.type in EVENT_TYPES ? event.type : 'custom')
  const [date, setDate] = useState(event.date)
  const [venue, setVenue] = useState(event.venue)
  const [guestWord, setGuestWord] = useState(event.settings.guestWord === 'family' ? 'family' : 'guest')
  const [cityRequired, setCityRequired] = useState(words.cityRequired)
  const [steps, setSteps] = useState(words.steps.map((s) => ({ ...s })))
  const [inviteWord, setInviteWord] = useState(words.inviteWord)
  const [tagPresets, setTagPresets] = useState(words.tagPresets)
  const [tagInput, setTagInput] = useState('')
  const [giftsOn, setGiftsOn] = useState(words.giftsOn)
  const [giftLabel, setGiftLabel] = useState(words.gift)
  const [note, setNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function applyPreset(id) {
    const p = STEP_PRESETS[id]
    setSteps(p.steps.map((s) => ({ ...s })))
    setInviteWord(p.inviteWord)
  }

  function setStepLabel(index, label) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, label } : s)))
  }

  function addStep() {
    setSteps((prev) => [...prev.slice(0, -1), { id: `s${Date.now().toString(36)}`, label: '' }, prev[prev.length - 1]])
  }

  function removeStep(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (!t) return
    setTagPresets((prev) => (prev.includes(t) ? prev : [...prev, t]))
    setTagInput('')
  }

  async function save(e) {
    e.preventDefault()
    if (saving || !owner) return
    if (!name.trim()) return setNote({ kind: 'error', text: 'The event needs a name.' })
    if (steps.some((s) => !s.label.trim())) return setNote({ kind: 'error', text: 'Every step needs a name.' })
    setSaving(true)
    setNote(null)
    const ok = await updateEvent(event.id, {
      name: name.trim(),
      subtitle: subtitle.trim(),
      type,
      date,
      venue: venue.trim(),
      settings: {
        ...event.settings,
        guestWord,
        cityRequired,
        statusSteps: steps.map((s) => ({ id: s.id, label: s.label.trim() })),
        inviteWord,
        tagPresets,
        gifts: { on: giftsOn, label: giftLabel.trim() || 'Gift' },
      },
    })
    setSaving(false)
    setNote(ok ? { kind: 'ok', text: 'Saved.' } : { kind: 'error', text: 'Could not save. Check your internet connection.' })
  }

  async function remove() {
    const typed = prompt(
      `This deletes "${event.name}" and its list of ${plural(guestCount, words.one, words.many)}, for everyone, and cannot be undone.\n\nType the event name to delete it:`
    )
    if (typed === null) return
    if (typed.trim() !== event.name.trim()) return alert('The name did not match, so nothing was deleted.')
    setDeleting(true)
    const ok = await deleteEvent(event.id)
    setDeleting(false)
    if (!ok) return alert('Could not delete the event. Check your internet connection.')
    onGone()
  }

  async function leave() {
    if (!confirm(`Leave "${event.name}"? You will no longer see its list.`)) return
    const ok = await removeHelper(event, session.uid)
    if (!ok) return alert('Could not leave. Check your internet connection.')
    onGone()
  }

  return (
    <Modal title="Event settings" onClose={onClose}>
      {!owner && (
        <p className="field-hint">
          Only the owner, {event.members[event.ownerId]?.name || 'who made this event'}, can change these.
        </p>
      )}

      <form onSubmit={save} className="settings-form">
        <fieldset disabled={!owner} className="settings-fieldset">
          <section className="settings-block">
            <h3 className="settings-title">Details</h3>
            <label className="field">
              <span>Event name *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <label className="field">
              <span>Short line under the name</span>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder={EVENT_TYPES[type]?.subtitlePlaceholder}
                maxLength={80}
              />
            </label>
            <label className="field">
              <span>Type</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {Object.entries(EVENT_TYPES).map(([id, t]) => (
                  <option key={id} value={id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <label className="field">
                <span>Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="field">
                <span>Place</span>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={120} />
              </label>
            </div>
          </section>

          <section className="settings-block">
            <h3 className="settings-title">The list</h3>
            <div className="field">
              <span>One row on the list is a</span>
              <div className="segmented" role="radiogroup" aria-label="One row is a">
                {[
                  ['family', 'Family (with members)'],
                  ['guest', 'Guest'],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    role="radio"
                    aria-checked={guestWord === id}
                    className={guestWord === id ? 'segment active' : 'segment'}
                    onClick={() => setGuestWord(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="toggle-field">
              <input type="checkbox" checked={cityRequired} onChange={(e) => setCityRequired(e.target.checked)} />
              <span>City is required for every row</span>
            </label>
          </section>

          <section className="settings-block">
            <h3 className="settings-title">Invitation steps</h3>
            <div className="field">
              <span>Start from</span>
              <div className="segmented">
                {Object.entries(STEP_PRESETS).map(([id, p]) => (
                  <button type="button" key={id} className="segment" onClick={() => applyPreset(id)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <ol className="step-list">
              {steps.map((s, i) => (
                <li key={s.id} className="step-row">
                  <span className="step-num">{i + 1}</span>
                  <input
                    value={s.label}
                    onChange={(e) => setStepLabel(i, e.target.value)}
                    aria-label={`Step ${i + 1}`}
                    maxLength={30}
                  />
                  {i > 0 && i < steps.length - 1 && (
                    <button
                      type="button"
                      className="icon-btn icon-btn-small"
                      onClick={() => removeStep(i)}
                      aria-label={`Remove step ${i + 1}`}
                    >
                      <X size={14} weight="bold" />
                    </button>
                  )}
                </li>
              ))}
            </ol>
            {steps.length < MAX_STEPS && (
              <button type="button" className="btn btn-small btn-dashed" onClick={addStep}>
                <Plus size={14} weight="bold" /> Add a step in between
              </button>
            )}
            <div className="field">
              <span>What you send</span>
              <div className="segmented" role="radiogroup" aria-label="What you send">
                {[
                  ['card', 'Cards'],
                  ['invite', 'Invites'],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    role="radio"
                    aria-checked={inviteWord === id}
                    className={inviteWord === id ? 'segment active' : 'segment'}
                    onClick={() => setInviteWord(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="field-hint">
              The first step is where every new row starts; the last one counts as done on the
              dashboard.
            </p>
          </section>

          <section className="settings-block">
            <h3 className="settings-title">Functions and tags</h3>
            <p className="field-hint">Offered when adding a row. Rows can still get their own tags.</p>
            <div className="tag-cloud">
              {tagPresets.map((t) => (
                <button
                  type="button"
                  key={t}
                  className="tag-chip selected"
                  onClick={() => setTagPresets((prev) => prev.filter((x) => x !== t))}
                  aria-label={`Remove ${t}`}
                >
                  {t} <X size={11} weight="bold" />
                </button>
              ))}
              {tagPresets.length === 0 && <span className="field-hint">None yet.</span>}
            </div>
            <div className="inline-add">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="e.g. dinner, main function"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <button type="button" className="btn btn-small" onClick={addTag}>
                <Plus size={14} weight="bold" /> Add
              </button>
            </div>
          </section>

          <section className="settings-block">
            <h3 className="settings-title">Gifts</h3>
            <label className="toggle-field">
              <input type="checkbox" checked={giftsOn} onChange={(e) => setGiftsOn(e.target.checked)} />
              <span>Track who gets a gift</span>
            </label>
            {giftsOn && (
              <label className="field">
                <span>Call it</span>
                <input value={giftLabel} onChange={(e) => setGiftLabel(e.target.value)} placeholder="Gift" maxLength={30} />
              </label>
            )}
          </section>

          {owner && (
            <div className="modal-actions sticky-actions">
              <Note note={note} />
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          )}
        </fieldset>
      </form>

      <Helpers event={event} session={session} owner={owner} />

      <section className="settings-block danger-block">
        {owner ? (
          <>
            <h3 className="settings-title">Delete event</h3>
            <p className="field-hint">Removes the event and its whole list for everyone.</p>
            <button type="button" className="btn btn-small btn-danger" onClick={remove} disabled={deleting}>
              <Trash size={14} /> {deleting ? 'Deleting...' : 'Delete this event'}
            </button>
          </>
        ) : (
          <>
            <h3 className="settings-title">Leave event</h3>
            <p className="field-hint">You stop seeing this list. The owner can add you again.</p>
            <button type="button" className="btn btn-small btn-danger" onClick={leave}>
              Leave this event
            </button>
          </>
        )}
      </section>
    </Modal>
  )
}
