import { useEffect, useRef, useState } from 'react'
import {
  X,
  Plus,
  Gift,
  Warning,
  GenderMale,
  GenderFemale,
  Baby,
  AddressBook,
} from '@phosphor-icons/react'
import { addFamily, updateFamily, CARD_STATUS_LABELS } from '../lib/store.js'
import { canPickContacts, isAndroid, pickContacts } from '../lib/contacts.js'

// Shown under the field when picking from phone contacts produced nothing.
const CONTACT_MESSAGES = {
  unsupported: 'Picking from contacts needs Chrome or Samsung Internet on Android.',
  busy: 'The contact picker is already open.',
  failed: 'Could not open your contacts. Please try again.',
  none:
    'No contact was chosen. If your contacts did not show up, allow Contacts for your ' +
    'browser in the phone Settings (Apps › Chrome › Permissions) and try again.',
}

// Whole, non-negative number from an input value, or null when blank/invalid.
// The database columns are integers, so "2.5" or "-1" must never reach them.
function toCount(value) {
  const n = Math.floor(Number(value))
  return Number.isFinite(n) && n > 0 ? n : null
}

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
  // Per-member: which of the family's tags each named member is attending.
  // A member with no entry here is assumed to attend every selected tag.
  const [memberTags, setMemberTags] = useState(family?.memberTags ? { ...family.memberTags } : {})
  // Count-mode (no named members): how many guests attend each tag.
  // An unset tag falls back to the full family headcount.
  const [tagCounts, setTagCounts] = useState(family?.tagCounts ? { ...family.tagCounts } : {})
  const [gift, setGift] = useState(family?.gift || false)
  const [cardStatus, setCardStatus] = useState(family?.cardStatus || 'pending')
  const [notes, setNotes] = useState(family?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Picking from phone contacts (Android). `contactNumbers` keeps every number
  // of the last picked contact so the user can switch when there are several.
  const [contactNumbers, setContactNumbers] = useState([])
  const [phoneHint, setPhoneHint] = useState('')
  const [memberHint, setMemberHint] = useState('')
  const [picking, setPicking] = useState(false)
  // The button is shown wherever the picker exists, and on every Android
  // browser so a user without it is told to use Chrome instead of seeing
  // nothing at all.
  const showContactButtons = canPickContacts() || isAndroid()
  // Where the last mouse press started, so dragging a text selection out of
  // an input and releasing on the backdrop doesn't close the form.
  const pressedOnBackdrop = useRef(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addMember() {
    const m = memberInput.trim()
    if (!m) return
    setMembers((prev) => [...prev, m])
    setMemberInput('')
  }

  // One contact for the head of the family: fills the phone, and the family
  // name too unless something is already typed there (editing an existing
  // family, or a name written the family's own way).
  async function pickHeadOfFamily() {
    if (picking) return
    setPicking(true)
    setPhoneHint('')
    const { contacts, error: pickError } = await pickContacts()
    setPicking(false)
    if (pickError) return setPhoneHint(CONTACT_MESSAGES[pickError])
    const c = contacts[0]
    if (!c) return setPhoneHint(CONTACT_MESSAGES.none)
    const who = c.name || 'That contact'
    if (c.name && !name.trim()) setName(c.name)
    else if (c.name) setPhoneHint(`Number taken from ${c.name}. The family name you typed was kept.`)
    setContactNumbers(c.phones)
    if (c.phones.length) setPhone(c.phones[0])
    else setPhoneHint(`${who} has no phone number saved.`)
  }

  // Several contacts at once become named members. A person already on the
  // list is not added twice, so re-picking is harmless.
  async function pickMembers() {
    if (picking) return
    setPicking(true)
    setMemberHint('')
    const { contacts, error: pickError } = await pickContacts({ multiple: true })
    setPicking(false)
    if (pickError) return setMemberHint(CONTACT_MESSAGES[pickError])
    const names = contacts.map((c) => c.name).filter(Boolean)
    if (!names.length) return setMemberHint(CONTACT_MESSAGES.none)
    setMembers((prev) => {
      const next = [...prev]
      for (const n of names) if (!next.includes(n)) next.push(n)
      return next
    })
  }

  function removeMember(index, m) {
    const next = members.filter((_, j) => j !== index)
    setMembers(next)
    // Only drop this member's tag assignment once no duplicate of the same
    // name remains, so removing one "Zoya" doesn't wipe another "Zoya".
    if (!next.includes(m)) {
      setMemberTags((prev) => {
        const { [m]: _removed, ...rest } = prev
        return rest
      })
    }
  }

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  // A member with no explicit entry is assumed to attend every selected tag;
  // clicking a chip materializes that assumption into an explicit list so a
  // single person can be excluded from a specific function.
  function toggleMemberTag(member, tag) {
    setMemberTags((prev) => {
      const current = prev[member] ?? selectedTags
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag]
      return { ...prev, [member]: next }
    })
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (!t) return
    setSelectedTags((prev) => (prev.includes(t) ? prev : [...prev, t]))
    setTagInput('')
  }

  async function save(e) {
    e.preventDefault()
    if (saving) return
    if (!name.trim()) return setError('Family name is required.')
    if (!city.trim()) return setError('City is required. It is your main filter.')

    // Only keep memberTags entries for members still on the list, and only
    // for tags still selected on the family (dropping a tag drops its data).
    const savedMemberTags = {}
    for (const m of members) {
      const explicit = memberTags[m]
      if (explicit) savedMemberTags[m] = explicit.filter((t) => selectedTags.includes(t))
    }
    // Only keep tagCounts for tags still selected, and only when the user
    // actually typed a number (blank means "assume everyone").
    const savedTagCounts = {}
    for (const t of selectedTags) {
      if (tagCounts[t] !== undefined && tagCounts[t] !== '') {
        savedTagCounts[t] = toCount(tagCounts[t]) || 0
      }
    }

    const data = {
      side,
      name: name.trim(),
      city: city.trim(),
      phone: phone.trim(),
      members,
      memberTags: members.length ? savedMemberTags : {},
      maleCount: members.length ? null : toCount(maleCount),
      femaleCount: members.length ? null : toCount(femaleCount),
      childCount: members.length ? null : toCount(childCount),
      tagCounts: members.length ? {} : savedTagCounts,
      memberCount: null, // replaced by the men/women/children split
      tags: selectedTags,
      gift,
      cardStatus,
      notes: notes.trim(),
    }
    setError('')
    setSaving(true)
    const ok = family ? await updateFamily(family.id, data) : await addFamily(data)
    setSaving(false)
    // On failure keep the form open so nothing that was typed is lost.
    if (!ok) return setError('Could not save. Please try again.')
    onClose()
  }

  const guestTotal = (toCount(maleCount) || 0) + (toCount(femaleCount) || 0) + (toCount(childCount) || 0)

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => (pressedOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose()
        pressedOnBackdrop.current = false
      }}
    >
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

        <div className="field">
          <span>Phone (optional)</span>
          <div className="inline-add">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 98200 11223"
              inputMode="tel"
              aria-label="Phone"
            />
            {showContactButtons && (
              <button
                type="button"
                className="btn btn-small"
                onClick={pickHeadOfFamily}
                disabled={picking}
                title="Pick from phone contacts"
                aria-label="Pick from phone contacts"
              >
                <AddressBook size={16} weight="bold" />
                <span className="contacts-btn-label">Contacts</span>
              </button>
            )}
          </div>
          {contactNumbers.length > 1 && (
            <>
              <p className="field-hint">
                This contact has {contactNumbers.length} numbers. Tap one to use it.
              </p>
              <div className="phone-choices">
                {contactNumbers.map((n) => (
                  <button
                    type="button"
                    key={n}
                    className={phone === n ? 'tag-chip tiny selected' : 'tag-chip tiny'}
                    onClick={() => setPhone(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}
          {phoneHint && <p className="field-hint">{phoneHint}</p>}
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

        <div className="field">
          <span>Members (optional: add names, or just the counts below)</span>
          <div className="inline-add member-add">
            <input
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              placeholder="Member name"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMember())}
            />
            <button type="button" className="btn btn-small" onClick={addMember}>
              <Plus size={14} weight="bold" /> Add
            </button>
            {showContactButtons && (
              <button
                type="button"
                className="btn btn-small"
                onClick={pickMembers}
                disabled={picking}
                title="Pick members from phone contacts"
                aria-label="Pick members from phone contacts"
              >
                <AddressBook size={16} weight="bold" />
                <span className="contacts-btn-label">Contacts</span>
              </button>
            )}
          </div>
          {memberHint && <p className="field-hint">{memberHint}</p>}
          {members.length > 0 && (
            <ul className="member-pills">
              {members.map((m, i) => {
                const effectiveTags = memberTags[m] ?? selectedTags
                return (
                  <li key={i} className="member-pill-row">
                    <div className="member-pill-head">
                      <span>{m}</span>
                      <button
                        type="button"
                        onClick={() => removeMember(i, m)}
                        aria-label={`Remove ${m}`}
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                    {selectedTags.length > 0 && (
                      <div className="member-tag-chips">
                        {selectedTags.map((t) => (
                          <button
                            type="button"
                            key={t}
                            className={
                              effectiveTags.includes(t) ? 'tag-chip tiny selected' : 'tag-chip tiny'
                            }
                            onClick={() => toggleMemberTag(m, t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                )
              })}
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
                Total guests: <strong>{guestTotal}</strong>
              </p>
            </div>
          )}
          {members.length === 0 && selectedTags.length > 0 && (
            <div className="tag-count-split">
              <span className="field-subtitle">
                How many attend each function? Leave blank for everyone.
              </span>
              {selectedTags.map((t) => (
                <label key={t} className="tag-count-row">
                  <span className="tag-count-row-label">{t}</span>
                  <input
                    type="number"
                    min="0"
                    max={guestTotal || undefined}
                    inputMode="numeric"
                    value={tagCounts[t] ?? ''}
                    onChange={(e) =>
                      setTagCounts((prev) => ({
                        ...prev,
                        [t]: e.target.value === '' ? undefined : e.target.value,
                      }))
                    }
                    placeholder="all"
                  />
                </label>
              ))}
            </div>
          )}
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : family ? 'Save Changes' : 'Add Family'}
          </button>
        </div>
      </form>
    </div>
  )
}
