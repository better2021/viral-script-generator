<template>
  <div class="mform">
    <div class="row">
      <div class="input-wrap">
        <input
          type="text"
          :value="query"
          @input="$emit('update:query', $event.target.value)"
          @keyup.enter="$emit('search')"
          placeholder="搜索电影名称、导演、演员..."
        />
      </div>
      <div class="select-wrap">
        <select :value="genre" @change="$emit('update:genre', $event.target.value)">
          <option value="">全部类型</option>
          <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
        </select>
      </div>
      <button class="sbtn" @click="$emit('search')">
        <i class="ti ti-search" aria-hidden="true"></i>
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
.mform {
  width: 100%;
}
.row {
  display: flex;
  gap: 8px;
}
.input-wrap {
  flex: 1;
}
.select-wrap {
  width: 130px;
  flex-shrink: 0;
}
input, select {
  width: 100%;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-primary);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  transition: all 0.2s ease;
}
input:focus, select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}
select option {
  background: #1c1c1e;
  color: var(--text-primary);
}
.sbtn {
  width: 42px;
  padding: 10px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  flex-shrink: 0;
}
.sbtn:hover {
  background: var(--accent-hover);
}
</style>
