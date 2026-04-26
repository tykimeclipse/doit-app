import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { ko },
})

interface PlannerEvent {
  id: string
  title: string
  start: Date
  end: Date
  color: string
  memo: string
}

const COLORS = ['#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4', '#f97316']

// 이벤트 스타일
const eventStyleGetter = (event: PlannerEvent) => ({
  style: {
    backgroundColor: event.color,
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    fontSize: '12px',
    padding: '2px 6px',
  }
})

export default function Planner() {
  const [events, setEvents] = useState<PlannerEvent[]>([])
  const [userId, setUserId] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<PlannerEvent | null>(null)
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'month' | 'week' | 'day'>('week')

  const fetchEvents = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('planner')
      .select('*')
      .eq('user_id', uid)
    if (data) {
      setEvents(data.map(e => ({
        id: e.id,
        title: e.title,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        color: e.color,
        memo: e.memo || '',
      })))
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await fetchEvents(user.id)
    }
    init()
  }, [fetchEvents])

  const formatDateTimeLocal = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  // 빈 슬롯 클릭 → 새 일정 추가
  const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
    setSelectedEvent(null)
    setTitle('')
    setMemo('')
    setColor('#2563eb')
    setStartTime(formatDateTimeLocal(start))
    setEndTime(formatDateTimeLocal(end))
    setShowModal(true)
  }

  // 기존 이벤트 클릭 → 수정
  const handleSelectEvent = (event: PlannerEvent) => {
    setSelectedEvent(event)
    setTitle(event.title)
    setMemo(event.memo)
    setColor(event.color)
    setStartTime(formatDateTimeLocal(event.start))
    setEndTime(formatDateTimeLocal(event.end))
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!title.trim() || !userId) return
    setLoading(true)

    const start = new Date(startTime)
    const end = new Date(endTime)

    try {
      if (selectedEvent) {
        // 수정
        await supabase.from('planner').update({
          title, memo, color,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        }).eq('id', selectedEvent.id)
      } else {
        // 추가
        await supabase.from('planner').insert({
          user_id: userId, title, memo, color,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        })
      }
      await fetchEvents(userId)
      setShowModal(false)
    } catch {
      alert('저장 중 오류가 발생했어요.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
    await supabase.from('planner').delete().eq('id', selectedEvent.id)
    await fetchEvents(userId)
    setShowModal(false)
  }

  const messages = {
    today: '오늘',
    previous: '◀',
    next: '▶',
    month: '월',
    week: '주',
    day: '일',
    agenda: '목록',
    date: '날짜',
    time: '시간',
    event: '일정',
    noEventsInRange: '일정이 없어요',
  }

  return (
    <div className="flex flex-col" style={{height: 'calc(100dvh - 180px)'}}>
      {/* 헤더 */}
      <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100 bg-white">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400">PLANNER</p>
          <h2 className="text-xl font-bold text-gray-800">플래너 📅</h2>
        </div>
        <button
          onClick={() => handleSelectSlot({ start: new Date(), end: new Date(Date.now() + 3600000) })}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          + 일정 추가
        </button>
      </div>

      {/* 캘린더 */}
      <div className="flex-1 overflow-hidden p-2">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={view}
          onView={(v: any) => setView(v)}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
          messages={messages}
          culture="ko"
          popup
        />
      </div>

      {/* 일정 추가/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">
              {selectedEvent ? '일정 수정' : '일정 추가'}
            </h3>

            <div className="space-y-3">
              {/* 제목 */}
              <input
                type="text"
                placeholder="일정 제목"
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />

              {/* 시작 시간 */}
              <div>
                <p className="text-xs text-gray-400 mb-1">시작</p>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {/* 종료 시간 */}
              <div>
                <p className="text-xs text-gray-400 mb-1">종료</p>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              {/* 메모 */}
              <textarea
                placeholder="메모 (선택)"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />

              {/* 색상 선택 */}
              <div>
                <p className="text-xs text-gray-400 mb-2">색상</p>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full transition-transform"
                      style={{
                        background: c,
                        transform: color === c ? 'scale(1.3)' : 'scale(1)',
                        border: color === c ? '2px solid #1e1e2e' : 'none'
                      }} />
                  ))}
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? '저장 중...' : '저장'}
              </button>
              {selectedEvent && (
                <button onClick={handleDelete}
                  className="flex-1 bg-red-50 text-red-500 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100">
                  삭제
                </button>
              )}
              <button onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-100 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-200">
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}