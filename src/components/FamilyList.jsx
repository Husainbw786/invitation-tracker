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
  ArrowRight,
  X,
  Check,
  CaretDown,
  GenderMale,
  GenderFemale,
  Baby,
} from '@phosphor-icons/react'
import {
  updateFamily,
  deleteFamily,
  effectiveCount,
  countBreakdown,
  tagAttendance,
  CARD_STATUSES,
  CARD_STATUS_LABELS,
} from '../lib/store.js'

const STATUS_FILTER_LABELS = { ...CARD_STATUS_LABELS, 'not-delivered': 'Not delivered yet' }

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

function nextStatus(status) {
  const i = CARD_STATUSES.indexOf(status)
  return CARD_STATUSES[(i + 1) % CARD_STATUSES.length]
}

function exportCsv(families) {
  const header = [
    'Family',
    'City',
    'Phone',
    'Guests',
    'Men',
    'Women',
    'Children',
    'Members',
    'Tags',
    'Gift',
    'Card Status',
    'Notes',
  ]
  const rows = families.map((f) => {
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
      f.gift ? 'Yes' : 'No',
      CARD_STATUS_LABELS[f.cardStatus] || f.cardStatus,
      f.notes || '',
    ]
  })
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'wedding-invitations.csv'
  // Firefox only downloads from links that are in the document, and revoking
  // the URL straight after click() can cancel the download in Safari.
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

