import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabase'

interface HabitStat {
  id: string
  title: string
  icon: string
  streak: number
  maxStreak: number
  monthlyRate: number
}

interface HabitStatRow {
  habit_id: string
  streak: number | null
  max_streak: number | null
  monthly_rate: number | null
}

const getLocalDateStr = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export default function Stats() {
  const [habitStats, setHabitStats] = useState<HabitStat[]>([])
  const [weeklyData, setWeeklyData] = useState<{ day: string, count: number }[]>([])
  const [heatmap, setHeatmap] = useState<{ date: string, count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setHabitStats([])
        setWeeklyData([])
        setHeatmap([])
        return
      }

      const [{ data: habits }, { data: statsData }] = await Promise.all([
        supabase.from('habits').select('id, title, icon, position').eq('user_id', user.id).order('position', { ascending: true }),
        supabase.rpc('get_all_habit_stats', { p_user_id: user.id }),
      ])

      if (habits && statsData) {
        const typedStats = (statsData as HabitStatRow[])
        const stats = habits.map(h => {
          const row = typedStats.find(s => s.habit_id === h.id)
          return {
            id: h.id,
            title: h.title,
            icon: h.icon,
            streak: row?.streak ?? 0,
            maxStreak: row?.max_streak ?? 0,
            monthlyRate: row?.monthly_rate ?? 0,
          }
        })
        setHabitStats(stats)
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 27)
      const startDateStr = getLocalDateStr(startDate)

      const { data: logs } = await supabase
        .from('habit_logs')
        .select('date')
        .eq('user_id', user.id)
        .gte('date', startDateStr)

      const logCountsByDate = logs?.reduce((acc, log) => {
        acc[log.date] = (acc[log.date] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
      const heatmapData: { date: string, count: number }[] = []
      const weeklyArr: { day: string, count: number }[] = []

      for (let i = 27; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = getLocalDateStr(d)
        const count = logCountsByDate[dateStr] || 0

        heatmapData.push({ date: dateStr, count })
        if (i <= 6) {
          weeklyArr.push({ day: dayNames[d.getDay()], count })
        }
      }

      setHeatmap(heatmapData)
      setWeeklyData(weeklyArr)
    } catch (err) {
      console.error(err)
      setError('통계를 불러오지 못했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1)
  const avgMonthlyRate = habitStats.length > 0
    ? Math.round(habitStats.reduce((sum, h) => sum + h.monthlyRate, 0) / habitStats.length)
    : 0
  const maxStreak = Math.max(...habitStats.map(h => h.maxStreak), 0)

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    if (count <= 2) return 'bg-indigo-200'
    if (count <= 4) return 'bg-indigo-400'
    return 'bg-indigo-600'
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        <p className="text-sm text-gray-400">통계를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6">
        <p className="text-sm text-gray-500 text-center">{error}</p>
        <button
          onClick={fetchStats}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
  <div className="px-6 py-4 space-y-4">
    {/* 헤더 */}
    <div>
      <p className="text-xs font-semibold tracking-widest text-gray-400">ANALYTICS</p>
      <h2 className="text-3xl font-bold text-gray-900 font-display">Reports</h2>
    </div>

    {/* 요약 카드 */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white rounded-2xl p-4 shadow-sm" style={{borderLeft: '4px solid #2563eb'}}>
        <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">이번 달</p>
        <p className="text-3xl font-bold text-blue-600">{avgMonthlyRate}%</p>
        <p className="text-xs text-gray-400 mt-1">평균 달성률</p>
      </div>
      <div className="bg-white rounded-2xl p-4 shadow-sm" style={{borderLeft: '4px solid #f59e0b'}}>
        <p className="text-xs font-semibold tracking-widest text-gray-400 mb-2">최고 스트릭</p>
        <p className="text-3xl font-bold text-orange-500">{maxStreak}일</p>
        <p className="text-xs text-gray-400 mt-1">연속 달성</p>
      </div>
    </div>

    {/* 주간 트렌드 */}
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-800 mb-4">📈 주간 달성 현황</p>
      <div className="flex items-end gap-2 h-24">
        {weeklyData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-blue-500 rounded-t-lg transition-all"
              style={{height: `${(d.count / maxCount) * 80}px`, minHeight: d.count > 0 ? '4px' : '0'}} />
            <span className="text-xs text-gray-400 font-medium">{d.day}</span>
          </div>
        ))}
      </div>
    </div>

    {/* 히트맵 */}
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-800 mb-3">🗓️ 최근 28일 활동</p>
      <div className="grid grid-cols-7 gap-1">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium">{d}</div>
        ))}
        {heatmap.length > 0 && Array.from({
          length: new Date(`${heatmap[0].date}T00:00:00`).getDay()
        }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
        {heatmap.map((d, i) => (
          <div key={i} className={`aspect-square rounded-md ${getHeatColor(d.count)}`}
            title={`${d.date}: ${d.count}개`} />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs text-gray-400">적음</span>
        {['bg-gray-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600'].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span className="text-xs text-gray-400">많음</span>
      </div>
    </div>

    {/* 습관별 통계 */}
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-bold text-gray-800 mb-4">🏆 습관별 상세</p>
      <div className="space-y-5">
        {habitStats.map(h => (
          <div key={h.id}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{h.icon}</span>
              <span className="text-sm font-semibold text-gray-800 flex-1">{h.title}</span>
              <span className="text-xs font-bold text-orange-400">🔥 {h.streak}일</span>
            </div>
            <div className="w-full rounded-full h-2 mb-1" style={{background: '#f0ece4'}}>
              <div className="bg-blue-500 h-2 rounded-full transition-all"
                style={{width: `${h.monthlyRate}%`}} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>이번 달 {h.monthlyRate}%</span>
              <span>최장 {h.maxStreak}일</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)
}
