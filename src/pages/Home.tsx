import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function Home() {
  const [todos, setTodos] = useState<any[]>([])
  const [habits, setHabits] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  })

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: todoData } = await supabase
        .from('todos')
        .select('*')
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(5)
      if (todoData) setTodos(todoData)

      const { data: habitData } = await supabase
        .from('habits')
        .select('*')
      if (habitData) setHabits(habitData)

      const { data: logData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('date', today)
      if (logData) setLogs(logData)
    }
    fetchAll()
  }, [])

  const habitDoneCount = logs.length
  const habitRate = habits.length > 0 ? Math.round((habitDoneCount / habits.length) * 100) : 0

  return (
    <div className="p-6 space-y-6">
      {/* 인사말 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">안녕하세요! 👋</h2>
        <p className="text-gray-400 text-sm mt-1">{todayLabel}</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-2xl p-4">
          <p className="text-xs text-indigo-400 font-medium mb-1">오늘 할 일</p>
          <p className="text-3xl font-bold text-indigo-600">{todos.length}</p>
          <p className="text-xs text-indigo-400 mt-1">남은 항목</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-xs text-orange-400 font-medium mb-1">습관 달성률</p>
          <p className="text-3xl font-bold text-orange-500">{habitRate}%</p>
          <p className="text-xs text-orange-400 mt-1">{habitDoneCount} / {habits.length} 완료</p>
        </div>
      </div>

      {/* 습관 달성 프로그레스 */}
      {habits.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-700 mb-3">🔥 오늘의 습관</p>
          <div className="space-y-2">
            {habits.map(habit => {
              const done = logs.some(l => l.habit_id === habit.id)
              return (
                <div key={habit.id} className="flex items-center gap-3">
                  <span className="text-lg">{habit.icon}</span>
                  <span className={`flex-1 text-sm ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {habit.title}
                  </span>
                  <span>{done ? '✅' : '⬜'}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-orange-400 h-2 rounded-full transition-all"
              style={{ width: `${habitRate}%` }}
            />
          </div>
        </div>
      )}

      {/* 오늘 할 일 미리보기 */}
      {todos.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-700 mb-3">✅ 남은 할 일</p>
          <div className="space-y-2">
            {todos.map(todo => (
              <div key={todo.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{todo.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 모두 완료 */}
      {todos.length === 0 && habits.length > 0 && habitRate === 100 && (
        <div className="bg-green-50 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-green-600 font-bold">오늘 모든 할 일과 습관 완료!</p>
          <p className="text-green-400 text-sm mt-1">대단해요!</p>
        </div>
      )}
    </div>
  )
}