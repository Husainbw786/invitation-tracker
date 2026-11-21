import { useEffect, useMemo, useRef, useState } from 'react'
import { CaretLeft, GearSix, Plus, X } from '@phosphor-icons/react'
import { subscribe } from './lib/store.js'
import { logout, watchSession } from './lib/auth.js'
import { canEditEvent, roleIn, subscribeMyEvents, subscribeMyInvites } from './lib/events.js'
import { wordsFor } from './lib/eventTypes.js'
import { migrateLegacyList } from './lib/migrate.js'
import { takeSharedContact } from './lib/share.js'
import AuthScreen from './components/AuthScreen.jsx'
import EventList from './components/EventList.jsx'
import EventCreate from './components/EventCreate.jsx'
import EventSettings from './components/EventSettings.jsx'
import Dashboard from './components/Dashboard.jsx'
import GuestList, { EMPTY_FILTERS } from './components/GuestList.jsx'
import GuestForm from './components/GuestForm.jsx'
import EventIcon from './components/EventArt.jsx'

// The open event lives in the address (#/e/<id>), so the phone's back button
// goes from an event back to My Events.
function eventIdFromHash() {
  const m = window.location.hash.match(/^#\/e\/([^/?#]+)/)
  return m ? decodeURIComponent(m[1]) : null
}

const LAST_EVENT = 'invitations:lastEvent'

function remember(id) {
  try {
    if (id) localStorage.setItem(LAST_EVENT, id)
    else localStorage.removeItem(LAST_EVENT)
  } catch {
    // private mode: nothing to remember
  }
}

function recall() {
  try {
    return localStorage.getItem(LAST_EVENT)
  } catch {
    return null
  }
}

export default function App() {
  // undefined while Firebase restores a saved login, then a session or null.
  const [session, setSession] = useState(undefined)
  const [events, setEvents] = useState(null) // null while loading
  const [invites, setInvites] = useState([])
  const [eventId, setEventId] = useState(eventIdFromHash)
  const [guests, setGuests] = useState([])
  const [tab, setTab] = useState('dashboard') // 'dashboard' | 'list'
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editing, setEditing] = useState(null) // null | 'new' | guest object
  const [creating, setCreating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notice, setNotice] = useState('')
  // A contact shared into the app from the phone's Contacts app: held until
  // an event the user can edit is open, then opened as a pre-filled new row.
  const [pendingShare, setPendingShare] = useState(null)
  const [draft, setDraft] = useState(null)
  // Whether the open event was reached from My Events in this visit, so the
  // back arrow can use the browser's back (and the phone's back button stays
  // in step) instead of stacking a new entry.
  const cameFromHome = useRef(false)
  const autoOpened = useRef(false)

  useEffect(() => watchSession(setSession), [])
  useEffect(() => {
    takeSharedContact().then((contact) => contact && setPendingShare(contact))
  }, [])
  useEffect(() => {
    const onHash = () => setEventId(eventIdFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Keyed on the uid, not the session object, which changes on every auth event.
  const uid = session?.uid
  useEffect(() => {
    setEvents(null)
    autoOpened.current = false // a new sign-in lands on its own last event
    if (!uid) return
    return subscribeMyEvents(uid, setEvents)
  }, [uid])

  // Invitations are only visible to verified emails (see firestore.rules).
  const inviteEmail = session?.emailVerified ? session.email : null
  useEffect(() => {
    setInvites([])
    if (!inviteEmail) return
    return subscribeMyInvites(inviteEmail, setInvites)
  }, [inviteEmail])

  // The two original wedding accounts get their old list moved into an event
  // the first time they sign in (see migrate.js). Everyone else: no-op.
  useEffect(() => {
    if (!session) return
    let cancelled = false
    migrateLegacyList(session).then((result) => {
      if (cancelled || !result) return
      if (result.count !== undefined) {
        setNotice(
          `Your list of ${result.count} ${result.count === 1 ? 'family' : 'families'} is now its own event below. Nothing was lost; it works the same as before.`
        )
      }
      if (!eventIdFromHash() && !recall()) remember(result.eventId)
    })
    return () => {
      cancelled = true
    }
    // Once per account, not per session object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const event = useMemo(() => events?.find((e) => e.id === eventId) || null, [events, eventId])

  function openEvent(id, { replace = false } = {}) {
    remember(id)
    const hash = id ? `#/e/${encodeURIComponent(id)}` : '#/'
    cameFromHome.current = Boolean(id) && !replace && !eventIdFromHash()
    if (replace) window.history.replaceState(null, '', hash)
    else window.location.hash = hash
    setEventId(id)
    setTab('dashboard')
    setFilters(EMPTY_FILTERS)
  }

  function goHome() {
    remember(null)
    if (cameFromHome.current) {
      cameFromHome.current = false
      window.history.back() // the hashchange listener clears eventId
    } else {
      openEvent(null, { replace: true })
    }
  }

  // On start: land on the last opened event. Any time: leave a link to an
  // event that is gone or no longer shared with this account.
  useEffect(() => {
    if (!events) return
    if (!autoOpened.current) {
      autoOpened.current = true
      const last = recall()
      if (!eventIdFromHash() && last && events.some((e) => e.id === last)) {
        openEvent(last, { replace: true })
        return
      }
    }
    if (eventId && !events.some((e) => e.id === eventId)) {
      openEvent(null, { replace: true })
      remember(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, eventId])

  // Guests of the open event only.
  const openId = event?.id
  useEffect(() => {
    setGuests([])
    if (!openId) return
    return subscribe(openId, setGuests)
  }, [openId])

  const canEdit = event && uid ? canEditEvent(event, uid) : false
  const words = useMemo(() => wordsFor(event), [event])

  // A shared contact goes into the open event, or the only event the user
  // can edit. With several, it waits on My Events until one is opened.
  useEffect(() => {
    if (!pendingShare || !events) return
    if (event && canEdit) {
      setDraft(pendingShare)
      setPendingShare(null)
      setEditing('new')
      return
    }
    if (!event) {
      const editable = events.filter((e) => canEditEvent(e, uid))
      if (editable.length === 1) openEvent(editable[0].id)
      else if (editable.length === 0) {
        setPendingShare(null)
        setNotice('Create an event first, then share the contact again.')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShare, events, event, canEdit])

  const cities = useMemo(() => [...new Set(guests.map((f) => f.city.trim()).filter(Boolean))].sort(), [guests])
  const usedTags = useMemo(() => [...new Set(guests.flatMap((f) => f.tags || []))].sort(), [guests])
  const formTags = useMemo(() => [...new Set([...words.tagPresets, ...usedTags])], [words, usedTags])

  if (session === undefined) {
    return <div className="blank-page" />
  }

  if (!session) {
    return <AuthScreen onSession={setSession} />
  }

  async function handleLogout() {
    await logout()
    setSession(null)
    openEvent(null, { replace: true })
    remember(null)
  }

  const noticeBar = notice && (
    <div className="toast" role="status">
      <span>{notice}</span>
      <button className="close-btn close-btn-small" onClick={() => setNotice('')} aria-label="Dismiss">
        <X size={14} weight="bold" />
      </button>
    </div>
  )

  // A link to an event while the list of events is still loading: wait on
  // a blank page instead of flashing My Events.
  if (!event && eventId && events === null) {
    return <div className="blank-page" />
  }

  if (!event) {
    return (
      <>
        <EventList
          session={session}
          events={events}
          invites={invites}
          pendingShare={pendingShare}
          onOpen={(id) => openEvent(id)}
          onCreate={() => setCreating(true)}
          onLogout={handleLogout}
          onSession={setSession}
        />
        {creating && (
          <EventCreate
            session={session}
            onClose={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false)
              openEvent(id)
            }}
          />
        )}
        {noticeBar}
      </>
    )
  }

  const role = roleIn(event, uid)

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-row">
          <button className="icon-btn" onClick={goHome} title="My events" aria-label="Back to my events">
            <CaretLeft weight="bold" />
          </button>
          <EventIcon event={event} size="sm" />
          <div className="topbar-title">
            <h1>{event.name}</h1>
            <p>
              {event.subtitle || (role === 'owner' ? 'your event' : `you are ${role === 'viewer' ? 'viewing' : 'helping'}`)}
            </p>
          </div>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="Event settings" aria-label="Event settings">
            <GearSix />
          </button>
        </div>
        <nav className="tabs">
          <button
            className={tab === 'dashboard' ? 'tab active' : 'tab'}
            aria-current={tab === 'dashboard' ? 'page' : undefined}
            onClick={() => setTab('dashboard')}
          >
            Overview
          </button>
          <button
            className={tab === 'list' ? 'tab active' : 'tab'}
            aria-current={tab === 'list' ? 'page' : undefined}
            onClick={() => setTab('list')}
          >
            {words.Many}
          </button>
        </nav>
      </header>

      <main className="content">
        {tab === 'dashboard' ? (
          <Dashboard
            event={event}
            words={words}
            guests={guests}
            canEdit={canEdit}
            onDrillDown={(patch) => {
              setFilters({ ...EMPTY_FILTERS, ...patch })
              setTab('list')
            }}
          />
        ) : (
          <GuestList
            event={event}
            words={words}
            guests={guests}
            cities={cities}
            tags={usedTags}
            filters={filters}
            setFilters={setFilters}
            canEdit={canEdit}
            onEdit={(f) => setEditing(f)}
          />
        )}
      </main>

      {canEdit && (
        <button className="fab" onClick={() => setEditing('new')}>
          <Plus weight="bold" /> Add {words.one}
        </button>
      )}

      {editing && canEdit && (
        <GuestForm
          eventId={event.id}
          words={words}
          guest={editing === 'new' ? null : editing}
          initial={editing === 'new' ? draft : null}
          cities={cities}
          tags={formTags}
          onClose={() => {
            setEditing(null)
            setDraft(null)
          }}
        />
      )}

      {settingsOpen && (
        <EventSettings
          event={event}
          session={session}
          guestCount={guests.length}
          onClose={() => setSettingsOpen(false)}
          onGone={() => {
            setSettingsOpen(false)
            openEvent(null, { replace: true })
            remember(null)
          }}
        />
      )}
      {noticeBar}
    </div>
  )
}
