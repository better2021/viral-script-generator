<template>
  <button class="btn" :class="{ blue: color === 'blue', green: copied }" @click="handleCopy">
    <i v-if="!copied" :class="iconClass" aria-hidden="true"></i>
    <i v-else class="ti ti-check" aria-hidden="true"></i>
    {{ copied ? '已复制！' : label }}
  </button>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  label: { type: String, default: '一键复制' },
  color: { type: String, default: 'blue' },
  iconClass: { type: String, default: 'ti ti-copy' },
})

const copied = ref(false)

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // 剪贴板不可用时静默失败
  }
}
</script>

<style scoped>
.btn {
  padding: 8px 16px;
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn:hover {
  background: var(--bg-tertiary);
}
.btn.blue {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.btn.blue:hover {
  background: var(--accent-hover);
}
.btn.green {
  background: var(--accent-green);
  color: #000;
  border-color: var(--accent-green);
}
</style>
