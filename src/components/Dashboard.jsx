import {
  Users,
  UsersThree,
  Gift,
  Envelope,
  MapPin,
  Tag,
  Confetti,
} from '@phosphor-icons/react'
import { effectiveCount } from '../lib/store.js'

export default function Dashboard({ families, onDrillDown }) {
  const totalFamilies = families.length
  const totalMembers = families.reduce((sum, f) => sum + effectiveCount(f), 0)
  const giftCount = families.filter((f) => f.gift).length
  const delivered = families.filter((f) => f.cardStatus === 'delivered').length
  const pendingCards = totalFamilies - delivered

  const byCity = {}
  for (const f of families) {
    const city = f.city.trim() || 'Unknown'
    byCity[city] ??= { families: 0, members: 0, delivered: 0 }
    byCity[city].families += 1
    byCity[city].members += effectiveCount(f)
    if (f.cardStatus === 'delivered') byCity[city].delivered += 1
  }

  const byTag = {}
  for (const f of families) {
    for (const tag of f.tags || []) {
      byTag[tag] = (byTag[tag] || 0) + 1
    }
  }

  return (
    <div className="dashboard rise">
      <section className="hero">
        <span className="hero-photo">
          <img src="/couple-sticker.jpeg" alt="Husain and Zainab" />
        </span>
        <div className="hero-text">
          <p className="hero-script">Our Wedding</p>
          <p className="hero-sub">Every invitation, kept in one beautiful place</p>
        </div>
        <span className="hero-photo hero-photo-right">
          <img src="/couple-art1.jpeg" alt="Husain and Zainab" />
        </span>
      </section>

      <section className="stat-grid">
        <button className="stat-card" onClick={() => onDrillDown({})}>
          <span className="stat-icon">
            <Users size={20} weight="duotone" />
          </span>
          <span className="stat-value">{totalFamilies}</span>
          <span className="stat-label">Families Invited</span>
        </button>
        <div className="stat-card">
          <span className="stat-icon">
            <UsersThree size={20} weight="duotone" />
          </span>
          <span className="stat-value">{totalMembers}</span>
          <span className="stat-label">Total Guests</span>
        </div>
        <button className="stat-card" onClick={() => onDrillDown({ gift: true })}>
          <span className="stat-icon">
            <Gift size={20} weight="duotone" />
          </span>
          <span className="stat-value">{giftCount}</span>
          <span className="stat-label">Gifts To Give</span>
        </button>
        <button
          className="stat-card"
          onClick={() => onDrillDown({ cardStatus: 'not-delivered' })}
        >
          <span className="stat-icon">
            <Envelope size={20} weight="duotone" />
          </span>
          <span className="stat-value">
            {delivered}
            <small> / {totalFamilies}</small>
          </span>
          <span className="stat-label">Cards Delivered ({pendingCards} left)</span>
        </button>
      </section>

      {families.length === 0 && (
        <p className="empty-hint">
          <Confetti className="empty-icon i" size={30} weight="duotone" />
          <br />
          No families added yet. Tap <strong>Add Family</strong> above to start your list.
        </p>
      )}

      <section>
        <h2 className="section-title">
          <MapPin size={17} weight="fill" /> Cities
        </h2>
        {Object.keys(byCity).length === 0 ? (
          <p className="empty-hint">Cities appear here automatically as you add families.</p>
        ) : (
          <div className="city-grid">
            {Object.entries(byCity)
              .sort((a, b) => b[1].families - a[1].families)
              .map(([city, s]) => (
                <button
                  key={city}
                  className="city-card"
                  onClick={() => onDrillDown({ city })}
                >
                  <div className="city-card-head">
                    <MapPin size={16} weight="fill" />
                    <h3>{city}</h3>
                  </div>
                  <p>
                    <strong>{s.families}</strong> families, <strong>{s.members}</strong>{' '}
                    guests
                  </p>
                  <p className="city-cards-line">
                    {s.delivered}/{s.families} cards delivered
                  </p>
                  <div className="progress">
                    <div
                      className="progress-fill"
                      style={{ width: `${(s.delivered / s.families) * 100}%` }}
                    />
                  </div>
                </button>
              ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">
          <Tag size={16} weight="fill" /> Tags
        </h2>
        <div className="tag-cloud">
          {Object.entries(byTag)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => (
              <button
                key={tag}
                className="tag-chip"
                onClick={() => onDrillDown({ tag })}
              >
                {tag} <span className="tag-count">{count}</span>
              </button>
            ))}
          {Object.keys(byTag).length === 0 && (
            <p className="empty-hint">No tags yet. Add your own tags while creating a family.</p>
          )}
        </div>
      </section>
    </div>
  )
}
