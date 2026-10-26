import { useEffect, useMemo, useState } from 'react'
import { Plus, SignOut } from '@phosphor-icons/react'
import { subscribe } from './lib/store.js'
import { logout, watchSession } from './lib/auth.js'
import { takeSharedContact } from './lib/share.js'
import Dashboard from './components/Dashboard.jsx'
import FamilyList from './components/FamilyList.jsx'
import FamilyForm from './components/FamilyForm.jsx'
import Login from './components/Login.jsx'
import InstallButton from './components/InstallButton.jsx'

const EMPTY_FILTERS = { search: '', city: null, tag: null, gift: null, cardStatus: null }

export default function App() {
  // undefined while Firebase restores a saved login, then a session or null.
  const [session, setSession] = useState(undefined)
  const [families, setFamilies] = useState([])
  const [tab, setTab] = useState('dashboard') // 'dashboard' | 'list'
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editing, setEditing] = useState(null) // null | 'new' | family object
  // A contact shared into the app from the phone's Contacts app: held until
  // the user is logged in, then opened as a pre-filled new family.
  const [pendingShare, setPendingShare] = useState(null)
  const [draft, setDraft] = useState(null)

  useEffect(() => watchSession(setSession), [])
  useEffect(() => {
    takeSharedContact().then((contact) => contact && setPendingShare(contact))
  }, [])
  useEffect(() => {
    if (!session || !pendingShare) return
    setDraft(pendingShare)
    setPendingShare(null)
    setEditing('new')
  }, [session, pendingShare])

  // Subscribe to just this side's guest list, so Husain's and Zainab's
  // families never load each other's data.
  // Keyed on the side, not the session object, which Firebase recreates on
  // every auth event.
  const side = session?.side
  useEffect(() => {
    if (!side) {
      setFamilies([])
      return
    }
    return subscribe(side, setFamilies)
  }, [side])

  const cities = useMemo(
    () => [...new Set(families.map((f) => f.city.trim()).filter(Boolean))].sort(),
    [families]
  )
  const tags = useMemo(
    () => [...new Set(families.flatMap((f) => f.tags || []))].sort(),
    [families]
  )

  if (session === undefined) {
    return <div className="login-page" />
  }

  if (!session) {
    return <Login onLogin={setSession} />
  }

  function openListWithFilter(patch) {
    setFilters({ ...EMPTY_FILTERS, ...patch })
    setTab('list')
  }

  async function handleLogout() {
    await logout()
    setSession(null)
    setTab('dashboard')
    setFilters(EMPTY_FILTERS)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="polaroid polaroid-mini" aria-hidden="true">
              <img src="/couple-art2.jpeg" alt="" />
            </span>
            <div className="brand-text">
              <h1 className="brand-names">Husain &amp; Zainab</h1>
              <p className="brand-side">{session.label}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <InstallButton className="icon-btn" labelClassName="icon-btn-label" />
            <button className="icon-btn" onClick={handleLogout} title="Logout" aria-label="Logout">
              <SignOut size={18} />
              <span className="icon-btn-label">Logout</span>
            </button>
          </div>
        </div>
        <div className="topbar-inner">
          <nav className="tabs">
            <button
              className={tab === 'dashboard' ? 'tab active' : 'tab'}
              aria-current={tab === 'dashboard' ? 'page' : undefined}
              onClick={() => setTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={tab === 'list' ? 'tab active' : 'tab'}
              aria-current={tab === 'list' ? 'page' : undefined}
              onClick={() => setTab('list')}
            >
              Families
            </button>
          </nav>
          <button className="btn btn-primary btn-add" onClick={() => setEditing('new')}>
            <Plus size={16} weight="bold" />
            <span>
              Add<span className="btn-add-more"> family</span>
            </span>
          </button>
        </div>
      </header>

      <main className="content">
        {tab === 'dashboard' ? (
          <Dashboard families={families} onDrillDown={openListWithFilter} />
        ) : (
          <FamilyList
            families={families}
            cities={cities}
            tags={tags}
            filters={filters}
            setFilters={setFilters}
            onEdit={(f) => setEditing(f)}
          />
        )}
      </main>

      {editing && (
        <FamilyForm
          family={editing === 'new' ? null : editing}
          initial={editing === 'new' ? draft : null}
          side={session.side}
          cities={cities}
          tags={tags}
          onClose={() => {
            setEditing(null)
            setDraft(null)
          }}
        />
      )}
    </div>
  )
}