function printChecklist(families) {
  const byCity = {}
  for (const f of families) {
    const city = f.city.trim() || 'Unknown'
    ;(byCity[city] ??= []).push(f)
  }
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const sections = Object.entries(byCity)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([city, list]) => `
      <h2>${esc(city)} <span class="count">${list.length} families</span></h2>
      <table>
        <tr><th></th><th>Family</th><th>Guests</th><th>M</th><th>W</th><th>C</th><th>Phone</th><th>Gift</th><th>Card status</th></tr>
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
              <td>${f.gift ? 'Yes' : 'No'}</td>
              <td>${esc(CARD_STATUS_LABELS[f.cardStatus] || f.cardStatus)}</td>
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
  w.document.write(`<!doctype html><html><head><title>Invitation Checklist</title>
    <style>
      body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 24px; color: #2a2421; }
      h1 { font-size: 22px; color: #2f4f7f; }
      h2 { font-size: 16px; margin: 24px 0 8px; color: #2f4f7f; }
      h2 .count { font-size: 12px; color: #6a5e55; font-weight: 400; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #d8cbb8; padding: 7px 9px; text-align: left; }
      th { background: #f4eee4; }
      .box { font-size: 17px; text-align: center; width: 30px; }
      .notes { color: #6a5e55; font-size: 11px; font-style: italic; }
      .legend { font-size: 11px; color: #6a5e55; margin-top: 4px; }
    </style></head><body>
    <h1>Invitation delivery checklist</h1>
    <p class="legend">M = men, W = women, C = children</p>${sections}
    <script>window.onload = () => window.print()</scr` + `ipt></body></html>`)
  w.document.close()
}

export default function FamilyList({ families, cities, tags, filters, setFilters, onEdit }) {
  const [expanded, setExpanded] = useState(null)

  const filtered = families.filter((f) => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const haystack = [f.name, f.city, f.phone, f.notes, ...(f.members || []), ...(f.tags || [])]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    if (filters.city && f.city.trim() !== filters.city) return false
    if (filters.tag && !(f.tags || []).includes(filters.tag)) return false
    if (filters.gift === true && !f.gift) return false
    if (filters.cardStatus === 'not-delivered' && f.cardStatus === 'delivered') return false
    if (
      filters.cardStatus &&
      filters.cardStatus !== 'not-delivered' &&
      f.cardStatus !== filters.cardStatus
    )
      return false
    return true
  })

  const totalGuests = filtered.reduce((s, f) => s + effectiveCount(f), 0)

  function set(patch) {
    setFilters({ ...filters, ...patch })
  }

  const hasActiveFilters =
    filters.search || filters.city || filters.tag || filters.gift || filters.cardStatus

  return (
    <div className="family-list rise">
      <div className="filter-bar">
        <label className="search-wrap">
          <MagnifyingGlass className="i" size={18} />
          <input
            type="search"
            className="search-input"
            aria-label="Search families"
            placeholder="Search family, member, city or phone"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </label>
        <div className="filter-row">
          {/* Each pill shows the chosen value; the real <select> sits invisibly on
              top, so the pill is only as wide as its text, not its longest option. */}
          <span className={filters.city ? 'select-pill active' : 'select-pill'}>
            <span className="select-pill-text">{filters.city || 'City'}</span>
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
            <span className="select-pill-text">
              {STATUS_FILTER_LABELS[filters.cardStatus] || 'Status'}
            </span>
            <CaretDown className="i" size={13} weight="bold" />
            <select
              aria-label="Filter by card status"
              value={filters.cardStatus || ''}
              onChange={(e) => set({ cardStatus: e.target.value || null })}
            >
              <option value="">Any card status</option>
              {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </span>
          <label className={filters.gift ? 'chip-toggle on' : 'chip-toggle'}>
            <input
              type="checkbox"
              checked={filters.gift === true}
              onChange={(e) => set({ gift: e.target.checked ? true : null })}
            />
            {filters.gift ? <Check size={14} weight="bold" /> : <Gift size={14} />} Gifts
          </label>
        </div>
      </div>

      <div className="list-meta">
        <div className="list-summary">
          <span className="list-count">
            {plural(filtered.length, 'family', 'families')} · {plural(totalGuests, 'guest')}
          </span>
          {hasActiveFilters && (
            <button
              className="link-btn"
              onClick={() =>
                setFilters({ search: '', city: null, tag: null, gift: null, cardStatus: null })
              }
            >
              Clear filters <X size={13} weight="bold" />
            </button>
          )}
        </div>
        <span className="list-actions">
          <button className="btn btn-small" onClick={() => printChecklist(filtered)}>
            <Printer size={15} /> Print
          </button>
          <button
            className="btn btn-small"
            onClick={() => exportCsv(filtered)}
            title="Export as CSV"
          >
            <DownloadSimple size={15} /> CSV
          </button>
        </span>
      </div>

      {filtered.length === 0 && (
        <p className="empty-hint">No families match. Try clearing filters, or add a new family.</p>
      )}

      <ul className="cards">
        {filtered.map((f) => {
          const isOpen = expanded === f.id
          const count = effectiveCount(f)
          const breakdown = countBreakdown(f)
          const meta = [f.city, plural(count, 'guest'), f.gift && 'gift'].filter(Boolean)
          return (
            <li key={f.id} className={isOpen ? 'family-card open' : 'family-card'}>
              <button
                className="family-head"
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : f.id)}
              >
                <span className="family-title">
                  <span className="family-name">{f.name}</span>
                  <span className="family-meta">{meta.join(' · ')}</span>
                </span>
                <span className={`stamp stamp-${f.cardStatus}`}>
                  {CARD_STATUS_LABELS[f.cardStatus]}
                </span>
              </button>

              <div className="quick-actions">
                <button
                  className="btn btn-small btn-soft"
                  onClick={() => updateFamily(f.id, { cardStatus: nextStatus(f.cardStatus) })}
                  title="Advance card status"
                >
                  Card: {CARD_STATUS_LABELS[f.cardStatus]} <ArrowRight size={14} weight="bold" />
                </button>
                <button
                  className={f.gift ? 'btn btn-small btn-soft btn-gift on' : 'btn btn-small btn-soft btn-gift'}
                  onClick={() => updateFamily(f.id, { gift: !f.gift })}
                >
                  <Gift size={14} weight={f.gift ? 'fill' : 'regular'} /> Gift: {f.gift ? 'Yes' : 'No'}
                </button>
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
                          <Users size={14} /> {breakdown.total} guests (not split)
                        </span>
                      ) : (
                        <>
                          {breakdown.male > 0 && (
                            <span className="bd-item">
                              <GenderMale size={14} weight="bold" /> {breakdown.male} men
                            </span>
                          )}
                          {breakdown.female > 0 && (
                            <span className="bd-item">
                              <GenderFemale size={14} weight="bold" /> {breakdown.female} women
                            </span>
                          )}
                          {breakdown.child > 0 && (
                            <span className="bd-item">
                              <Baby size={14} weight="bold" /> {breakdown.child} children
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
                  <div className="detail-actions">
                    <button className="btn btn-small" onClick={() => onEdit(f)}>
                      <PencilSimple size={14} /> Edit
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => {
                        if (confirm(`Delete "${f.name}" from the list?`)) deleteFamily(f.id)
                      }}
                    >
                      <Trash size={14} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
