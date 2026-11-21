import { useState } from 'react'
import {
  MagnifyingGlass,
  Printer,
  DownloadSimple,
  Users,
  Gift,
  Phone,
  PencilSimple,
  Trash,
  CaretRight,
  X,
  Check,
  CaretDown,
  GenderMale,
  GenderFemale,
  Baby,
} from '@phosphor-icons/react'
import {
  NO_CITY,
  updateGuest,
  deleteGuest,
  effectiveCount,
  countBreakdown,
  tagAttendance,
} from '../lib/store.js'
import { nextStep, plural, stepLabel, stepOf, stepTone } from '../lib/eventTypes.js'

export const EMPTY_FILTERS = { search: '', city: null, tag: null, gift: null, cardStatus: null }

// "Ayaan & Sara" -> "ayaan-sara", for file names.
function slug(text) {
  return (
    String(text)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'guest-list'
  )
}

function exportCsv(event, words, rows) {
  const header = [
    words.One,
    'City',
    'Phone',
    words.headMany[0].toUpperCase() + words.headMany.slice(1),
    'Men',
    'Women',
    'Children',
    'Members',
    'Tags',
    ...(words.giftsOn ? [words.gift] : []),
    'Status',
    'Notes',
  ]
  const lines = rows.map((f) => {
    const b = countBreakdown(f)
    return [
      f.name,
      f.city,
      f.phone || '',
      effectiveCount(f),
      b.male || '',
      b.female || '',
      b.child || '',
      (f.members || []).join('; '),
      (f.tags || []).join('; '),
      ...(words.giftsOn ? [f.gift ? 'Yes' : 'No'] : []),
      stepLabel(words, f.cardStatus),
      f.notes || '',
    ]
  })
  const csv = [header, ...lines]
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${slug(event.name)}-guests.csv`
  // Firefox only downloads from links that are in the document, and revoking
  // the URL straight after click() can cancel the download in Safari.
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function printChecklist(event, words, rows) {
  const byCity = {}
  for (const f of rows) {
    const city = f.city.trim() || 'No city'
    ;(byCity[city] ??= []).push(f)
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const sections = Object.entries(byCity)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([city, list]) => `
      <h2>${esc(city)} <span class="count">${esc(plural(list.length, words.one, words.many))}</span></h2>
      <table>
        <tr><th></th><th>${esc(words.One)}</th><th>${esc(words.headMany)}</th><th>M</th><th>W</th><th>C</th><th>Phone</th>${
          words.giftsOn ? `<th>${esc(words.gift)}</th>` : ''
        }<th>Status</th></tr>
        ${list
          .map((f) => {
            const b = countBreakdown(f)
            return `<tr>
              <td class="box">&#9744;</td>
              <td>${esc(f.name)}${f.notes ? `<div class="notes">${esc(f.notes)}</div>` : ''}</td>
              <td>${effectiveCount(f)}</td>
              <td>${b.male || '-'}</td>
              <td>${b.female || '-'}</td>
              <td>${b.child || '-'}</td>
              <td>${esc(f.phone || '-')}</td>
              ${words.giftsOn ? `<td>${f.gift ? 'Yes' : 'No'}</td>` : ''}
              <td>${esc(stepLabel(words, f.cardStatus))}</td>
            </tr>`
          })
          .join('')}
      </table>`
    )
    .join('')
  const w = window.open('', '_blank')
  if (!w) {
    alert('Please allow pop-ups for this site to print the checklist.')
    return
  }
  w.document.write(`<!doctype html><html><head><title>${esc(event.name)} · checklist</title>
    <style>
      body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 24px; color: #29261b; }
      h1 { font-size: 22px; font-family: Georgia, serif; font-weight: 500; }
      h2 { font-size: 16px; margin: 24px 0 8px; color: #c15f3c; }
      h2 .count { font-size: 12px; color: #6f6b5e; font-weight: 400; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #e3dfd3; padding: 7px 9px; text-align: left; }
      th { background: #f1eee6; }
      .box { font-size: 17px; text-align: center; width: 30px; }
      .notes { color: #6f6b5e; font-size: 11px; font-style: italic; }
      .legend { font-size: 11px; color: #6f6b5e; margin-top: 4px; }
    </style></head><body>
    <h1>${esc(event.name)} · invitation checklist</h1>
    <p class="legend">M = men, W = women, C = children</p>${sections}
    <script>window.onload = () => window.print()</scr` + `ipt></body></html>`)
  w.document.close()
}

export default function GuestList({ event, words, guests, cities, tags, filters, setFilters, onEdit, canEdit }) {
  const [expanded, setExpanded] = useState(null)
  const statusFilterLabels = {
    ...Object.fromEntries(words.steps.map((s) => [s.id, s.label])),
    'not-done': `Not ${words.doneVerb} yet`,
  }
  const hasNoCity = guests.some((f) => !f.city.trim())

  const filtered = guests.filter((f) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const haystack = [f.name, f.city, f.phone, f.notes, ...(f.members || []), ...(f.tags || [])]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (filters.city === NO_CITY && f.city.trim()) return false
    if (filters.city && filters.city !== NO_CITY && f.city.trim() !== filters.city) return false
    if (filters.tag && !(f.tags || []).includes(filters.tag)) return false
    if (filters.gift === true && !f.gift) return false
    const step = stepOf(words, f.cardStatus)
    if (filters.cardStatus === 'not-done' && step === words.done.id) return false
    if (filters.cardStatus && filters.cardStatus !== 'not-done' && step !== filters.cardStatus) return false
    return true
  })

  const totalPeople = filtered.reduce((s, f) => s + effectiveCount(f), 0)

  function set(patch) {
    setFilters({ ...filters, ...patch })
  }

  const hasActiveFilters = filters.search || filters.city || filters.tag || filters.gift || filters.cardStatus

  return (
    <div className="family-list rise">
      <div className="filter-bar">
        <label className="search-wrap">
          <MagnifyingGlass className="i" size={18} />
          <input
            type="search"
            className="search-input"
            aria-label={`Search ${words.many}`}
            placeholder={`Search ${words.one}, member, city or phone`}
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </label>
        <div className="filter-row">
          {/* Each pill shows the chosen value; the real <select> sits invisibly on
              top, so the pill is only as wide as its text, not its longest option. */}
          <span className={filters.city ? 'select-pill active' : 'select-pill'}>
            <span className="select-pill-text">
              {filters.city === NO_CITY ? 'No city' : filters.city || 'City'}
            </span>
            <CaretDown className="i" size={13} weight="bold" />
            <select
              aria-label="Filter by city"
              value={filters.city || ''}
              onChange={(e) => set({ city: e.target.value || null })}
            >
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
              {(hasNoCity || filters.city === NO_CITY) && <option value={NO_CITY}>No city</option>}
            </select>
          </span>
          <span className={filters.tag ? 'select-pill active' : 'select-pill'}>
            <span className="select-pill-text">{filters.tag || 'Tag'}</span>
            <CaretDown className="i" size={13} weight="bold" />
            <select
              aria-label="Filter by tag"
              value={filters.tag || ''}
              onChange={(e) => set({ tag: e.target.value || null })}
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </span>
          <span className={filters.cardStatus ? 'select-pill active' : 'select-pill'}>
            <span className="select-pill-text">{statusFilterLabels[filters.cardStatus] || 'Status'}</span>
            <CaretDown className="i" size={13} weight="bold" />
            <select
              aria-label="Filter by status"
              value={filters.cardStatus || ''}
              onChange={(e) => set({ cardStatus: e.target.value || null })}
            >
              <option value="">Any status</option>
              {Object.entries(statusFilterLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </span>
          {words.giftsOn && (
            <label className={filters.gift ? 'chip-toggle on' : 'chip-toggle'}>
              <input
                type="checkbox"
                checked={filters.gift === true}
                onChange={(e) => set({ gift: e.target.checked ? true : null })}
              />
              {filters.gift ? <Check size={14} weight="bold" /> : <Gift size={14} />} {words.gifts}
            </label>
          )}
        </div>
      </div>

      <div className="list-meta">
        <div className="list-summary">
          <span className="list-count">
            {plural(filtered.length, words.one, words.many)} · {plural(totalPeople, words.headOne, words.headMany)}
          </span>
          {hasActiveFilters && (
            <button className="link-btn" onClick={() => setFilters(EMPTY_FILTERS)}>
              Clear filters <X size={13} weight="bold" />
            </button>
          )}
        </div>
        <span className="list-actions">
          <button className="btn btn-small btn-ghost" onClick={() => printChecklist(event, words, filtered)}>
            <Printer size={15} /> Print
          </button>
          <button className="btn btn-small btn-ghost" onClick={() => exportCsv(event, words, filtered)} title="Export as CSV">
            <DownloadSimple size={15} /> CSV
          </button>
        </span>
      </div>

      {filtered.length === 0 && (
        <p className="empty-hint">
          No {words.many} match.{' '}
          {canEdit ? `Try clearing filters, or add a new ${words.one}.` : 'Try clearing filters.'}
        </p>
      )}

      <ul className="rows">
        {filtered.map((f) => {
          const isOpen = expanded === f.id
          const count = effectiveCount(f)
          const breakdown = countBreakdown(f)
          const meta = [
            f.city,
            plural(count, words.headOne, words.headMany),
            words.giftsOn && f.gift && words.gift.toLowerCase(),
          ].filter(Boolean)
          return (
            <li key={f.id} className={isOpen ? 'family-card open' : 'family-card'}>
              <div className="guest-line">
                <button className="row" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : f.id)}>
                  <span className="row-text">
                    <span className="row-title">{f.name}</span>
                    <span className="row-meta">{meta.join(' · ')}</span>
                  </span>
                </button>
                {canEdit ? (
                  <button
                    className={`status status-${stepTone(words, f.cardStatus)}`}
                    onClick={() => updateGuest(event.id, f.id, { cardStatus: nextStep(words, f.cardStatus) })}
                    title="Tap to move to the next step"
                    aria-label={`${stepLabel(words, f.cardStatus)}. Move ${f.name} to ${stepLabel(words, nextStep(words, f.cardStatus))}`}
                  >
                    {stepLabel(words, f.cardStatus)} <CaretRight weight="bold" />
                  </button>
                ) : (
                  <span className={`status status-${stepTone(words, f.cardStatus)}`}>{stepLabel(words, f.cardStatus)}</span>
                )}
              </div>

              {isOpen && (
                <div className="family-detail">
                  {f.phone && (
                    <a className="detail-phone" href={`tel:${f.phone.replaceAll(' ', '')}`}>
                      <Phone size={15} /> {f.phone}
                    </a>
                  )}
                  {f.members && f.members.length > 0 && (
                    <p className="member-list-line">
                      <strong>Members:</strong>{' '}
                      {f.members.map((m, i) => {
                        const explicit = f.memberTags?.[m]
                        return (
                          <span key={i}>
                            {m}
                            {explicit !== undefined && (
                              <span className="member-tag-note">
                                {explicit.length ? ` (${explicit.join(', ')})` : ' (no functions)'}
                              </span>
                            )}
                            {i < f.members.length - 1 ? ', ' : ''}
                          </span>
                        )
                      })}
                    </p>
                  )}
                  {!f.members?.length && breakdown.total > 0 && (
                    <p className="detail-breakdown">
                      {breakdown.untyped ? (
                        <span className="bd-item">
                          <Users size={14} /> {breakdown.total} {words.headMany} (not split)
                        </span>
                      ) : (
                        <>
                          {breakdown.male > 0 && (
                            <span className="bd-item">
                              <GenderMale size={14} weight="bold" /> {plural(breakdown.male, 'man', 'men')}
                            </span>
                          )}
                          {breakdown.female > 0 && (
                            <span className="bd-item">
                              <GenderFemale size={14} weight="bold" /> {plural(breakdown.female, 'woman', 'women')}
                            </span>
                          )}
                          {breakdown.child > 0 && (
                            <span className="bd-item">
                              <Baby size={14} weight="bold" /> {plural(breakdown.child, 'child', 'children')}
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  )}
                  {(f.tags || []).length > 0 && (
                    <p className="detail-tags">
                      {f.tags.map((t) => {
                        const att = tagAttendance(f, t)
                        return (
                          <span key={t} className="tag-chip small">
                            {t}
                            {att !== count ? ` · ${att}` : ''}
                          </span>
                        )
                      })}
                    </p>
                  )}
                  {f.notes && <p className="notes">{f.notes}</p>}
                  {canEdit && (
                    <div className="detail-actions">
                      {words.giftsOn && (
                        <button
                          className={f.gift ? 'btn btn-small btn-soft btn-gift on' : 'btn btn-small btn-soft btn-gift'}
                          onClick={() => updateGuest(event.id, f.id, { gift: !f.gift })}
                        >
                          <Gift size={14} weight={f.gift ? 'fill' : 'regular'} /> {words.gift}: {f.gift ? 'Yes' : 'No'}
                        </button>
                      )}
                      <button className="btn btn-small btn-soft" onClick={() => onEdit(f)}>
                        <PencilSimple size={14} /> Edit
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => {
                          if (confirm(`Delete "${f.name}" from the list?`)) deleteGuest(event.id, f.id)
                        }}
                      >
                        <Trash size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
