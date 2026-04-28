import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

interface Student {
  id: string
  name: string
  email: string
  created_at: string
}

export default function Students({ onSelectStudent }: { 
  onSelectStudent: (student: Student | null) => void 
}) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, created_at')
        .eq('role', 'student')
        .order('name', { ascending: true })

      if (data) {
        // 이메일은 auth.users에서 가져와야 해서 별도 처리
        const studentsWithEmail = await Promise.all(
          data.map(async (s) => {
            const { data: userData } = await supabase
              .rpc('get_user_email', { p_user_id: s.id })
            return {
              id: s.id,
              name: s.name || '이름 없음',
              email: userData || '',
              created_at: s.created_at
            }
          })
        )
        setStudents(studentsWithEmail)
      }
      setLoading(false)
    }
    fetchStudents()
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      <p className="text-sm text-gray-400">학생 목록 불러오는 중...</p>
    </div>
  )

  return (
    <div className="p-4">
      <div className="mb-6">
        <p className="text-xs font-semibold tracking-widest text-gray-400">TEACHER</p>
        <h2 className="text-2xl font-bold text-gray-800">학생 관리 👨‍🏫</h2>
        <p className="text-sm text-gray-400 mt-1">학생을 클릭하면 해당 학생의 앱을 볼 수 있어요</p>
      </div>

      {students.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <p className="text-3xl mb-3">👨‍🎓</p>
          <p className="text-sm text-gray-400">아직 가입한 학생이 없어요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student, index) => {
            const colors = ['#2563eb', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b']
            const color = colors[index % colors.length]
            return (
              <button
                key={student.id}
                onClick={() => onSelectStudent(student)}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:border-indigo-200 hover:shadow-md transition-all text-left"
              >
                {/* 아바타 */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                  style={{background: color}}>
                  {student.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{student.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{student.email}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}