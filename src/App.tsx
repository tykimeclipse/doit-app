import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Todo from './pages/Todo'
import Habit from './pages/Habit'
import Stats from './pages/Stats'
import Planner from './pages/Planner'


function App() {
  const [session, setSession] = useState<any>(null)
  const [tab, setTab] = useState('home')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (!session) return <Auth />

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${tab === 'planner' ? 'max-w-5xl' : 'max-w-lg'} mx-auto`}>
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600 cursor-pointer" onClick={() => setTab('home')}>Do:It 🚀</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-gray-400 hover:text-red-400"
        >
          로그아웃
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && <Home />}
        {tab === 'todo' && <Todo />}
        {tab === 'habit' && <Habit />}
        {tab === 'stats' && <Stats />}
        {tab === 'planner' && <Planner />}
      </main>

      {/* 하단 탭바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex">
        {[
          { id: 'home', label: '홈', icon: '🏠' },
          { id: 'todo', label: '할 일', icon: '✅' },
          { id: 'habit', label: '습관', icon: '🔄' },
          { id: 'planner', label: '플래너', icon: '📅' },
          { id: 'stats', label: '통계', icon: '📊'},
          
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 py-3 flex flex-col items-center text-xs font-medium transition-all ${
              tab === item.id ? 'text-indigo-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App