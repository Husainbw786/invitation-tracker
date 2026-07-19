import { useState } from 'react'
import {
  updateFamily,
  deleteFamily,
  effectiveCount,
  CARD_STATUSES,
  CARD_STATUS_LABELS,
} from '../lib/store.js'

function nextStatus(status) {
  const i = CARD_STATUSES.indexOf(status)
  return CARD_STATUSES[(i + 1) % CARD_STATUSES.length]
}

function exportCsv(families) {
  const header = ['Family', 'City', 'Phone', 'Guests', 'Members', 'Tags', 'Gift', 'Card Status', 'Notes']
  const rows = families.map((f) => [
    f.name,
    f.city,
    f.phone || '',
    effectiveCount(f),
    (f.members || []).join('; '),
    (f.tags || []).join('; '),
    f.gift ? 'Yes' : 'No',
    CARD_STATUS_LABELS[f.cardStatus] || f.cardStatus,
    f.notes || '',
  ])
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'wedding-invitations.csv'
  a.click()
  URL.revokeObjectURL(a.href)
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
      <h2>📍 ${esc(city)} — ${list.length} families</h2>
      <table>
        <tr><th></th><th>Family</th><th>Guests</th><th>Phone</th><th>Gift</th><th>Card status</th></tr>
        ${list
          .map(
            (f) => `<tr>
              <td class="box">☐</td>
              <td>${esc(f.name)}${f.notes ? `<div class="notes">${esc(f.notes)}</div>` : ''}</td>
              <td>${effectiveCount(f)}</td>
              <td>${esc(f.phone || '—')}</td>
              <td>${f.gift ? '🎁 Yes' : 'No'}</td>
              <td>${esc(CARD_STATUS_LABELS[f.cardStatus] || f.cardStatus)}</td>
            </tr>`
          )
          .join('')}
      </table>`
    )
    .join('')
  const w = window.open('', '_blank')
  w.document.write(`<!doctype html><html><head><title>Invitation Checklist — Husain ♥ Zainab</title>
    <style>
      body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 24px; color: #222; }
      h1 { font-size: 20px; } h2 { font-size: 16px; margin: 22px 0 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #fce4ec; }
      .box { font-size: 16px; text-align: center; width: 30px; }
      .notes { color: #777; font-size: 11px; font-style: italic; }
    </style></head><body>
    <h1>💍 Invitation delivery checklist</h1>${sections}
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
    if (filters.city && f.city !== filters.city) return false
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
    <div className="family-list">
      <div className="filter-bar">
        <input
          type="search"
          className="search-input"
          placeholder="🔍 Search family, member, city…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
        />
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
            🎁 Gift only
          </label>
        </div>
      </div>

      <div className="list-meta">
        <span>
          <strong>{filtered.length}</strong> families · <strong>{totalGuests}</strong> guests
          {hasActiveFilters && (
            <button className="link-btn" onClick={() => setFilters({ search: '', city: null, tag: null, gift: null, cardStatus: null })}>
              Clear filters ✕
            </button>
          )}
        </span>
        <span className="list-actions">
          <button className="btn btn-small" onClick={() => printChecklist(filtered)}>
            🖨 Print
          </button>
          <button className="btn btn-small" onClick={() => exportCsv(filtered)}>
            ⬇ Export CSV
          </button>
        </span>
      </div>

      {filtered.length === 0 && (
        <p className="empty-hint">No families match. Try clearing filters or add a new family.</p>
      )}

      <ul className="cards">
        {filtered.map((f) => {
          const isOpen = expanded === f.id
          return (
            <li key={f.id} className="family-card">
              <button className="family-head" onClick={() => setExpanded(isOpen ? null : f.id)}>
                <div className="family-title">
                  <h3>{f.name}</h3>
                  <p>
                    📍 {f.city} · 👥 {effectiveCount(f)} guest{effectiveCount(f) > 1 ? 's' : ''}
                    {f.gift && ' · 🎁'}
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
                  title="Change card status"
                >
                  Card: {CARD_STATUS_LABELS[f.cardStatus]} →
                </button>
                <button
                  className={f.gift ? 'btn btn-small btn-gift on' : 'btn btn-small btn-gift'}
                  onClick={() => updateFamily(f.id, { gift: !f.gift })}
                >
                  🎁 Gift: {f.gift ? 'Yes' : 'No'}
                </button>
              </div>

              {isOpen && (
                <div className="family-detail">
                  {f.phone && (
                    <p>
                      📞 <a href={`tel:${f.phone.replaceAll(' ', '')}`}>{f.phone}</a>
                    </p>
                  )}
                  {f.members && f.members.length > 0 && (
                    <p>
                      👥 <strong>Members:</strong> {f.members.join(', ')}
                    </p>
                  )}
                  {!f.members?.length && f.memberCount > 0 && (
                    <p>
                      👥 <strong>Members:</strong> {f.memberCount} (count only)
                    </p>
                  )}
                  {(f.tags || []).length > 0 && (
                    <p className="detail-tags">
                      {f.tags.map((t) => (
                        <span key={t} className="tag-chip small">
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                  {f.notes && <p className="notes">📝 {f.notes}</p>}
                  <div className="detail-actions">
                    <button className="btn btn-small" onClick={() => onEdit(f)}>
                      ✏️ Edit
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => {
                        if (confirm(`Delete "${f.name}" from the list?`)) deleteFamily(f.id)
                      }}
                    >
                      🗑 Delete
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
