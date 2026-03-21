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

interface Todo {
  id: string
  title: string
  is_completed: boolean
  position: number
}

function SortableItem({ todo, onToggle, onDelete, onEdit }: {
  todo: Todo
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  onEdit: (todo: Todo) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef}
    style={{...style, borderLeft: '4px solid #2563eb'}}
    className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
      <button {...attributes} {...listeners} className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing">
        ⠿
      </button>
      <button onClick={() => onToggle(todo.id, todo.is_completed)}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          todo.is_completed ? 'bg-blue-600 border-blue-600' : 'border-gray-200'
        }`}>
        {todo.is_completed && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm font-medium ${todo.is_completed ? 'line-through text-gray-300' : 'text-gray-800 cursor-pointer'}`}
        onClick={() => !todo.is_completed && onEdit(todo)}>
        {todo.title}
      </span>
      <button onClick={() => onDelete(todo.id)} className="text-gray-200 hover:text-red-400 text-lg">×</button>
    </div>
  )
}

export default function Todo() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([])
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [userId, setUserId] = useState('')

  const sensors = useSensors(useSensor(PointerSensor))

  const fetchTodos = async (uid = userId) => {
    if (!uid) return
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', uid)
      .eq('is_completed', false)
      .order('position', { ascending: true })
    if (data) setTodos(data)
  }

  const fetchCompletedTodos = async (uid = userId) => {
    if (!uid) return
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', uid)
      .eq('is_completed', true)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setCompletedTodos(data)
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await Promise.all([fetchTodos(user.id), fetchCompletedTodos(user.id)])
    }
    init()
  }, [])

  const addTodo = async () => {
    if (!title.trim() || !userId) return
    setLoading(true)
    await supabase.from('todos').insert({
      title,
      user_id: userId,
      is_completed: false,
      position: todos.length,
    })
    setTitle('')
    await fetchTodos()
    setLoading(false)
  }

  const toggleTodo = async (id: string, current: boolean) => {
    if (!userId) return
    await supabase.from('todos').update({ is_completed: !current }).eq('id', id).eq('user_id', userId)
    await fetchTodos()
    await fetchCompletedTodos()
  }

  const deleteTodo = async (id: string) => {
    if (!userId) return
    await supabase.from('todos').delete().eq('id', id).eq('user_id', userId)
    await fetchTodos()
    await fetchCompletedTodos()
  }

  const updateTodo = async () => {
    if (!editingTodo || !editTitle.trim() || !userId) return
    await supabase.from('todos').update({ title: editTitle }).eq('id', editingTodo.id).eq('user_id', userId)
    await fetchTodos()
      setEditingTodo(null)
      setEditTitle('')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!userId) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = todos.findIndex(t => t.id === active.id)
    const newIndex = todos.findIndex(t => t.id === over.id)
    const newTodos = arrayMove(todos, oldIndex, newIndex)
    setTodos(newTodos)

    // DB에 순서 저장
    await Promise.all(
      newTodos.map((todo, index) =>
        supabase.from('todos').update({ position: index }).eq('id', todo.id).eq('user_id', userId)
      )
    )
  }

  return (
  <div className="px-6 py-4">
    {/* 헤더 */}
    <div className="mb-6">
      <p className="text-xs font-semibold tracking-widest text-gray-400">TASKS</p>
      <h2 className="text-3xl font-bold text-gray-900 font-display">To-Do</h2>
      <p className="text-sm text-gray-400 mt-1">
        <span className="text-blue-600 font-semibold">{todos.length}개</span>의 할 일이 있어요
      </p>
    </div>

    {/* 입력창 */}
    <div className="flex gap-2 mb-6">
      <input type="text" placeholder="Add a new task"
        value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && addTodo()}
        className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
        style={{background: '#fff', border: '1.5px solid #e5ddd0'}}
      />
      <button onClick={addTodo} disabled={loading}
        className="bg-blue-600 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
        Add
      </button>
    </div>

    {/* 할 일 목록 */}
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {todos.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm text-gray-400">할 일을 추가해보세요!</p>
            </div>
          )}
          {todos.map(todo => (
            <SortableItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo}
              onEdit={(todo) => { setEditingTodo(todo); setEditTitle(todo.title) }} />
          ))}
        </div>
      </SortableContext>
    </DndContext>

    {/* 수정 모달 */}
    {editingTodo && (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-6 pointer-events-none"
        style={{background: 'rgba(0,0,0,0.15)'}} onClick={() => setEditingTodo(null)}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl pointer-events-auto"
          onClick={e => e.stopPropagation()}>
          <h3 className="text-sm font-bold text-gray-700 mb-3">할 일 수정</h3>
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && updateTodo()} autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"/>
          <div className="flex gap-2">
            <button onClick={updateTodo}
              className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700">저장</button>
            <button onClick={() => setEditingTodo(null)}
              className="flex-1 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-100"
              style={{background: '#f5f0e8'}}>취소</button>
          </div>
        </div>
      </div>
    )}

    {/* 완료된 할 일 */}
    {completedTodos.length > 0 && (
      <div className="mt-6">
        <button onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-2 text-sm font-semibold tracking-wider text-gray-400 hover:text-gray-600 mb-3">
          <span>{showCompleted ? '▼' : '▶'}</span>
          <span>COMPLETED TASKS</span>
          <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">{completedTodos.length}</span>
        </button>
        {showCompleted && (
          <div className="space-y-2">
            {completedTodos.map(todo => (
              <div key={todo.id} className="bg-white rounded-2xl p-4 flex items-center gap-3 opacity-50 shadow-sm">
                <button onClick={() => toggleTodo(todo.id, todo.is_completed)}
                  className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <span className="flex-1 text-sm line-through text-gray-400">{todo.title}</span>
                <button onClick={() => deleteTodo(todo.id)} className="text-gray-200 hover:text-red-400 text-lg">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)
}