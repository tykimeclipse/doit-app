import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // 이메일 링크 클릭 시 세션 자동 설정
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  const handleReset = async () => {
    if (!password.trim()) { setMessage('비밀번호를 입력해주세요.'); return }
    if (password !== confirm) { setMessage('비밀번호가 일치하지 않아요.'); return }
    if (password.length < 6) { setMessage('비밀번호는 6자리 이상이어야 해요.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('✅ 비밀번호가 변경됐어요! 잠시 후 이동합니다.')
      setTimeout(() => { window.location.href = '/' }, 2000)
    }
    setLoading(false)
  }

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center" style={{background: '#F5F0E8'}}>
      <div className="text-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">링크 확인 중...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{background: '#F5F0E8'}}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Do:It 🚀</h1>
          <p className="text-sm text-gray-400">새 비밀번호를 설정해주세요</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="space-y-3 mb-4">
            <input
              type="password"
              placeholder="새 비밀번호 (6자리 이상)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          {message && (
            <p className={`text-xs text-center mb-4 ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}
          <button onClick={handleReset} disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </div>
      </div>
    </div>
  )
}