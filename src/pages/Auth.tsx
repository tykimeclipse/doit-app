import { useState } from 'react'
import { supabase } from '../supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [studentCode, setStudentCode] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      if (!name.trim()) { setMessage('이름을 입력해주세요.'); setLoading(false); return }
      if (!/^\d{3}$/.test(studentCode)) { setMessage('학생코드는 3자리 숫자여야 해요.'); setLoading(false); return }

      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setMessage(error.message); setLoading(false); return }

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          name,
          student_code: studentCode,
          role: 'student'
        })
        setMessage('✅ 가입 완료! 이메일을 확인해주세요.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600 mb-2">DoIt 🚀</h1>
          <p className="text-sm text-gray-400">할 일 & 습관 관리 앱</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          {/* 탭 */}
          <div className="flex rounded-xl p-1 mb-6 bg-gray-50">
            {['로그인', '회원가입'].map((label, i) => (
              <button key={label} onClick={() => setIsLogin(i === 0)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  (i === 0) === isLogin ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3 mb-4">
            {!isLogin && (
              <>
                <input type="text" placeholder="이름"
                  value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input type="text" placeholder="학생코드 (숫자 3자리)"
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </>
            )}
            <input type="email" placeholder="이메일"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <input type="password" placeholder="비밀번호 (6자리 이상)"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>

          {message && (
            <p className={`text-xs text-center mb-4 ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </div>
      </div>
    </div>
  )
}