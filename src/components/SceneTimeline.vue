<template>
  <div class="scene-timeline-card">
    <div class="timeline-header">
      <span>分镜结构可视化</span>
      <small>开头/中段/结尾一目了然</small>
    </div>
    <div class="timeline-bar">
      <div
        v-for="item in visuals"
        :key="item.index"
        class="timeline-segment"
        :class="item.phase"
      >
        <span class="segment-label">{{ item.index }}</span>
      </div>
    </div>
    <div class="timeline-list">
      <div v-for="item in visuals" :key="item.index" class="timeline-item">
        <div class="timeline-item-meta">
          <span class="item-order">{{ item.index }}</span>
          <span class="item-phase">{{ item.phaseLabel }}</span>
        </div>
        <div class="item-summary">{{ item.summary }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  visuals: {
    type: Array,
    default: () => [],
  },
})
</script>

<style scoped>
.scene-timeline-card {
  background: rgba(255, 255, 255, 0.04);
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-bottom: 1rem;
}
.timeline-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
  font-size: 13px;
}
.timeline-bar {
  display: flex;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  margin-bottom: 1rem;
}
.timeline-segment {
  flex: 1;
  position: relative;
}
.timeline-segment::after {
  content: attr(data-label);
}
.timeline-segment.hook {
  background: rgba(255, 142, 35, 0.8);
}
.timeline-segment.middle {
  background: rgba(56, 154, 255, 0.75);
}
.timeline-segment.ending {
  background: rgba(114, 225, 143, 0.8);
}
.segment-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.85);
  position: absolute;
  right: 6px;
  top: -18px;
}
.timeline-list {
  display: grid;
  gap: 10px;
}
.timeline-item {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 0.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}
.timeline-item-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 12px;
}
.item-order {
  display: inline-flex;
  min-width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
}
.item-phase {
  color: var(--text-primary);
  font-weight: 600;
}
.item-summary {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.4;
}
</style>
