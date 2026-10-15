import { useEffect, useMemo, useState } from 'react'
import { Plus, SignOut, Heart } from '@phosphor-icons/react'
import { subscribe } from './lib/store.js'
import { logout, watchSession } from './lib/auth.js'
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

  useEffect(() => watchSession(setSession), [])

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
            <span className="brand-photo-wrap">
              <img src="/couple-art1.jpeg" alt="Couple" className="brand-photo" />
            </span>
            <div>
              <h1 className="brand-names">
                Husain
                <Heart className="brand-heart i" size={20} weight="fill" />
                Zainab
              </h1>
              <p>{session.label}</p>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <Plus size={17} weight="bold" /> Add Family
            </button>
            <InstallButton className="logout-btn" labelClassName="logout-text" />
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <SignOut size={16} />
              <span className="logout-text">Logout</span>
            </button>
          </div>
        </div>
        <nav className="tabs">
          <button
            className={tab === 'dashboard' ? 'tab active' : 'tab'}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={tab === 'list' ? 'tab active' : 'tab'}
            onClick={() => setTab('list')}
          >
            Families
          </button>
        </nav>
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
          side={session.side}
          cities={cities}
          tags={tags}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
