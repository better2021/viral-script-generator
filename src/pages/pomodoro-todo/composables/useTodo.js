/**
 * 番茄任务 — 待办清单逻辑
 * 管理待办的增删改、localStorage 持久化和过滤
 */
import { ref, computed } from 'vue'

const STORAGE_KEY = 'pomodoro-todo-list'

function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function createTodo(text) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text,
    completed: false,
    createdAt: Date.now()
  }
}

export function useTodo() {
  const todos = ref(loadTodos())
  const filter = ref('all')

  const activeCount = computed(() => todos.value.filter(t => !t.completed).length)
  const visibleTodos = computed(() => {
    if (filter.value === 'active') return todos.value.filter(t => !t.completed)
    if (filter.value === 'completed') return todos.value.filter(t => t.completed)
    return todos.value
  })

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
  }

  function addTodo(text) {
    const trimmed = text.trim()
    if (!trimmed) return
    todos.value.unshift(createTodo(trimmed))
    persist()
  }

  function toggleTodo(id) {
    const todo = todos.value.find(t => t.id === id)
    if (!todo) return false
    const willComplete = !todo.completed
    todo.completed = !todo.completed
    persist()
    return willComplete
  }

  function deleteTodo(id) {
    todos.value = todos.value.filter(t => t.id !== id)
    persist()
  }

  function setFilter(f) {
    filter.value = f
  }

  return {
    todos,
    filter,
    visibleTodos,
    activeCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter
  }
}
