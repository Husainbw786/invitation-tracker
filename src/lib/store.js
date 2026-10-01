// Data layer for the app. The same API works in both modes, so no component
// needs to know which one is active:
//   - Cloud mode (Supabase): shared across every device, live-synced.
//   - Local mode: this browser's localStorage only.
//
// Every subscription is scoped to one side ('husain' | 'zainab'), so a side
// only ever fetches its own guest list.

import { supabase, supabaseEnabled, TABLE } from './supabase.js'

const STORAGE_KEY = 'wedding-invites:families:v2'

// Postgres uses snake_case, the app uses camelCase. Mapped in one place so
// adding a field means adding one line here plus one column in the table.
const COLUMN = {
  side: 'side',
  name: 'name',
  city: 'city',
  phone: 'phone',
  members: 'members',
  memberTags: 'member_tags',
  tagCounts: 'tag_counts',
  tags: 'tags',
  maleCount: 'male_count',
  femaleCount: 'female_count',
  childCount: 'child_count',
  memberCount: 'member_count',
  gift: 'gift',
  cardStatus: 'card_status',
  notes: 'notes',
}

function fromRow(r) {
  return {
    id: r.id,
    side: r.side,
    name: r.name || '',
    city: r.city || '',
    phone: r.phone || '',
    members: r.members || [],
    memberTags: r.member_tags || {},
    tagCounts: r.tag_counts || {},
    tags: r.tags || [],
    maleCount: r.male_count,
    femaleCount: r.female_count,
    childCount: r.child_count,
    memberCount: r.member_count,
    gift: Boolean(r.gift),
    cardStatus: r.card_status || 'pending',
    notes: r.notes || '',
    createdAt: r.created_at ? new Date(r.created_at).getTime() : 0,
  }
}

// Only maps keys that are present, so partial updates stay partial.
// `id` and `created_at` are owned by the database and never written.
function toRow(obj) {
  const row = {}
  for (const [key, value] of Object.entries(obj)) {
    const col = COLUMN[key]
    if (col) row[col] = value
  }
  return row
}

// Active reload functions, one per subscription. Called after every local
// write so the UI updates instantly even if realtime is not enabled.
let loaders = new Set()

function reloadAll() {
  loaders.forEach((load) => load())
}

// ---------------------------------------------------------------- local mode

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Failed to load saved data', e)
    return []
  }
}

function saveLocal(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  reloadAll()
}

function sortByCreated(list) {
  return [...list].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
}

// ---------------------------------------------------------------- public API

/**
 * Watch one side's families. Calls fn(families) with the current list and
 * again on every change. Returns an unsubscribe function.
 */
export function subscribe(side, fn) {
  if (!side) {
    fn([])
    return () => {}
  }

  let cancelled = false

  if (supabaseEnabled) {
    // Writes and realtime events can each trigger a reload, so several
    // fetches may be in flight at once. Only the newest one may update the
    // UI, otherwise a slow, older response could overwrite fresh data.
    let latest = 0
    const load = async () => {
      const seq = ++latest
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('side', side)
        .order('created_at', { ascending: true })
      if (cancelled || seq !== latest) return
      if (error) {
        console.error('Supabase load failed', error.message)
        return
      }
      fn(data.map(fromRow))
    }

    loaders.add(load)
    load()

    // Any change to the table triggers a refetch of just this side's rows.
    // Refetching (rather than patching from the payload) keeps deletes and
    // partial updates correct with no extra edge cases.
    // The channel name must be unique per subscription: removeChannel() is
    // async, so re-subscribing right away (React StrictMode, logout/login)
    // would otherwise get back the old, already-subscribed channel, and
    // calling .on() on it throws.
    const channel = supabase
      .channel(`families-${side}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, load)
      .subscribe()

    // Phones suspend background tabs and drop the realtime socket, so
    // changes made meanwhile on another device would be missed. Refetch
    // whenever the app comes back into view.
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      loaders.delete(load)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }

  const load = () => {
    if (!cancelled) fn(sortByCreated(loadLocal().filter((f) => f.side === side)))
  }
  loaders.add(load)
  load()
  // Keep other open tabs of this browser in sync too.
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) load()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    cancelled = true
    loaders.delete(load)
    window.removeEventListener('storage', onStorage)
  }
}

export async function addFamily(data) {
  if (supabaseEnabled) {
    const { error } = await supabase.from(TABLE).insert(toRow(data))
    if (error) {
      console.error('Could not add family', error.message)
      alert('Could not save this family. Check your internet connection.')
      return null
    }
    reloadAll()
    return data
  }
  const family = {
    ...data,
    id: 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: Date.now(),
  }
  saveLocal([...loadLocal(), family])
  return family
}

export async function updateFamily(id, patch) {
  if (supabaseEnabled) {
    const { error } = await supabase.from(TABLE).update(toRow(patch)).eq('id', id)
    if (error) {
      console.error('Could not update family', error.message)
      alert('Could not save that change. Check your internet connection.')
      return false
    }
    reloadAll()
    return true
  }
  saveLocal(loadLocal().map((f) => (f.id === id ? { ...f, ...patch } : f)))
  return true
}

export async function deleteFamily(id) {
  if (supabaseEnabled) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) {
      console.error('Could not delete family', error.message)
      alert('Could not delete that family. Check your internet connection.')
      return false
    }
    reloadAll()
    return true
  }
  saveLocal(loadLocal().filter((f) => f.id !== id))
  return true
}

// ---------------------------------------------------------------- counting

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
