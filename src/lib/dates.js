// Event dates are stored as 'YYYY-MM-DD' strings (from <input type="date">)
// and read as the user's local day.

function localDay(date) {
  const d = new Date(`${date}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "Sat, 14 Feb 2027", or '' for no date. */
export function formatDate(date, options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!date) return ''
  const d = localDay(date)
  return d ? d.toLocaleDateString(undefined, options) : date
}

/** "today", "tomorrow", "12 days to go", or '' when it is past or unset. */
export function daysToGo(date) {
  const day = date && localDay(date)
  if (!day) return ''
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((day - today) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days > 1) return `${days} days to go`
  return ''
}

/** The last moment of a day, in milliseconds, or null for no date. */
export function endOfDay(date) {
  const day = date && localDay(date)
  if (!day) return null
  day.setHours(23, 59, 59, 999)
  return day.getTime()
}
