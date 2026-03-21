import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// 원형 프로그레스 컴포넌트
function CircularProgress({ rate }: { rate: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (rate / 100) * circ
  return (
    <div className="relative w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5ddd0" strokeWidth="8"/>
        <circle cx="48" cy="48" r={r} fill="none" stroke="#2563eb" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" style={{transition: 'stroke-dashoffset 0.6s ease'}}/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-blue-600">{rate}%</span>
      </div>
    </div>
  )
}

export default function Home({ setTab }: { setTab: (tab: string) => void }) {
  const [todos, setTodos] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const todayLabel = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: todoData }, { data: habitData }, { data: logData }] = await Promise.all([
        supabase.from('todos').select('*').eq('user_id', user.id).eq('is_completed', false).order('position', { ascending: true }),
        supabase.from('habits').select('*').eq('user_id', user.id).order('position', { ascending: true }),
        supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', today)
      ])
      if (todoData) setTodos(todoData)
      if (habitData) setHabits(habitData)
      if (logData) setLogs(logData)
    }
    fetchAll()
  }, [])

  const habitDoneCount = logs.length
  const habitRate = habits.length > 0 ? Math.round((habitDoneCount / habits.length) * 100) : 0

  const messages = ['Keep the streak! 🔥', 'You\'re on fire! 💪', 'Great work! ⭐', 'Stay consistent! 🎯']
  const message = messages[Math.floor(habitRate / 25)] || messages[0]

  return (
    <div className="px-6 py-4 space-y-5">
      {/* 인사말 */}
      <div>
        <p className="text-sm text-gray-400 font-medium">{todayLabel}</p>
        <h2 className="text-3xl font-bold text-gray-900 mt-1 font-display">안녕하세요! 👋</h2>
      </div>

      {/* 할 일 카드 */}
      <div className="rounded-2xl p-5" style={{background: '#fff', borderLeft: '4px solid #2563eb'}}>
        <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">TASKS TODAY</p>
        <p className="text-5xl font-bold text-blue-600">{String(todos.length).padStart(2, '0')}</p>
        <p className="text-sm text-gray-400 mt-1">Items remaining for today</p>
        <button onClick={() => setTab('todo')}
          className="mt-3 text-sm font-semibold text-blue-600 flex items-center gap-1 hover:gap-2 transition-all">
          View all tasks →
        </button>
      </div>

      {/* 습관 달성률 카드 */}
      <div className="rounded-2xl p-5 flex items-center justify-between" style={{background: '#fff', borderLeft: '4px solid #ef4444'}}>
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">HABIT COMPLETION</p>
          <p className="text-gray-500 text-sm">{message}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-display">Keep the<br/>streak</p>
        </div>
        <CircularProgress rate={habitRate} />
      </div>

      {/* 남은 할 일 */}
      {todos.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-900 font-display">Upcoming Tasks</h3>
            <button onClick={() => setTab('todo')} className="text-sm font-semibold text-blue-600">See all</button>
          </div>
          <div className="space-y-2">
            {todos.slice(0, 3).map(todo => (
              <div key={todo.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800 flex-1">{todo.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 오늘의 습관 */}
      {habits.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-gray-900 font-display">Daily Habits</h3>
            <button onClick={() => setTab('habit')} className="text-sm font-semibold text-blue-600">Manage</button>
          </div>
          <div className="space-y-2">
            {habits.slice(0, 5).map(habit => {
              const done = logs.some(l => l.habit_id === habit.id)
              const colors = ['#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b']
              const colorIdx = habits.indexOf(habit) % colors.length
              return (
                <div key={habit.id} className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm"
                  style={{borderLeft: `4px solid ${colors[colorIdx]}`}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{background: '#f5f0e8'}}>
                    {habit.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{habit.title}</p>
                    <p className="text-xs text-gray-400">{done ? 'Completed' : 'Not started yet'}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-green-500' : 'bg-gray-100'}`}>
                    {done && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 모두 완료 */}
      {todos.length === 0 && habitRate === 100 && habits.length > 0 && (
        <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
          <p className="text-4xl mb-2">🎉</p>
          <p className="font-bold text-gray-800">오늘 모든 목표 달성!</p>
          <p className="text-xs text-gray-400 mt-1">Perfect day!</p>
        </div>
      )}
    </div>
  )
}