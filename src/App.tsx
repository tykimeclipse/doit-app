import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Auth from './pages/Auth'
import Home from './pages/Home'
import Todo from './pages/Todo'
import Habit from './pages/Habit'
import Stats from './pages/Stats'
import Planner from './pages/Planner'
import ResetPassword from './pages/ResetPassword'
import Students from './pages/Students'

interface StudentInfo {
  id: string
  name: string
  email: string
  created_at: string
}

interface Profile {
  name: string
  student_code: string
  role: string
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [tab, setTab] = useState('home')
  const [isRecovery, setIsRecovery] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setIsRecovery(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkRole(session.user.id)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkRole(session.user.id)
      else setProfile(null)
    })
  }, [])

  const checkRole = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, name, student_code')
      .eq('id', userId)
      .single()
    if (data) {
      setProfile(data)
      if (data.role === 'teacher') setIsTeacher(true)
    }
  }

  if (isRecovery) return <ResetPassword />
  if (!session) return <Auth />

  const tabs = [
    { id: 'home', label: '홈', icon: '🏠' },
    { id: 'todo', label: '할 일', icon: '✅' },
    { id: 'habit', label: '습관', icon: '🔥' },
    { id: 'planner', label: '플래너', icon: '📅' },
    { id: 'stats', label: '통계', icon: '📊' },
    ...(isTeacher ? [{ id: 'students', label: '학생', icon: '👨‍🏫' }] : []),
  ]

  const viewUserId = selectedStudent ? selectedStudent.id : session.user.id

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${tab === 'planner' ? 'max-w-5xl' : 'max-w-lg'} mx-auto`}>
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setTab('home'); setSelectedStudent(null) }}>
          <h1 className="text-xl font-bold text-indigo-600">DoIt 🚀</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 학생 보기 중일 때 표시 */}
          {selectedStudent && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                👤 {selectedStudent.name}
              </span>
              <button
                onClick={() => { setSelectedStudent(null); setTab('students') }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}
          {/* 이름(학생코드) 또는 로그아웃 */}
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs text-gray-500 hover:text-red-400 font-medium"
          >
            {profile?.name
              ? `${profile.name}${profile.student_code ? `(${profile.student_code})` : ''}`
              : '로그아웃'}
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && <Home userId={viewUserId} />}
        {tab === 'todo' && <Todo userId={viewUserId} />}
        {tab === 'habit' && <Habit userId={viewUserId} />}
        {tab === 'stats' && <Stats userId={viewUserId} />}
        {tab === 'planner' && <Planner userId={viewUserId} />}
        {tab === 'students' && (
          <Students onSelectStudent={(student) => {
            setSelectedStudent(student)
            setTab('home')
          }} />
        )}
      </main>

      {/* 하단 탭바 */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 flex">
        {tabs.map(item => (
          <button
            key={item.id}
            onClick={() => { setTab(item.id); setSelectedStudent(null) }}
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