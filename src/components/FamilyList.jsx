import { useState } from 'react'
import {
  MagnifyingGlass,
  Printer,
  DownloadSimple,
  MapPin,
  Users,
  Gift,
  Phone,
  PencilSimple,
  Trash,
  ArrowRight,
  X,
  Note,
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

function nextStatus(status) {
  const i = CARD_STATUSES.indexOf(status)
  return CARD_STATUSES[(i + 1) % CARD_STATUSES.length]
}

// Excel and Google Sheets treat a cell starting with = + - or @ as a formula,
// so a phone number like "+91 98200 11223" shows as an error (and a crafted
// value could run as a formula). A leading apostrophe forces plain text.
function csvCell(value) {
  let v = String(value)
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v
  return `"${v.replaceAll('"', '""')}"`
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
    .map((r) => r.map(csvCell).join(','))
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
      body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 24px; color: #3a2530; }
      h1 { font-size: 22px; color: #9d2249; }
      h2 { font-size: 16px; margin: 24px 0 8px; color: #9d2249; }
      h2 .count { font-size: 12px; color: #9a8088; font-weight: 400; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #e6c6ce; padding: 7px 9px; text-align: left; }
      th { background: #fbeef0; }
      .box { font-size: 17px; text-align: center; width: 30px; }
      .notes { color: #9a8088; font-size: 11px; font-style: italic; }
      .legend { font-size: 11px; color: #9a8088; margin-top: 4px; }
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
        <div className="search-wrap">
          <MagnifyingGlass className="i" size={18} />
          <input
            type="search"
            className="search-input"
            placeholder="Search family, member, or city"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
        <div className="filter-row">
          <select value={filters.city || ''} onChange={(e) => set({ city: e.target.value || null })}>
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={filters.tag || ''} onChange={(e) => set({ tag: e.target.value || null })}>
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={filters.cardStatus || ''}
            onChange={(e) => set({ cardStatus: e.target.value || null })}
          >
            <option value="">Any card status</option>
            <option value="pending">Pending</option>
            <option value="written">Card Written</option>
            <option value="delivered">Delivered</option>
            <option value="not-delivered">Not delivered yet</option>
          </select>
          <label className="gift-filter">
            <input
              type="checkbox"
              checked={filters.gift === true}
              onChange={(e) => set({ gift: e.target.checked ? true : null })}
            />
            <Gift size={16} weight="fill" /> Gift only
          </label>
        </div>
      </div>

      <div className="list-meta">
        <span>
          <strong>{filtered.length}</strong> families, <strong>{totalGuests}</strong> guests
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
        </span>
        <span className="list-actions">
          <button className="btn btn-small" onClick={() => printChecklist(filtered)}>
            <Printer size={15} /> Print
          </button>
          <button className="btn btn-small" onClick={() => exportCsv(filtered)}>
            <DownloadSimple size={15} /> Export CSV
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
          return (
            <li key={f.id} className="family-card">
              <button className="family-head" onClick={() => setExpanded(isOpen ? null : f.id)}>
                <div className="family-title">
                  <h3>{f.name}</h3>
                  <p>
                    <span className="meta-item">
                      <MapPin size={13} weight="fill" /> {f.city}
                    </span>
                    <span className="meta-item">
                      <Users size={13} weight="fill" /> {count} guest{count > 1 ? 's' : ''}
                    </span>
                    {f.gift && (
                      <span className="meta-item">
                        <Gift size={13} weight="fill" />
                      </span>
                    )}
                  </p>
                </div>
                <span className={`status-pill status-${f.cardStatus}`}>
                  {CARD_STATUS_LABELS[f.cardStatus]}
                </span>
              </button>

              <div className="quick-actions">
                <button
                  className="btn btn-small"
                  onClick={() => updateFamily(f.id, { cardStatus: nextStatus(f.cardStatus) })}
                  title="Advance card status"
                >
                  Card: {CARD_STATUS_LABELS[f.cardStatus]} <ArrowRight size={14} weight="bold" />
                </button>
                <button
                  className={f.gift ? 'btn btn-small btn-gift on' : 'btn btn-small btn-gift'}
                  onClick={() => updateFamily(f.id, { gift: !f.gift })}
                >
                  <Gift size={14} weight={f.gift ? 'fill' : 'regular'} /> Gift: {f.gift ? 'Yes' : 'No'}
                </button>
              </div>

              {isOpen && (
                <div className="family-detail">
                  {f.phone && (
                    <p>
                      <Phone size={15} weight="fill" />{' '}
                      <a href={`tel:${f.phone.replaceAll(' ', '')}`}>{f.phone}</a>
                    </p>
                  )}
                  {f.members && f.members.length > 0 && (
                    <p className="member-list-line">
                      <Users size={15} weight="fill" /> <strong>Members:</strong>{' '}
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
                          <Users size={14} weight="fill" /> {breakdown.total} guests (not split)
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
                  {f.notes && (
                    <p className="notes">
                      <Note size={15} /> {f.notes}
                    </p>
                  )}
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
