import { useState } from 'react'
import {
  X,
  Plus,
  Gift,
  Warning,
  GenderMale,
  GenderFemale,
  Baby,
} from '@phosphor-icons/react'
import { addFamily, updateFamily, CARD_STATUS_LABELS } from '../lib/store.js'

export default function FamilyForm({ family, side, cities, tags, onClose }) {
  const [name, setName] = useState(family?.name || '')
  const [city, setCity] = useState(family?.city || '')
  const [phone, setPhone] = useState(family?.phone || '')
  const [members, setMembers] = useState(family?.members?.length ? [...family.members] : [])
  const [memberInput, setMemberInput] = useState('')
  // Families saved before the split existed carried one untyped `memberCount`.
  // Seed it into the men box so editing an old family never loses the number.
  const legacyCount =
    !family?.maleCount && !family?.femaleCount && !family?.childCount
      ? family?.memberCount || ''
      : ''
  const [maleCount, setMaleCount] = useState(family?.maleCount || legacyCount)
  const [femaleCount, setFemaleCount] = useState(family?.femaleCount || '')
  const [childCount, setChildCount] = useState(family?.childCount || '')
  const [selectedTags, setSelectedTags] = useState(family?.tags ? [...family.tags] : [])
  const [tagInput, setTagInput] = useState('')
  const [gift, setGift] = useState(family?.gift || false)
  const [cardStatus, setCardStatus] = useState(family?.cardStatus || 'pending')
  const [notes, setNotes] = useState(family?.notes || '')
  const [error, setError] = useState('')

  function addMember() {
    const m = memberInput.trim()
    if (!m) return
    setMembers([...members, m])
    setMemberInput('')
  }

  function toggleTag(tag) {
    setSelectedTags(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]
    )
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (!t) return
    if (!selectedTags.includes(t)) setSelectedTags([...selectedTags, t])
    setTagInput('')
  }

  function save(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Family name is required.')
    if (!city.trim()) return setError('City is required. It is your main filter.')
    const data = {
      side,
      name: name.trim(),
      city: city.trim(),
      phone: phone.trim(),
      members,
      maleCount: members.length ? null : Number(maleCount) || null,
      femaleCount: members.length ? null : Number(femaleCount) || null,
      childCount: members.length ? null : Number(childCount) || null,
      memberCount: null, // replaced by the men/women/children split
      tags: selectedTags,
      gift,
      cardStatus,
      notes: notes.trim(),
    }
    if (family) updateFamily(family.id, data)
    else addFamily(data)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={save}>
        <div className="modal-head">
          <h2>{family ? 'Edit Family' : 'Add Family'}</h2>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <label className="field">
          <span>Family surname / head of family *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shaikh Family (Abbas Bhai)"
            autoFocus
          />
        </label>

        <label className="field">
          <span>City *</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Mumbai"
            list="city-suggestions"
          />
          <datalist id="city-suggestions">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="field">
          <span>Phone (optional)</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 98200 11223"
            inputMode="tel"
          />
        </label>

        <div className="field">
          <span>Members (optional: add names, or just the counts below)</span>
          <div className="inline-add">
            <input
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              placeholder="Member name"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
            />
            <button type="button" className="btn btn-small" onClick={addMember}>
              <Plus size={14} weight="bold" /> Add
            </button>
          </div>
          {members.length > 0 && (
            <ul className="member-pills">
              {members.map((m, i) => (
                <li key={i}>
                  {m}
                  <button
                    type="button"
                    onClick={() => setMembers(members.filter((_, j) => j !== i))}
                    aria-label={`Remove ${m}`}
                  >
                    <X size={12} weight="bold" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {members.length === 0 && (
            <div className="count-split">
              <label className="count-box">
                <span className="count-box-label">
                  <GenderMale size={15} weight="bold" /> Men
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={maleCount}
                  onChange={(e) => setMaleCount(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="count-box">
                <span className="count-box-label">
                  <GenderFemale size={15} weight="bold" /> Women
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={femaleCount}
                  onChange={(e) => setFemaleCount(e.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="count-box">
                <span className="count-box-label">
                  <Baby size={15} weight="bold" /> Children
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={childCount}
                  onChange={(e) => setChildCount(e.target.value)}
                  placeholder="0"
                />
              </label>
              <p className="count-total">
                Total guests:{' '}
                <strong>
                  {(Number(maleCount) || 0) +
                    (Number(femaleCount) || 0) +
                    (Number(childCount) || 0)}
                </strong>
              </p>
            </div>
          )}
        </div>

        <div className="field">
          <span>Tags</span>
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
            {selectedTags
              .filter((t) => !tags.includes(t))
              .map((t) => (
                <button
                  type="button"
                  key={t}
                  className="tag-chip selected"
                  onClick={() => toggleTag(t)}
                >
                  {t}
                </button>
              ))}
          </div>
          <div className="inline-add">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="New tag e.g. mamera, main function"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <button type="button" className="btn btn-small" onClick={addTag}>
              <Plus size={14} weight="bold" /> Tag
            </button>
          </div>
        </div>

        <div className="field-row">
          <label className="toggle-field">
            <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} />
            <Gift size={18} weight="fill" />
            <span>Gift to be given</span>
          </label>

          <label className="field">
            <span>Card status</span>
            <select value={cardStatus} onChange={(e) => setCardStatus(e.target.value)}>
              {Object.entries(CARD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Notes (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="2"
            placeholder="Anything to remember about this family"
          />
        </label>

        {error && (
          <p className="form-error">
            <Warning size={16} weight="fill" /> {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {family ? 'Save Changes' : 'Add Family'}
          </button>
        </div>
      </form>
    </div>
  )
}
