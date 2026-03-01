import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

interface Habit {
  id: string
  title: string
  icon: string
  color: string
  goal_count: number
}

interface HabitLog {
  habit_id: string
  count: number
}

export default function Habit() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const fetchHabits = async () => {
    const { data } = await supabase.from('habits').select('*').order('created_at', { ascending: true })
    if (data) setHabits(data)
  }

  const fetchLogs = async () => {
    const { data } = await supabase.from('habit_logs').select('*').eq('date', today)
    if (data) setLogs(data)
  }

  useEffect(() => {
    fetchHabits()
    fetchLogs()
  }, [])

  const addHabit = async () => {
    if (!title.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('habits').insert({
      title, icon, user_id: user?.id, goal_count: 1, color: '#6366f1'
    })
    setTitle('')
    setIcon('⭐')
    setShowForm(false)
    await fetchHabits()
    setLoading(false)
  }

  const toggleHabit = async (habit: Habit) => {
    const { data: { user } } = await supabase.auth.getUser()
    const log = logs.find(l => l.habit_id === habit.id)
    if (log) {
      await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('date', today)
    } else {
      await supabase.from('habit_logs').insert({
        habit_id: habit.id, user_id: user?.id, date: today, count: 1
      })
    }
    await fetchLogs()
  }

  const deleteHabit = async (id: string) => {
    await supabase.from('habits').delete().eq('id', id)
    await fetchHabits()
  }

  const isDone = (habitId: string) => logs.some(l => l.habit_id === habitId)

  const icons = ['⭐', '💪', '📚', '🏃', '💧', '🧘', '🎯', '✍️', '🥗', '😴']

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">습관 🔥</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          + 추가
        </button>
      </div>

      {/* 습관 추가 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <p className="text-sm font-medium text-gray-600 mb-3">아이콘 선택</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {icons.map(i => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={`text-xl p-2 rounded-lg ${icon === i ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
              >
                {i}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="습관 이름 입력..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={addHabit}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              저장
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 습관 목록 */}
      <div className="space-y-3">
        {habits.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">습관을 추가해보세요! 🔥</p>
        )}
        {habits.map(habit => (
          <div
            key={habit.id}
            className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border transition-all ${
              isDone(habit.id) ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'
            }`}
          >
            <button
              onClick={() => toggleHabit(habit)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                isDone(habit.id) ? 'bg-indigo-600' : 'bg-gray-100'
              }`}
            >
              {habit.icon}
            </button>
            <div className="flex-1">
              <p className={`text-sm font-medium ${isDone(habit.id) ? 'text-indigo-600' : 'text-gray-700'}`}>
                {habit.title}
              </p>
              <p className="text-xs text-gray-400">
                {isDone(habit.id) ? '✅ 오늘 완료!' : '오늘 아직 안 했어요'}
              </p>
            </div>
            <button
              onClick={() => deleteHabit(habit.id)}
              className="text-gray-300 hover:text-red-400 text-lg"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* 오늘 달성률 */}
      {habits.length > 0 && (
        <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-2">오늘 달성률</p>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${(logs.length / habits.length) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {logs.length} / {habits.length} 완료
          </p>
        </div>
      )}
    </div>
  )
}