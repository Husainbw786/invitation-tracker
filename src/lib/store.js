// Data layer: families are saved in the browser (localStorage).
// Data stays on the device it was entered on. It survives reloads
// and works offline.

const STORAGE_KEY = 'wedding-invites:families:v2'

let families = load()
let listeners = []

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load saved data', e)
  }
  return []
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(families))
  listeners.forEach((fn) => fn(families))
}

export function subscribe(fn) {
  listeners.push(fn)
  fn(families)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function addFamily(data) {
  const family = {
    ...data,
    id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: Date.now(),
  }
  families = [...families, family]
  persist()
  return family
}

export function updateFamily(id, patch) {
  families = families.map((f) => (f.id === id ? { ...f, ...patch } : f))
  persist()
}

export function deleteFamily(id) {
  families = families.filter((f) => f.id !== id)
  persist()
}

// Men / women / children split for a family.
// Families saved before this feature existed only had a single `memberCount`,
// so that value is reported as an untyped total instead of being lost.
export function countBreakdown(family) {
  const male = Number(family.maleCount) || 0
  const female = Number(family.femaleCount) || 0
  const child = Number(family.childCount) || 0
  const total = male + female + child
  if (total === 0 && Number(family.memberCount) > 0) {
    return { male: 0, female: 0, child: 0, total: Number(family.memberCount), untyped: true }
  }
  return { male, female, child, total, untyped: false }
}

// How many people a family counts for: listed member names, else the
// men/women/children split, else at least the head of the family (1).
export function effectiveCount(family) {
  if (family.members && family.members.length > 0) return family.members.length
  const { total } = countBreakdown(family)
  if (total > 0) return total
  return 1
}

// How many of a family's guests are attending a specific tag/function
// (e.g. "mehndi", "mamera"). Defaults to "everyone" until told otherwise:
//  - named members: a member with no explicit tag list is assumed to attend
//    every one of the family's tags; assigning tags to them overrides that.
//  - count-mode families: an unset tagCounts[tag] falls back to the full
//    family headcount; an explicit number (including 0) overrides it.
export function tagAttendance(family, tag) {
  if (!(family.tags || []).includes(tag)) return 0
  if (family.members && family.members.length > 0) {
    const mt = family.memberTags || {}
    return family.members.filter((m) => {
      const explicit = mt[m]
      if (explicit === undefined) return true
      return explicit.includes(tag)
    }).length
  }
  const tc = family.tagCounts || {}
  if (Object.prototype.hasOwnProperty.call(tc, tag)) return Number(tc[tag]) || 0
  return effectiveCount(family)
}

export const CARD_STATUSES = ['pending', 'written', 'delivered']

export const CARD_STATUS_LABELS = {
  pending: 'Pending',
  written: 'Card Written',
  delivered: 'Delivered',
}
