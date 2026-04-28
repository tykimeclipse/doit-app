import { useEffect, useState, useCallback } from 'react'
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

const getLocalDateStr = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const getWeekDates = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return getLocalDateStr(d)
  })

function Toast({ message, type }: { message: string, type: 'error' | 'success' }) {
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-white text-sm shadow-lg z-50 ${
      type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`}>
      {message}
    </div>
  )
}

function SortableHabit({ habit, isDone, streak, onToggle, onDelete }: {
  habit: Habit
  isDone: boolean
  streak: number
  onToggle: (habit: Habit) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border transition-all ${
        isDone ? 'border-indigo-200 bg-indigo-50' : 'border-gray-100'
      }`}>
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing px-1">
        ⠿
      </button>
      <button onClick={() => onToggle(habit)}
        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xl transition-all ${
          isDone ? 'bg-indigo-600' : 'bg-gray-100'
        }`}>
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
      <button onClick={() => onDelete(habit.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
    </div>
  )
}

function HabitEditModal({ habits, weekDates, weekLogs, today, userId, onClose, onUpdate }: {
  habits: Habit[]
  weekDates: string[]
  weekLogs: { date: string, habit_id: string }[]
  today: string
  userId: string
  onClose: () => void
  onUpdate: (logs: { date: string, habit_id: string }[]) => void
}) {
  const [localLogs, setLocalLogs] = useState(weekLogs)
  const days = ['일', '월', '화', '수', '목', '금', '토']

  const handleToggle = async (habitId: string, date: string) => {
    const isDone = localLogs.some(l => l.habit_id === habitId && l.date === date)
    if (isDone) {
      setLocalLogs(prev => prev.filter(l => !(l.habit_id === habitId && l.date === date)))
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('date', date).eq('user_id', userId)
    } else {
      setLocalLogs(prev => [...prev, { habit_id: habitId, date }])
      await supabase.from('habit_logs').insert({ habit_id: habitId, user_id: userId, date, count: 1 })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-4 mb-4">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">📅 지난 7일 습관 수정</h3>
          <button onClick={() => { onUpdate(localLogs); onClose() }}
            className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs text-gray-400 font-medium p-3 sticky left-0 bg-white border-b border-gray-100">습관</th>
                {weekDates.map(date => {
                  const d = new Date(date + 'T00:00:00')
                  return (
                    <th key={date} className={`text-center text-xs font-medium p-3 border-b border-gray-100 ${date === today ? 'text-indigo-600' : 'text-gray-400'}`}>
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
                    const isDone = localLogs.some(l => l.habit_id === habit.id && l.date === date)
                    return (
                      <td key={date} className="text-center p-3">
                        <button onClick={() => handleToggle(habit.id, date)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${
                            isDone ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-200 hover:border-indigo-400'
                          }`}>
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
          <button onClick={() => { onUpdate(localLogs); onClose() }}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700">
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Habit({ userId }: { userId: string }) {
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [streaks, setStreaks] = useState<HabitStreak[]>([])
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [weekLogs, setWeekLogs] = useState<{ date: string, habit_id: string }[]>([])
  const [weekDates] = useState<string[]>(getWeekDates())
  const [toast, setToast] = useState<{ message: string, type: 'error' | 'success' } | null>(null)
  const [modalLoading, setModalLoading] = useState(false)

  const today = getLocalDateStr()
  const sensors = useSensors(useSensor(PointerSensor))
  const icons = ['⭐', '💪', '📚', '🏃', '💧', '🧘', '🎯', '✍️', '🥗', '😴']

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchLogs = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('habit_logs').select('*').eq('user_id', userId).eq('date', today)
    if (data) setLogs(data)
  }, [userId, today])

  useEffect(() => {
    const fetchAll = async () => {
      if (!userId) return
      try {
        const [{ data: habitData }, { data: logData }] = await Promise.all([
          supabase.from('habits').select('*').eq('user_id', userId).order('position', { ascending: true }),
          supabase.from('habit_logs').select('*').eq('user_id', userId).eq('date', today)
        ])
        if (habitData) setHabits(habitData)
        if (logData) setLogs(logData)

        if (habitData) {
          const results = await Promise.all(
            habitData.map(async (h) => {
              const { data } = await supabase.rpc('get_habit_streak', {
                p_habit_id: h.id, p_user_id: userId
              })
              return { habit_id: h.id, streak: data ?? 0 }
            })
          )
          setStreaks(results)
        }
      } catch {
        showToast('데이터를 불러오는 중 오류가 발생했어요')
      }
    }
    fetchAll()
  }, [userId])

  const addHabit = async () => {
    if (!title.trim() || !userId) return
    setLoading(true)
    try {
      await supabase.from('habits').insert({
        title, icon, user_id: userId, goal_count: 1, color: '#6366f1', position: habits.length
      })
      setTitle('')
      setIcon('⭐')
      setShowForm(false)
      const { data } = await supabase.from('habits').select('*').eq('user_id', userId).order('position', { ascending: true })
      if (data) setHabits(data)
      showToast('습관이 추가됐어요!', 'success')
    } catch {
      showToast('습관 추가 중 오류가 발생했어요')
    } finally {
      setLoading(false)
    }
  }

  const toggleHabit = async (habit: Habit) => {
    const isCurrentlyDone = logs.some(l => l.habit_id === habit.id)
    if (isCurrentlyDone) {
      setLogs(prev => prev.filter(l => l.habit_id !== habit.id))
      await supabase.from('habit_logs').delete().eq('habit_id', habit.id).eq('date', today).eq('user_id', userId)
    } else {
      setLogs(prev => [...prev, { habit_id: habit.id, count: 1 }])
      await supabase.from('habit_logs').insert({ habit_id: habit.id, user_id: userId, date: today, count: 1 })
    }
  }

  const deleteHabit = async (id: string) => {
    try {
      await supabase.from('habits').delete().eq('id', id).eq('user_id', userId)
      setHabits(prev => prev.filter(h => h.id !== id))
    } catch {
      showToast('삭제 중 오류가 발생했어요')
    }
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
        supabase.from('habits').update({ position: index }).eq('id', habit.id).eq('user_id', userId)
      )
    )
  }

  const openEditModal = async () => {
    setModalLoading(true)
    try {
      const { data } = await supabase.from('habit_logs').select('date, habit_id').eq('user_id', userId).in('date', weekDates)
      if (data) setWeekLogs(data)
      setShowEditModal(true)
    } catch {
      showToast('데이터를 불러오는 중 오류가 발생했어요')
    } finally {
      setModalLoading(false)
    }
  }

  const isDone = (habitId: string) => logs.some(l => l.habit_id === habitId)
  const getStreak = (habitId: string) => streaks.find(s => s.habit_id === habitId)?.streak ?? 0
  const habitRate = habits.length > 0 ? Math.round((logs.length / habits.length) * 100) : 0

  return (
    <div className="p-4">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">습관 🔥</h2>
        <div className="flex gap-2">
          <button onClick={openEditModal} disabled={modalLoading}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50">
            {modalLoading ? '⏳' : '📅 수정'}
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
            + 추가
          </button>
        </div>
      </div>

      {habits.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-medium text-gray-600">오늘 달성률</p>
            <p className="text-sm font-bold text-indigo-600">{habitRate}%</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${habitRate}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{logs.length} / {habits.length} 완료</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
          <p className="text-sm font-medium text-gray-600 mb-3">아이콘 선택</p>
          <div className="flex gap-2 flex-wrap mb-3">
            {icons.map(i => (
              <button key={i} onClick={() => setIcon(i)}
                className={`text-xl p-2 rounded-lg ${icon === i ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                {i}
              </button>
            ))}
          </div>
          <input type="text" placeholder="습관 이름 입력..."
            value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHabit()}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-3"
          />
          <div className="flex gap-2">
            <button onClick={addHabit} disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              저장
            </button>
            <button onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-200">
              취소
            </button>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {habits.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">습관을 추가해보세요! 🔥</p>
            )}
            {habits.map(habit => (
              <SortableHabit key={habit.id} habit={habit}
                isDone={isDone(habit.id)} streak={getStreak(habit.id)}
                onToggle={toggleHabit} onDelete={deleteHabit} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {showEditModal && (
        <HabitEditModal
          habits={habits} weekDates={weekDates} weekLogs={weekLogs}
          today={today} userId={userId}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedLogs) => { setWeekLogs(updatedLogs); fetchLogs() }}
        />
      )}
    </div>
  )
}