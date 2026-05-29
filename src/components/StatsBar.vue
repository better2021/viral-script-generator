<template>
  <div class="stats" v-if="scenes.length">
    <div class="stat">
      <div class="sv">{{ scenes.length }}</div>
      <div class="sl">分镜数量</div>
    </div>
    <div class="stat">
      <div class="sv">{{ duration || '30' }}s</div>
      <div class="sl">视频时长</div>
    </div>
    <div class="stat">
      <div class="sv">{{ covers }}</div>
      <div class="sl">封面方案</div>
    </div>
    <div class="stat">
      <div class="sv">{{ tags }}</div>
      <div class="sl">话题标签</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  scenes: { type: Array, default: () => [] },
  duration: { type: [String, Number], default: '30' },
  covers: { type: Number, default: 0 },
  tags: { type: Number, default: 0 },
})
</script>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 1rem;
}
.stat {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid var(--border-secondary);
  border-radius: var(--radius-md);
  padding: 12px 10px;
  text-align: center;
  backdrop-filter: blur(10px);
}
.sv {
  font-size: 18px;
  font-weight: 600;
  color: #f5f5f7;
  letter-spacing: -0.3px;
}
.sl {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 3px;
  font-weight: 500;
}
</style>
