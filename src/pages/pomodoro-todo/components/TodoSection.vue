<template>
  <div>
    <!-- 输入表单 -->
    <form class="todo-form" @submit.prevent="handleSubmit">
      <input
        v-model="inputText"
        type="text"
        maxlength="80"
        autocomplete="off"
        placeholder="写下一件小事"
        class="todo-input"
      />
      <button type="submit" class="btn-add">
        🍅 添加
      </button>
    </form>

    <!-- 筛选按钮 -->
    <nav class="filter-nav">
      <button
        v-for="f in filters"
        :key="f.id"
        type="button"
        class="filter-btn"
        :class="{ 'filter-active': filter === f.id }"
        @click="setFilter(f.id)"
      >
        {{ f.label }}
      </button>
    </nav>

    <!-- 待办列表 -->
    <ul class="todo-list">
      <li
        v-for="todo in visibleTodos"
        :key="todo.id"
        class="todo-item"
      >
        <button
          type="button"
          class="check-btn"
          :class="{ 'check-btn-done': todo.completed }"
          :aria-label="todo.completed ? '标记为待完成' : '标记为已完成'"
          @click="handleToggle(todo.id)"
        >
          <svg viewBox="0 0 24 24" class="check-svg" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5"></path>
          </svg>
        </button>
        <span
          class="todo-text"
          :class="{ 'todo-text-done': todo.completed }"
        >
          {{ todo.text }}
        </span>
        <button
          type="button"
          class="delete-btn"
          aria-label="删除待办"
          @click="deleteTodo(todo.id)"
        >
          <svg viewBox="0 0 24 24" class="delete-svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>
      </li>
    </ul>

    <!-- 空状态 -->
    <div v-if="visibleTodos.length === 0" class="empty-state">
      <p class="empty-text">这里很安静，适合放下一件小事。</p>
    </div>

    <!-- 底部统计 -->
    <footer class="todo-footer">
      <span>🍅 {{ activeCount }} 件待完成</span>
      <span>✨ 自动保存</span>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTodo } from '../composables/useTodo.js'

const emit = defineEmits(['todo-completed'])

const {
  todos, filter, visibleTodos, activeCount,
  addTodo, toggleTodo, deleteTodo, setFilter
} = useTodo()

const inputText = ref('')

const filters = [
  { id: 'all', label: '🍅 全部' },
  { id: 'active', label: '⏳ 待完成' },
  { id: 'completed', label: '✅ 已完成' }
]

function handleSubmit() {
  const text = inputText.value.trim()
  if (!text) return
  addTodo(text)
  inputText.value = ''
}

function handleToggle(id) {
  const completed = toggleTodo(id)
  if (completed) {
    emit('todo-completed')
  }
}
</script>

<style scoped>
/* 表单 */
.todo-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  border-radius: 1rem;
  background: rgba(253, 247, 239, 0.9);
  padding: 0.5rem;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
}

.todo-input {
  min-width: 0;
  flex: 1;
  background: transparent;
  padding: 0 0.75rem;
  font-size: 1rem;
  outline: none;
  border: none;
  color: #47413c;
  font-family: inherit;
}
.todo-input::placeholder {
  color: #a8a29e;
}

.btn-add {
  flex-shrink: 0;
  border-radius: 0.75rem;
  background: #47413c;
  color: #fff;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.btn-add:hover {
  transform: translateY(-0.125rem);
  background: #57534e;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 2px rgba(242, 201, 194, 0.5);
}
.btn-add:active {
  transform: scale(0.95);
}

/* 筛选 */
.filter-nav {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.55);
  padding: 0.25rem;
  font-size: 0.875rem;
}

.filter-btn {
  border-radius: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: none;
  background: transparent;
  color: #a8a29e;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  font-size: 0.875rem;
}
.filter-btn:hover {
  background: #fff;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transform: scale(1.05);
}
.filter-btn:active {
  transform: scale(0.95);
}

.filter-active {
  background: #fff;
  color: #47413c;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}

/* 列表 */
.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.7);
  padding: 0.75rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
  cursor: default;
  animation: todoEnter 280ms ease-out both;
}
.todo-item:hover {
  transform: translateY(-0.125rem);
  background: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 2px rgba(242, 201, 194, 0.3);
}

@keyframes todoEnter {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 勾选按钮 */
.check-btn {
  display: grid;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  border: 1px solid #e7e5e4;
  background: #fffaf3;
  color: transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.check-btn:hover {
  border-color: #a8b8a1;
  color: #a8b8a1;
}

.check-btn-done {
  border-color: #a8b8a1;
  background: #a8b8a1;
  color: #fff;
  animation: checkPop 220ms ease-out both;
}

@keyframes checkPop {
  0% { transform: scale(0.86); }
  65% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.check-svg {
  height: 1rem;
  width: 1rem;
}

/* 文字 */
.todo-text {
  min-width: 0;
  flex: 1;
  overflow-wrap: break-word;
  font-size: 1rem;
  line-height: 1.5;
  color: #47413c;
  transition: color 0.2s;
}

.todo-text-done {
  color: #a8a29e;
  text-decoration: line-through;
  text-decoration-color: #f2c9c2;
  text-decoration-thickness: 2px;
}

/* 删除按钮 */
.delete-btn {
  display: grid;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #d6d3d1;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}
.todo-item:hover .delete-btn {
  opacity: 1;
}
.delete-btn:hover {
  background: rgba(242, 201, 194, 0.2);
  color: #57534e;
}

.delete-svg {
  height: 1rem;
  width: 1rem;
}

/* 空状态 */
.empty-state {
  border-radius: 1.5rem;
  border: 1px dashed #e7e5e4;
  background: rgba(255, 255, 255, 0.45);
  padding: 2.5rem 1.25rem;
  text-align: center;
}

.empty-text {
  font-size: 0.875rem;
  color: #a8a29e;
  margin: 0;
}

/* 底部 */
.todo-footer {
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #a8a29e;
}
</style>
