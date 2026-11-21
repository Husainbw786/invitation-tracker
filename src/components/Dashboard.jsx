import { ArrowRight, Clock, Confetti, Gift, Users, UsersThree } from '@phosphor-icons/react'
import { NO_CITY, effectiveCount, countBreakdown, tagAttendance } from '../lib/store.js'
import { plural, stepOf } from '../lib/eventTypes.js'
import { formatDate } from './EventList.jsx'

// The hero's one-line summary of how the invitations are going.
function headline(words, done, total) {
  const left = total - done
  if (total === 0) return 'Your list starts here'
  if (left === 0 && total === 1) return `1 ${words.inviteWord} ${words.doneVerb}`
  if (left === 0) return `All ${plural(total, words.inviteWord)} ${words.doneVerb}`
  if (done === 0) return `${plural(left, words.inviteWord)} to go`
  return `${plural(done, words.inviteWord)} ${words.doneVerb}, ${left} to go`
}

function daysToGo(date) {
  if (!date) return ''
  const day = new Date(`${date}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((day - today) / 86400000)
  if (Number.isNaN(days)) return ''
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days > 1) return `${days} days to go`
  return ''
}

export default function Dashboard({ event, words, guests, canEdit, onDrillDown }) {
  const isDone = (f) => stepOf(words, f.cardStatus) === words.done.id
  const totalRows = guests.length
  const totalPeople = guests.reduce((sum, f) => sum + effectiveCount(f), 0)
  const giftCount = guests.filter((f) => f.gift).length
  const done = guests.filter(isDone).length
  const notDone = totalRows - done

  const people = { male: 0, female: 0, child: 0, untyped: 0 }
  for (const f of guests) {
    if (f.members?.length) {
      people.untyped += f.members.length
      continue
    }
    const b = countBreakdown(f)
    if (b.untyped) people.untyped += b.total
    else {
      people.male += b.male
      people.female += b.female
      people.child += b.child
      if (b.total === 0) people.untyped += 1
    }
  }
  const hasSplit = people.male + people.female + people.child > 0

  const byCity = {}
  for (const f of guests) {
    const city = f.city.trim() || NO_CITY
    byCity[city] ??= { rows: 0, people: 0, done: 0 }
    byCity[city].rows += 1
    byCity[city].people += effectiveCount(f)
    if (isDone(f)) byCity[city].done += 1
  }
  const showCities = words.cityRequired || guests.some((f) => f.city.trim())

  // Attendee headcount per tag (not just how many rows carry it), so
  // "mehndi" shows how many people are actually coming.
  const byTag = {}
  for (const f of guests) {
    for (const tag of f.tags || []) {
      byTag[tag] = (byTag[tag] || 0) + tagAttendance(f, tag)
    }
  }

  const countdown = daysToGo(event.date)
  const where = [formatDate(event.date), event.venue].filter(Boolean).join(' · ')
  const pct = totalRows ? Math.round((done / totalRows) * 100) : 0

  return (
    <div className="dashboard rise">
      <section className="hero-card">
        <div className="hero-top">
          <span className="hero-label">
            {words.InviteWord}s {words.doneVerb}
          </span>
          {countdown && <span className="hero-chip">{countdown}</span>}
        </div>
        <p className="hero-number">
          {done}
          <span className="hero-of"> / {totalRows}</span>
        </p>
        <div
          className="progress"
          role="img"
          aria-label={`${done} of ${totalRows} ${words.inviteWords} ${words.doneVerb}`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="hero-foot">{totalRows ? headline(words, done, totalRows) : where || headline(words, 0, 0)}</p>
        {totalRows > 0 && where && <p className="hero-foot">{where}</p>}
      </section>

      {guests.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">
            <Confetti weight="duotone" />
          </span>
          <h3>Your list is empty</h3>
          <p>
            {canEdit ? (
              <>
                Tap <strong>Add {words.one}</strong> to start your list.
              </>
            ) : (
              <>Nothing on this list yet.</>
            )}
          </p>
        </div>
      ) : (
        <>
          <section className="tiles">
            <button className={notDone ? 'tile tile-accent' : 'tile'} onClick={() => onDrillDown({ cardStatus: 'not-done' })}>
              <span className="tile-top">
                <Clock weight="duotone" />
                <ArrowRight weight="bold" />
              </span>
              <span className="tile-value">{notDone}</span>
              <span className="tile-label">Not {words.doneVerb} yet</span>
            </button>
            <button className="tile" onClick={() => onDrillDown({})}>
              <span className="tile-top">
                <Users weight="duotone" />
                <ArrowRight weight="bold" />
              </span>
              <span className="tile-value">{totalRows}</span>
              <span className="tile-label">{words.Many} invited</span>
            </button>
            <div className="tile">
              <span className="tile-top">
                <UsersThree weight="duotone" />
              </span>
              <span className="tile-value">{totalPeople}</span>
              <span className="tile-label">Total {words.headMany}</span>
            </div>
            {words.giftsOn && (
              <button className="tile" onClick={() => onDrillDown({ gift: true })}>
                <span className="tile-top">
                  <Gift weight="duotone" />
                  <ArrowRight weight="bold" />
                </span>
                <span className="tile-value">{giftCount}</span>
                <span className="tile-label">{words.gifts} to give</span>
              </button>
            )}
          </section>

          {hasSplit && (
            <section className="split" aria-label="Guest breakdown">
              <div className="split-cell">
                <strong>{people.male}</strong>
                <span>Men</span>
              </div>
              <div className="split-cell">
                <strong>{people.female}</strong>
                <span>Women</span>
              </div>
              <div className="split-cell">
                <strong>{people.child}</strong>
                <span>Children</span>
              </div>
              {people.untyped > 0 && (
                <div className="split-cell split-muted">
                  <strong>{people.untyped}</strong>
                  <span>Not split</span>
                </div>
              )}
            </section>
          )}

          {showCities && (
            <section className="section">
              <div className="section-head">
                <h2 className="section-title">Cities</h2>
                <span className="section-note">tap one for its list</span>
              </div>
              <ul className="rows">
                {Object.entries(byCity)
                  .sort((a, b) => b[1].rows - a[1].rows)
                  .map(([city, s]) => (
                    <li key={city}>
                      <button className="row" onClick={() => onDrillDown({ city })}>
                        <span className="row-text">
                          <span className="row-title">{city === NO_CITY ? 'No city' : city}</span>
                          <span className="row-meta">
                            {plural(s.rows, words.one, words.many)} · {plural(s.people, words.headOne, words.headMany)}
                          </span>
                        </span>
                        <span className="city-right">
                          <span className="city-count">
                            {s.done} / {s.rows} {words.doneVerb}
                          </span>
                          <span className="mini-progress">
                            <span style={{ width: `${(s.done / s.rows) * 100}%` }} />
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <section className="section">
            <div className="section-head">
              <h2 className="section-title">Tags</h2>
              <span className="section-note">
                {words.headMany}, not {words.many}
              </span>
            </div>
            {Object.keys(byTag).length === 0 ? (
              <p className="empty-hint">No tags yet. Add tags (like functions) while adding a {words.one}.</p>
            ) : (
              <div className="tag-cloud">
                {Object.entries(byTag)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tag, count]) => (
                    <button key={tag} className="tag-chip" onClick={() => onDrillDown({ tag })}>
                      {tag} <span className="tag-count">{count}</span>
                    </button>
                  ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
