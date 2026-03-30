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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border ${
        todo.is_completed ? 'border-gray-100 opacity-50' : 'border-gray-100'
      }`}
    >
      {/* 드래그 핸들 */}
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing px-1">
        ⠿
      </button>

      {/* 완료 버튼 */}
      <button
        onClick={() => onToggle(todo.id, todo.is_completed)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          todo.is_completed ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'
        }`}
      >
        {todo.is_completed && '✓'}
      </button>

      <span className={`flex-1 text-sm ${todo.is_completed ? 'line-through text-gray-400' : 'text-gray-700 cursor-pointer hover:text-indigo-600'}`}
  onClick={() => !todo.is_completed && onEdit(todo)}
>
        {todo.title}
      </span>

      <button onClick={() => onDelete(todo.id)} className="text-gray-300 hover:text-red-400 text-lg">
        ×
      </button>
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

  const sensors = useSensors(useSensor(PointerSensor))

  const fetchTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('is_completed', false)
      .order('position', { ascending: true })
    if (data) setTodos(data)
  }

  const fetchCompletedTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('is_completed', true)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setCompletedTodos(data)
  }

  useEffect(() => {
  fetchTodos()
  fetchCompletedTodos()
  }, [])

  const addTodo = async () => {
    if (!title.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('todos').insert({
      title,
      user_id: user?.id,
      is_completed: false,
      position: todos.length,
    })
    setTitle('')
    await fetchTodos()
    setLoading(false)
  }

  const toggleTodo = async (id: string, current: boolean) => {
    await supabase.from('todos').update({ is_completed: !current }).eq('id', id)
    await fetchTodos()
    await fetchCompletedTodos()
  }

  const deleteTodo = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id)
    await fetchTodos()
    await fetchCompletedTodos()
  }

  const updateTodo = async () => {
    if (!editingTodo || !editTitle.trim()) return
    await supabase.from('todos').update({ title: editTitle }).eq('id', editingTodo.id)
    await fetchTodos()
      setEditingTodo(null)
      setEditTitle('')
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = todos.findIndex(t => t.id === active.id)
    const newIndex = todos.findIndex(t => t.id === over.id)
    const newTodos = arrayMove(todos, oldIndex, newIndex)
    setTodos(newTodos)

    // DB에 순서 저장
    await Promise.all(
      newTodos.map((todo, index) =>
        supabase.from('todos').update({ position: index }).eq('id', todo.id)
      )
    )
  }

  return (
    <div className="p-4">
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {todos.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">할 일이 없어요! 추가해보세요 😊</p>
            )}
            {todos.map(todo => (
              <SortableItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onEdit={(todo) => {
                  setEditingTodo(todo)
                  setEditTitle(todo.title)
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>


      {/* 수정 모달 */}
{editingTodo && (
  <div className="fixed inset-0  flex items-center justify-center z-50 p-6 pointer-events-none"
    style={{background: 'rgba(0,0,0,0.15)'}}
    onClick={() => setEditingTodo(null)}>
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl pointer-events-auto"
      onClick={e => e.stopPropagation()}>
      <h3 className="text-sm font-bold text-gray-700 mb-3">할 일 수정</h3>
      <input
        type="text"
        value={editTitle}
        onChange={e => setEditTitle(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && updateTodo()}
        autoFocus
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-4"
      />
      <div className="flex gap-2">
        <button
          onClick={updateTodo}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
        >
          저장
        </button>
        <button
          onClick={() => setEditingTodo(null)}
          className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl text-sm font-medium hover:bg-gray-200"
        >
          취소
        </button>
      </div>
    </div>
  </div>
)}

      {/* 완료된 할 일 */}
{completedTodos.length > 0 && (
  <div className="mt-6">
    <button
      onClick={() => setShowCompleted(!showCompleted)}
      className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-3"
    >
      <span>{showCompleted ? '▼' : '▶'}</span>
      <span>완료된 할 일 ({completedTodos.length})</span>
    </button>
    {showCompleted && (
      <div className="space-y-2">
        {completedTodos.map(todo => (
          <div key={todo.id} className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100 opacity-50">
            <button
              onClick={() => toggleTodo(todo.id, todo.is_completed)}
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-indigo-600 border-indigo-600 text-white"
            >
              ✓
            </button>
            <span className="flex-1 text-sm text-gray-700" 
            >
              {todo.title}</span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-gray-300 hover:text-red-400 text-lg"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
    </div>
  )
}