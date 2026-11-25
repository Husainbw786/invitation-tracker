import { useMemo, useState } from 'react'
import { Warning, X } from '@phosphor-icons/react'
import Modal from './Modal.jsx'
import { addGuest } from '../lib/store.js'
import { plural } from '../lib/eventTypes.js'
import { phoneKey } from '../lib/vcard.js'

// Several people ticked on the Android app's contacts screen: each becomes a
// family of its own, with one city and the same tags for all of them. Anyone
// whose number is already on the list starts unticked, so nobody is added twice.
export default function BulkAddSheet({ eventId, words, people, guests, cities, tags, onClose, onDone }) {
  const known = useMemo(() => new Set(guests.map((g) => phoneKey(g.phone)).filter(Boolean)), [guests])
  const [rows, setRows] = useState(() =>
    people.map((p, i) => {
      const duplicate = p.phones.some((tel) => known.has(phoneKey(tel)))
      return { id: i, name: p.name || p.phones[0] || '', phone: p.phones[0] || '', duplicate, on: !duplicate }
    })
  )
  const [city, setCity] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const chosen = rows.filter((r) => r.on)

  function toggleTag(t) {
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  async function save(e) {
    e.preventDefault()
    if (saving) return
    if (!chosen.length) return setError(`Tick at least one ${words.one}.`)
    if (words.cityRequired && !city.trim()) return setError('City is required. It is your main filter.')
    setError('')
    setSaving(true)
    let added = 0
    for (const r of chosen) {
      const saved = await addGuest(eventId, {
        name: r.name.trim(),
        city: city.trim(),
        phone: r.phone,
        members: [],
        memberTags: {},
        maleCount: null,
        femaleCount: null,
        childCount: null,
        tagCounts: {},
        memberCount: null,
        tags: selectedTags,
        gift: false,
        cardStatus: words.steps[0].id,
        notes: '',
      })
      if (!saved) break
      added += 1
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, on: false, added: true } : x)))
    }
    setSaving(false)
    if (added < chosen.length) {
      return setError(`Added ${added} of ${chosen.length}. Check your internet connection and tap Add again for the rest.`)
    }
    onDone(added)
  }

  return (
    <Modal title={`Add ${plural(rows.length, words.one, words.many)}`} onClose={onClose} onSubmit={save}>
      <p className="field-hint bulk-hint">
        Each person becomes a {words.one} on your list. Add their counts and details later from the list.
      </p>

      <ul className="bulk-list">
        {rows.map((r) => (
          <li key={r.id} className={r.on ? 'bulk-row' : 'bulk-row off'}>
            <label className="bulk-pick">
              <input
                type="checkbox"
                checked={r.on}
                disabled={saving || r.added}
                onChange={() => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)))}
              />
              <span className="bulk-text">
                <input
                  className="bulk-name"
                  value={r.name}
                  aria-label="Family name"
                  disabled={saving || r.added}
                  onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
                />
                <span className="bulk-meta metadata">
                  <span>{r.phone || 'No number'}</span>
                  {r.duplicate && !r.added && <span className="bulk-dup">Already on your list</span>}
                  {r.added && <span className="bulk-done">Added</span>}
                </span>
              </span>
            </label>
            {!r.added && (
              <button
                type="button"
                className="icon-btn icon-btn-small"
                aria-label={`Remove ${r.name}`}
                disabled={saving}
                onClick={() => setRows((prev) => prev.filter((x) => x.id !== r.id))}
              >
                <X size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      <label className="field">
        <span>{words.cityRequired ? 'City for all of them *' : 'City for all of them (optional)'}</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Mumbai"
          list="bulk-city-suggestions"
        />
        <datalist id="bulk-city-suggestions">
          {cities.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>

      {tags.length > 0 && (
        <div className="field">
          <span>Tags for all of them</span>
          <div className="tag-cloud">
            {tags.map((t) => (
              <button
                type="button"
                key={t}
                className={selectedTags.includes(t) ? 'tag-chip selected' : 'tag-chip'}
                onClick={() => toggleTag(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          <Warning size={16} weight="fill" /> {error}
        </p>
      )}

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving || !chosen.length}>
          {saving ? 'Adding...' : `Add ${plural(chosen.length, words.one, words.many)}`}
        </button>
      </div>
    </Modal>
  )
}
