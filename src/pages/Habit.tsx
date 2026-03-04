import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Habit {
  id: string
  title: string
  icon: string
  color: string
  goal_count: number
  position: number
}

interface HabitLog {
  habit_id: string
  count: number
}

interface HabitStreak {
  habit_id: string
  streak: number
}

function SortableHabit({ habit, isDone, streak, onToggle, onDelete }: {
  habit: Habit
  isDone: boolean
  streak: number
  onToggle: (habit: Habit) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border transition-all ${
        isDone ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'
      }`}
    >
      {/* 드래그 핸들 */}
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing px-1">
        ⠿
      </button>

      <button
        onClick={() => onToggle(habit)}
        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xl transition-all ${
          isDone ? 'bg-indigo-600' : 'bg-gray-100'
        }`}
      >
        {habit.icon}
      </button>

      <div className="flex-1">
        <p className={`text-sm font-medium ${isDone ? 'text-indigo-600' : 'text-gray-700'}`}>
          {habit.title}
        </p>
        <p className="text-xs text-gray-400">
          {isDone ? '✅ 완료' : '미완료'}
          {streak > 0 && <span className="text-orange-400 ml-2">🔥 {streak}일 연속</span>}
        </p>
      </div>

      <button onClick={() => onDelete(habit.id)} className="text-gray-300 hover:text-red-400 text-lg">
        ×
      </button>
    </div>
  )
}

export default function Habit() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [streaks, setStreaks] = useState<HabitStreak[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [weekLogs, setWeekLogs] = useState<{date: string, habit_id: string}[]>([])
  const [weekDates, setWeekDates] = useState<string[]>([])

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const sensors = useSensors(useSensor(PointerSensor))

  const fetchHabits = async () => {
    const { data } = await supabase.from('habits').select('*').order('position', { ascending: true })
    if (data) setHabits(data)
  }

  const fetchLogs = async () => {
    const { data } = await supabase.from('habit_logs').select('*').eq('date', today)
    if (data) setLogs(data)
  }
  const fetchWeekLogs = async () => {
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  setWeekDates(dates)
  const { data } = await supabase
    .from('habit_logs')
    .select('date, habit_id')
    .in('date', dates)
  if (data) setWeekLogs(data)
}
  
  useEffect(() => {
  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: habitData }, { data: logData }] = await Promise.all([
      supabase.from('habits').select('*').order('position', { ascending: true }),
      supabase.from('habit_logs').select('*').eq('date', today)
    ])
    if (habitData) setHabits(habitData)
    if (logData) setLogs(logData)

    // 스트릭은 habits ID 필요해서 같이 처리
    if (habitData) {
      const results = await Promise.all(
        habitData.map(async (h) => {
          const { data } = await supabase.rpc('get_habit_streak', {
            p_habit_id: h.id,
            p_user_id: user.id
          })
          return { habit_id: h.id, streak: data ?? 0 }
        })
      )
      setStreaks(results)
    }
  }
  fetchAll()
}, [])

  const addHabit = async () => {
    if (!title.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('habits').insert({
      title, icon, user_id: user?.id, goal_count: 1, color: '#6366f1', position: habits.length
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = habits.findIndex(h => h.id === active.id)
    const newIndex = habits.findIndex(h => h.id === over.id)
    const newHabits = arrayMove(habits, oldIndex, newIndex)
    setHabits(newHabits)

    await Promise.all(
      newHabits.map((habit, index) =>
        supabase.from('habits').update({ position: index }).eq('id', habit.id)
      )
    )
  }

  const isDone = (habitId: string) => logs.some(l => l.habit_id === habitId)
  const getStreak = (habitId: string) => streaks.find(s => s.habit_id === habitId)?.streak ?? 0
  const habitRate = habits.length > 0 ? Math.round((logs.length / habits.length) * 100) : 0
  const icons = ['⭐', '💪', '📚', '🏃', '💧', '🧘', '🎯', '✍️', '🥗', '😴']

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">습관 🔥</h2>
        <button
          onClick={() => { fetchWeekLogs(); setShowEditModal(true) }}
      className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
    >
      📅 수정
    </button>
    <button
      onClick={() => setShowForm(!showForm)}
      className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
    >
      + 추가
        </button>
      </div>

      {/* 달성률 바 - 상단 */}
      {habits.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-600">오늘 달성률</p>
            <p className="text-sm font-bold text-indigo-600">{habitRate}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${habitRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{logs.length} / {habits.length} 완료</p>
        </div>
      )}

      {/* 습관 추가 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {habits.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">습관을 추가해보세요! 🔥</p>
            )}
            {habits.map(habit => (
              <SortableHabit
                key={habit.id}
                habit={habit}
                isDone={isDone(habit.id)}
                streak={getStreak(habit.id)}
                onToggle={toggleHabit}
                onDelete={deleteHabit}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {/* 과거 7일 수정 모달 */}
{showEditModal && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center z-50 p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-4 mb-4">
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">📅 지난 7일 습관 수정</h3>
        <button onClick={() => setShowEditModal(false)}
          className="text-gray-400 hover:text-gray-600 text-xl">×</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs text-gray-400 font-medium p-3 sticky left-0 bg-white border-b border-gray-100">
                습관
              </th>
              {weekDates.map(date => {
                const d = new Date(date + 'T00:00:00')
                const days = ['일', '월', '화', '수', '목', '금', '토']
                const isToday = date === today
                return (
                  <th key={date} className={`text-center text-xs font-medium p-3 border-b border-gray-100 ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>
                    <div>{days[d.getDay()]}</div>
                    <div>{d.getDate()}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {habits.map(habit => (
              <tr key={habit.id} className="border-b border-gray-50">
                <td className="text-sm text-gray-700 p-3 sticky left-0 bg-white">
                  <div className="flex items-center gap-2">
                    <span>{habit.icon}</span>
                    <span className="truncate max-w-24">{habit.title}</span>
                  </div>
                </td>
                {weekDates.map(date => {
                  const isDone = weekLogs.some(l => l.habit_id === habit.id && l.date === date)
                  return (
                    <td key={date} className="text-center p-3">
                      <button
                        onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser()
                          if (!user) return
                          if (isDone) {
                            await supabase.from('habit_logs').delete()
                              .eq('habit_id', habit.id).eq('date', date)
                            setWeekLogs(prev => prev.filter(l => !(l.habit_id === habit.id && l.date === date)))
                          } else {
                            await supabase.from('habit_logs').insert({
                              habit_id: habit.id, user_id: user.id, date, count: 1
                            })
                            setWeekLogs(prev => [...prev, { habit_id: habit.id, date }])
                          }
                        }}
                        className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${
                          isDone ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 hover:border-indigo-400'
                        }`}
                      >
                        {isDone && '✓'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4">
        <button
          onClick={() => setShowEditModal(false)}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          완료
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}