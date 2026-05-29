<template>
  <div
    class="sb"
    :class="{ hook: isFirst, end: isLast }"
  >
    <div class="slbl">
      镜头 {{ label }}{{ isFirst ? ' — 钩子开场' : isLast ? ' — 互动收尾' : '' }}
    </div>
    <div class="stxt">{{ text }}</div>
    <div class="shint">
      <i class="ti ti-camera" aria-hidden="true" style="font-size:11px"></i> {{ hint }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  label: { type: String, required: true },
  text: { type: String, required: true },
  hint: { type: String, required: true },
  isFirst: { type: Boolean, default: false },
  isLast: { type: Boolean, default: false },
})
</script>

<style scoped>
.sb {
  background: rgba(255, 255, 255, 0.05);
  border: 0.5px solid var(--border-secondary);
  border-radius: var(--radius-md);
  padding: 1rem 1.1rem;
  margin-bottom: 10px;
  border-left: 3px solid var(--accent);
}
.sb.hook {
  border-left-color: var(--accent-orange);
}
.sb.end {
  border-left-color: var(--accent-green);
}
.slbl {
  font-size: 11px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 4px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.sb.hook .slbl {
  color: var(--accent-orange);
}
.sb.end .slbl {
  color: var(--accent-green);
}
.stxt {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.7;
}
.shint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
  font-style: italic;
}
</style>
