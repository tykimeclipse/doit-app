import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabase'

interface PlannerItem {
  id: string
  day_of_week: number
  time_slot: string
  content: string
  color: string
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

const TIME_SLOTS: string[] = []
for (let h = 6; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}

export default function Planner() {
  const [items, setItems] = useState<PlannerItem[]>([])
  const [editing, setEditing] = useState<{day: number, time: string} | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [selectedColor, setSelectedColor] = useState('#6366f1')
  const [editingItem, setEditingItem] = useState<PlannerItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const today = new Date().getDay()

  const fetchItems = async () => {
    const { data } = await supabase.from('planner').select('*')
    if (data) setItems(data)
  }

  useEffect(() => { fetchItems() }, [])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const getItem = (day: number, time: string) =>
    items.filter(i => i.day_of_week === day && i.time_slot === time)

  const handleCellClick = (day: number, time: string) => {
    setEditing({ day, time })
    setInputValue('')
    setSelectedColor('#6366f1')
    setEditingItem(null)
  }

  const handleItemClick = (e: React.MouseEvent, item: PlannerItem) => {
    e.stopPropagation()
    setEditing({ day: item.day_of_week, time: item.time_slot })
    setInputValue(item.content)
    setSelectedColor(item.color)
    setEditingItem(item)
  }

  const handleSave = async () => {
    if (!editing || !inputValue.trim()) {
      setEditing(null)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (editingItem) {
      await supabase.from('planner').update({
        content: inputValue,
        color: selectedColor
      }).eq('id', editingItem.id)
    } else {
      await supabase.from('planner').insert({
        user_id: user.id,
        day_of_week: editing.day,
        time_slot: editing.time,
        content: inputValue,
        color: selectedColor
      })
    }
    await fetchItems()
    setEditing(null)
    setEditingItem(null)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await supabase.from('planner').delete().eq('id', id)
    await fetchItems()
    setEditing(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') setEditing(null)
  }

  // 현재 시간 슬롯
  const now = new Date()
  const currentSlot = `${String(now.getHours()).padStart(2, '0')}:${now.getMinutes() < 30 ? '00' : '30'}`

  return (
    <div className="flex flex-col h-screen" style={{maxHeight: 'calc(100vh - 120px)'}}>
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">주간 플래너 📅</h2>
        <p className="text-xs text-gray-400 mt-0.5">셀을 탭해서 일정을 추가하세요</p>
      </div>

      {/* 테이블 */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse" style={{minWidth: '600px'}}>
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              <th className="border border-gray-100 bg-gray-50 text-xs text-gray-400 font-medium p-2 w-14">
                시간
              </th>
              {DAYS.map((day, i) => (
                <th key={i}
                  className={`border border-gray-100 text-xs font-semibold p-2 ${
                    i === today
                      ? 'bg-indigo-600 text-white'
                      : i === 0 ? 'bg-red-50 text-red-400'
                      : i === 6 ? 'bg-blue-50 text-blue-400'
                      : 'bg-gray-50 text-gray-600'
                  }`}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map(time => (
              <tr key={time} className={time === currentSlot && today >= 0 ? 'bg-yellow-50' : ''}>
                <td className="border border-gray-100 text-xs text-gray-400 p-1 text-center w-14 bg-gray-50 font-medium">
                  {time}
                </td>
                {DAYS.map((_, dayIndex) => {
                  const cellItems = getItem(dayIndex, time)
                  const isEditing = editing?.day === dayIndex && editing?.time === time

                  return (
                    <td
                      key={dayIndex}
                      onClick={() => handleCellClick(dayIndex, time)}
                      className="border border-gray-100 p-1 align-top cursor-pointer hover:bg-indigo-50 transition-colors"
                      style={{minHeight: '32px', minWidth: '70px'}}
                    >
                      {/* 기존 항목들 */}
                      {cellItems.map(item => (
                        <div
                          key={item.id}
                          onClick={e => handleItemClick(e, item)}
                          className="text-xs rounded px-1 py-0.5 mb-0.5 text-white flex items-center justify-between group cursor-pointer"
                          style={{background: item.color}}
                        >
                          <span className="truncate flex-1">{item.content}</span>
                          <button
                            onClick={e => handleDelete(e, item.id)}
                            className="ml-1 opacity-0 group-hover:opacity-100 text-white hover:text-red-200 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {/* 인라인 편집 */}
                      {isEditing && (
                        <div onClick={e => e.stopPropagation()} className="relative z-20">
                          <div className="absolute top-0 left-0 bg-white rounded-xl shadow-xl border border-indigo-200 p-3 z-30"
                            style={{width: '180px'}}>
                            <input
                              ref={inputRef}
                              value={inputValue}
                              onChange={e => setInputValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              placeholder="일정 입력..."
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-2"
                            />
                            {/* 색상 선택 */}
                            <div className="flex gap-1 mb-2">
                              {COLORS.map(color => (
                                <button
                                  key={color}
                                  onClick={() => setSelectedColor(color)}
                                  className="w-5 h-5 rounded-full transition-transform"
                                  style={{
                                    background: color,
                                    transform: selectedColor === color ? 'scale(1.3)' : 'scale(1)',
                                    border: selectedColor === color ? '2px solid #1e1e2e' : 'none'
                                  }}
                                />
                              ))}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={handleSave}
                                className="flex-1 bg-indigo-600 text-white text-xs py-1 rounded-lg hover:bg-indigo-700"
                              >
                                저장
                              </button>
                              {editingItem && (
                                <button
                                  onClick={e => handleDelete(e, editingItem.id)}
                                  className="flex-1 bg-red-100 text-red-500 text-xs py-1 rounded-lg hover:bg-red-200"
                                >
                                  삭제
                                </button>
                              )}
                              <button
                                onClick={() => setEditing(null)}
                                className="flex-1 bg-gray-100 text-gray-500 text-xs py-1 rounded-lg hover:bg-gray-200"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}