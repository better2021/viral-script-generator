<template>
  <!-- 电影搜索表单 - Apple/Stripe 风格 -->
  <div class="search-form">
    <div class="search-row">
      <div class="search-input-wrap">
        <i class="ti ti-search search-icon"></i>
        <input
          type="text"
          :value="query"
          @input="$emit('update:query', $event.target.value)"
          @keyup.enter="$emit('search')"
          placeholder="搜索电影名称、导演、演员..."
          class="search-input"
        />
      </div>
      <div class="search-select-wrap">
        <select :value="genre" @change="$emit('update:genre', $event.target.value)" class="search-select">
          <option value="">全部类型</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <button class="search-btn" @click="$emit('search')">
        <i class="ti ti-arrow-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  query: String,
  genre: String,
  genres: { type: Array, default: () => [] },
})

defineEmits(['update:query', 'update:genre', 'search'])
</script>

<style scoped>
.search-form {
  width: 100%;
}

.search-row {
  display: flex;
  gap: 8px;
}

.search-input-wrap {
  flex: 1;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  font-size: 16px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  font-size: 14px;
  padding: 12px 14px 12px 42px;
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  backdrop-filter: blur(8px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.search-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  background: rgba(255, 255, 255, 0.06);
}
.search-input::placeholder { color: var(--text-tertiary); }

.search-select-wrap {
  width: 140px;
  flex-shrink: 0;
}

.search-select {
  width: 100%;
  height: 100%;
  padding: 12px 36px 12px 14px;
  font-size: 13px;
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='rgba(255,255,255,0.45)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.search-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
.search-select option { background: #1c1c1e; color: var(--text-primary); }

.search-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 12px;
  background: var(--accent-gradient);
  color: #fff;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.2);
}
.search-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}
.search-btn:active {
  transform: scale(0.95);
}
</style>
