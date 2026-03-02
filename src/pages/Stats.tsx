import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

interface HabitStat {
  id: string
  title: string
  icon: string
  streak: number
  maxStreak: number
  monthlyRate: number
}

interface WeeklyData {
  day: string
  count: number
}

export default function Stats() {
  const [habitStats, setHabitStats] = useState<HabitStat[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 습관별 통계
      const { data: habits } = await supabase.from('habits').select('id, title, icon')
      if (habits) {
        const stats = await Promise.all(
          habits.map(async (h) => {
            const [{ data: streak }, { data: maxStreak }, { data: monthlyRate }] = await Promise.all([
              supabase.rpc('get_habit_streak', { p_habit_id: h.id, p_user_id: user.id }),
              supabase.rpc('get_habit_max_streak', { p_habit_id: h.id, p_user_id: user.id }),
              supabase.rpc('get_habit_monthly_rate', { p_habit_id: h.id, p_user_id: user.id }),
            ])
            return {
              id: h.id,
              title: h.title,
              icon: h.icon,
              streak: streak ?? 0,
              maxStreak: maxStreak ?? 0,
              monthlyRate: monthlyRate ?? 0,
            }
          })
        )
        setHabitStats(stats)
      }

      // 주간 데이터 (오늘 기준 7일)
      const days = ['일', '월', '화', '수', '목', '금', '토']
      const weekly: WeeklyData[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const { count } = await supabase
          .from('habit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('date', dateStr)
        weekly.push({ day: days[d.getDay()], count: count ?? 0 })
      }
      setWeeklyData(weekly)

      // 히트맵 (최근 28일)
      const heatmapData: { date: string; count: number }[] = []
      for (let i = 27; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const { count } = await supabase
          .from('habit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('date', dateStr)
        heatmapData.push({ date: dateStr, count: count ?? 0 })
      }
      setHeatmap(heatmapData)

      setLoading(false)
    }
    fetchStats()
  }, [])

  const maxCount = Math.max(...weeklyData.map(d => d.count), 1)
  const totalHabits = habitStats.length
  const avgMonthlyRate = totalHabits > 0
    ? Math.round(habitStats.reduce((sum, h) => sum + h.monthlyRate, 0) / totalHabits)
    : 0

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-gray-100'
    if (count <= 2) return 'bg-indigo-200'
    if (count <= 4) return 'bg-indigo-400'
    return 'bg-indigo-600'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">통계 불러오는 중...</p>
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">통계 📊</h2>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 rounded-2xl p-4">
          <p className="text-xs text-indigo-400 font-medium mb-1">이번 달 평균 달성률</p>
          <p className="text-3xl font-bold text-indigo-600">{avgMonthlyRate}%</p>
        </div>
        <div className="bg-orange-50 rounded-2xl p-4">
          <p className="text-xs text-orange-400 font-medium mb-1">최고 스트릭</p>
          <p className="text-3xl font-bold text-orange-500">
            {Math.max(...habitStats.map(h => h.maxStreak), 0)}일
          </p>
        </div>
      </div>

      {/* 주간 트렌드 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-700 mb-4">📈 주간 달성 현황</p>
        <div className="flex items-end gap-2 h-24">
          {weeklyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-indigo-500 rounded-t-md transition-all"
                style={{ height: `${(d.count / maxCount) * 80}px`, minHeight: d.count > 0 ? '4px' : '0' }}
              />
              <span className="text-xs text-gray-400">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 히트맵 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-700 mb-3">🗓️ 최근 28일 활동</p>
        <div className="grid grid-cols-7 gap-1">
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} className="text-center text-xs text-gray-400">{d}</div>
          ))}
          {heatmap.map((d, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm ${getHeatColor(d.count)}`}
              title={`${d.date}: ${d.count}개`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2 justify-end">
          <span className="text-xs text-gray-400">적음</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-indigo-200" />
          <div className="w-3 h-3 rounded-sm bg-indigo-400" />
          <div className="w-3 h-3 rounded-sm bg-indigo-600" />
          <span className="text-xs text-gray-400">많음</span>
        </div>
      </div>

      {/* 습관별 통계 */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-700 mb-3">🏆 습관별 상세 통계</p>
        <div className="space-y-4">
          {habitStats.map(h => (
            <div key={h.id}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{h.icon}</span>
                <span className="text-sm font-medium text-gray-700 flex-1">{h.title}</span>
                <span className="text-xs text-orange-400 font-medium">🔥 {h.streak}일</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${h.monthlyRate}%` }}
                />
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