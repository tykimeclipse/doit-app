import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Todo from './pages/Todo'
import Habit from './pages/Habit'
import Stats from './pages/Stats'

function App() {
  const [session, setSession] = useState<any>(null)
  const [tab, setTab] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_e, session) => setSession(session))
  }, [])

  if (!session) return <Auth />

  const tabs = [
    { id: 'home', label: 'HOME', icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#2563eb' : 'none'} stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )},
    { id: 'todo', label: 'TASKS', icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="2">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    )},
    { id: 'habit', label: 'HABITS', icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    )},
    { id: 'stats', label: 'REPORTS', icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#2563eb' : '#9ca3af'} strokeWidth="2">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )},
  ]

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto" style={{background: '#F5F0E8'}}>
      {/* 헤더 */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setTab('home')}>
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">D</div>
          <span className="text-lg font-semibold text-gray-800">Do:It</span>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{background: '#ede8df'}}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
        </button>
      </header>

      {/* 메인 */}
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === 'home' && <Home setTab={setTab} />}
        {tab === 'todo' && <Todo />}
        {tab === 'habit' && <Habit />}
        {tab === 'stats' && <Stats />}
      </main>

      {/* 하단 탭바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg flex py-3 px-4"
        style={{background: '#F5F0E8', borderTop: '1px solid #e5ddd0'}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex flex-col items-center gap-1 transition-all">
            {t.icon(tab === t.id)}
            <span className={`text-xs font-semibold tracking-wider ${tab === t.id ? 'text-blue-600' : 'text-gray-400'}`}>
              {t.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App