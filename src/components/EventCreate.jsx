import { useState } from 'react'
import { Warning } from '@phosphor-icons/react'
import { EVENT_TYPES } from '../lib/eventTypes.js'
import { createEvent } from '../lib/events.js'
import Modal from './Modal.jsx'

/** Pick a type, name the event, done. Everything else lives in Event Settings. */
export default function EventCreate({ session, onClose, onCreated }) {
  const [type, setType] = useState('wedding')
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [date, setDate] = useState('')
  const [venue, setVenue] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const t = EVENT_TYPES[type]

  async function save(e) {
    e.preventDefault()
    if (saving) return
    if (!name.trim()) return setError('Give the event a name.')
    setError('')
    setSaving(true)
    const id = await createEvent(session, { type, name, subtitle, date, venue })
    setSaving(false)
    if (!id) return setError('Could not create the event. Check your internet connection.')
    onCreated(id)
  }

  return (
    <Modal title="New event" onClose={onClose} onSubmit={save}>
      <div className="field">
        <span>What kind of event?</span>
        <div className="type-grid" role="radiogroup" aria-label="Event type">
          {Object.entries(EVENT_TYPES).map(([id, et]) => {
            const Icon = et.icon
            return (
              <button
                type="button"
                key={id}
                role="radio"
                aria-checked={type === id}
                aria-label={et.label}
                className={type === id ? 'type-option selected' : 'type-option'}
                data-tone={id}
                onClick={() => setType(id)}
              >
                <Icon size={22} weight="duotone" />
                <span>{et.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <label className="field">
        <span>Event name *</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} maxLength={120} />
      </label>

      <label className="field">
        <span>Short line under the name (optional)</span>
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder={t.subtitlePlaceholder}
          maxLength={80}
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span>Date (optional)</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Place (optional)</span>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Taj Banquets, Pune" maxLength={120} />
        </label>
      </div>

      <p className="field-hint">
        A {t.label.toLowerCase()} starts with{' '}
        {t.guestWord === 'family' ? 'one row per family' : 'one row per guest'}
        {t.tags.length ? `, functions like ${t.tags.slice(0, 3).join(', ')}` : ''}
        {t.gifts.on ? ' and gift tracking' : ''}. You can change all of it later in Settings.
      </p>

      {error && (
        <p className="form-error">
          <Warning size={16} weight="fill" /> {error}
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Creating...' : 'Create event'}
        </button>
      </div>
    </Modal>
  )
}
