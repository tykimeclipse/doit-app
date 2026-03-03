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
    </div>
  )
}