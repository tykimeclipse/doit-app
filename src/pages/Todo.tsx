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

function SortableItem({ todo, onToggle, onDelete }: {
  todo: Todo
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
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
      className={`flex items-center gap-3 bg-white rounded-xl p-4 shadow-sm border ${
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

      <span className={`flex-1 text-sm ${todo.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
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

  const sensors = useSensors(useSensor(PointerSensor))

  const fetchTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('position', { ascending: true })
    if (data) setTodos(data)
  }

  useEffect(() => { fetchTodos() }, [])

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
  }

  const deleteTodo = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id)
    await fetchTodos()
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {todos.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">할 일이 없어요! 추가해보세요 😊</p>
            )}
            {todos.map(todo => (
              <SortableItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}