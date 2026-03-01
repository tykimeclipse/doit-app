import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

interface Todo {
  id: string
  title: string
  memo: string
  priority: string
  due_date: string
  is_completed: boolean
}

export default function Todo() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  // 할 일 불러오기
  const fetchTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTodos(data)
  }

  useEffect(() => { fetchTodos() }, [])

  // 할 일 추가
  const addTodo = async () => {
    if (!title.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('todos').insert({
      title,
      user_id: user?.id,
      is_completed: false,
    })
    setTitle('')
    await fetchTodos()
    setLoading(false)
  }

  // 완료 토글
  const toggleTodo = async (id: string, current: boolean) => {
    await supabase.from('todos').update({ is_completed: !current }).eq('id', id)
    await fetchTodos()
  }

  // 삭제
  const deleteTodo = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id)
    await fetchTodos()
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">할 일 ✅</h2>

      {/* 입력창 */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="새 할 일 입력..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <button
          onClick={addTodo}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          추가
        </button>
      </div>

      {/* 할 일 목록 */}
      <div className="space-y-3">
        {todos.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">할 일이 없어요! 추가해보세요 😊</p>
        )}
        {todos.map(todo => (
          <div
            key={todo.id}
            className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border ${
              todo.is_completed ? 'border-gray-100 opacity-50' : 'border-gray-100'
            }`}
          >
            <button
              onClick={() => toggleTodo(todo.id, todo.is_completed)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                todo.is_completed
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-300'
              }`}
            >
              {todo.is_completed && '✓'}
            </button>
            <span className={`flex-1 text-sm ${todo.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
              {todo.title}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-gray-300 hover:text-red-400 text-lg"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}