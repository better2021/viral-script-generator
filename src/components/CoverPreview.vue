<template>
  <div class="cover-card">
    <div class="cover-preview" :class="isDy ? 'dy' : 'xhs'">
      <span class="platform-badge">{{ isDy ? '抖音封面' : '小红书封面' }}</span>
      <div class="cover-main" v-html="mainHtml"></div>
      <div class="cover-sub" v-html="subHtml"></div>
      <div class="cover-tags">
        <span class="cover-tag" v-for="tag in tags" :key="tag">#{{ tag }}</span>
      </div>
    </div>
    <div class="cover-footer">
      <span>封面文案</span>
      <button class="tcopy" @click="$emit('copy', fullText)">复制</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  main: { type: String, required: true },
  sub: { type: String, required: true },
  tags: { type: Array, default: () => [] },
  isDy: { type: Boolean, default: true },
})

defineEmits(['copy'])

const mainHtml = computed(() => props.main.replace(/\n/g, '<br>'))
const subHtml = computed(() => props.sub.replace(/\n/g, '<br>'))
const fullText = computed(() => props.main + '\n' + props.sub)
</script>

<style scoped>
.cover-card {
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.cover-preview {
  padding: 1.25rem 1rem;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}
.cover-preview.dy {
  background: #1a1a1a;
  color: #fff;
}
.cover-preview.xhs {
  background: #2a1515;
  color: #f5e0e0;
}
.platform-badge {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 10px;
  font-weight: 600;
}
.dy .platform-badge {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.xhs .platform-badge {
  background: #ff2442;
  color: #fff;
}
.cover-main {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}
.dy .cover-main { color: #fff; }
.xhs .cover-main { color: #f5e0e0; }
.cover-sub {
  font-size: 13px;
  line-height: 1.5;
}
.dy .cover-sub { color: rgba(255, 255, 255, 0.65); }
.xhs .cover-sub { color: rgba(245, 224, 224, 0.7); }
.cover-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.cover-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
}
.dy .cover-tag {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.75);
}
.xhs .cover-tag {
  background: rgba(255, 36, 66, 0.2);
  color: #ff6b81;
}
.cover-footer {
  padding: 10px 14px;
  border-top: 0.5px solid var(--border-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
}
.cover-footer span {
  font-size: 12px;
  color: var(--text-tertiary);
}
.tcopy {
  font-size: 12px;
  padding: 4px 12px;
  border: 0.5px solid var(--border-primary);
  border-radius: 20px;
  cursor: pointer;
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.tcopy:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
</style>
