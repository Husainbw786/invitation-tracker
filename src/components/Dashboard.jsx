import { Confetti } from '@phosphor-icons/react'
import { effectiveCount, countBreakdown, tagAttendance } from '../lib/store.js'

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

// The hero's one-line summary of how the card deliveries are going.
function deliveryHeadline(delivered, total) {
  const left = total - delivered
  if (total === 0) return 'Your list starts here'
  if (left === 0) return total === 1 ? 'Your 1 card is delivered' : `All ${total} cards delivered`
  if (delivered === 0) return `${plural(left, 'card')} to go`
  // No-break space keeps "cards out," together, so the line breaks at the comma.
  return `${plural(delivered, 'card')} out, ${left} to go`
}

export default function Dashboard({ families, onDrillDown }) {
  const totalFamilies = families.length
  const totalMembers = families.reduce((sum, f) => sum + effectiveCount(f), 0)
  const giftCount = families.filter((f) => f.gift).length
  const delivered = families.filter((f) => f.cardStatus === 'delivered').length
  const pendingCards = totalFamilies - delivered

  const guests = { male: 0, female: 0, child: 0, untyped: 0 }
  for (const f of families) {
    if (f.members?.length) {
      guests.untyped += f.members.length
      continue
    }
    const b = countBreakdown(f)
    if (b.untyped) guests.untyped += b.total
    else {
      guests.male += b.male
      guests.female += b.female
      guests.child += b.child
      if (b.total === 0) guests.untyped += 1
    }
  }
  const hasSplit = guests.male + guests.female + guests.child > 0

  const byCity = {}
  for (const f of families) {
    const city = f.city.trim() || 'Unknown'
    byCity[city] ??= { families: 0, members: 0, delivered: 0 }
    byCity[city].families += 1
    byCity[city].members += effectiveCount(f)
    if (f.cardStatus === 'delivered') byCity[city].delivered += 1
  }

  // Attendee headcount per tag (not just how many families carry it), so
  // "mehndi" shows how many people are actually coming, not how many families.
  const byTag = {}
  for (const f of families) {
    for (const tag of f.tags || []) {
      byTag[tag] = (byTag[tag] || 0) + tagAttendance(f, tag)
    }
  }

  return (
    <div className="dashboard rise">
      <section className="hero">
        <div className="hero-text">
          <p className="hero-note">our wedding</p>
          <h2 className="hero-headline">{deliveryHeadline(delivered, totalFamilies)}</h2>
          {totalFamilies > 0 && (
            <div
              className="hero-progress"
              role="img"
              aria-label={`${delivered} of ${plural(totalFamilies, 'card')} delivered`}
            >
              {delivered > 0 && <span className="seg seg-done" style={{ flexGrow: delivered }} />}
              {pendingCards > 0 && <span className="seg" style={{ flexGrow: pendingCards }} />}
            </div>
          )}
        </div>
        <figure className="polaroid polaroid-hero">
          <img src="/couple-painting.jpeg" alt="Painted portrait of Husain and Zainab" />
          <figcaption>us</figcaption>
          <span className="tape" aria-hidden="true" />
        </figure>
      </section>

      <section className="stat-grid">
        <button className="stat-card" onClick={() => onDrillDown({})}>
          <span className="stat-value">{totalFamilies}</span>
          <span className="stat-label">Families invited</span>
        </button>
        <div className="stat-card">
          <span className="stat-value">{totalMembers}</span>
          <span className="stat-label">Total guests</span>
        </div>
        <button className="stat-card" onClick={() => onDrillDown({ gift: true })}>
          <span className="stat-value">{giftCount}</span>
          <span className="stat-label">Gifts to give</span>
        </button>
        <button
          className="stat-card"
          onClick={() => onDrillDown({ cardStatus: 'not-delivered' })}
        >
          <span className="stat-value">
            {delivered} <span className="stat-of">of {totalFamilies}</span>
          </span>
          <span className="stat-label">Cards delivered · {pendingCards} left</span>
        </button>
      </section>

      {hasSplit && (
        <section className="breakdown" aria-label="Guest breakdown">
          <div className="bd-cell">
            <strong>{guests.male}</strong>
            <span>Men</span>
          </div>
          <div className="bd-cell">
            <strong>{guests.female}</strong>
            <span>Women</span>
          </div>
          <div className="bd-cell">
            <strong>{guests.child}</strong>
            <span>Children</span>
          </div>
          {guests.untyped > 0 && (
            <div className="bd-cell bd-cell-muted">
              <strong>{guests.untyped}</strong>
              <span>Not split</span>
            </div>
          )}
        </section>
      )}

      {families.length === 0 && (
        <p className="empty-hint">
          <Confetti className="empty-icon i" size={30} weight="duotone" />
          <br />
          No families added yet. Tap <strong>Add family</strong> above to start your list.
        </p>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Cities</h2>
          <span className="section-note">tap one for the full list</span>
        </div>
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
                  <span className="city-name">{city}</span>
                  <span className="city-meta">
                    {plural(s.families, 'family', 'families')} · {plural(s.members, 'guest')}
                  </span>
                  <span className="progress">
                    <span
                      className="progress-fill"
                      style={{ width: `${(s.delivered / s.families) * 100}%` }}
                    />
                  </span>
                  <span className="city-note">
                    {s.delivered} of {s.families} delivered
                  </span>
                </button>
              ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Tags</h2>
          <span className="section-note">guests, not families</span>
        </div>
        <div className="tag-cloud">
          {Object.entries(byTag)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => (
              <button
                key={tag}
                className="tag-chip tag-chip-stat"
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
