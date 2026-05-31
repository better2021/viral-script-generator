<template>
  <div class="app-shell">
    <nav class="feature-nav">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="nav-btn"
        :class="{ active: feature === item.id }"
        @click="feature = item.id"
      >
        <i :class="item.icon"></i> {{ item.label }}
      </button>
    </nav>
    <ViralScriptPage v-show="feature === 'viral-script'" />
    <MovieRecommenderPage v-show="feature === 'movie'" />
    <MindDiffuserPage v-show="feature === 'mind-diffuser'" />
    <PomodoroTodoPage v-show="feature === 'pomodoro-todo'" />
    <QRCodeGeneratorPage v-show="feature === 'qrcode-generator'" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ViralScriptPage from './App.vue'
import MovieRecommenderPage from './pages/movie-recommender/index.vue'
import MindDiffuserPage from './pages/mind-diffuser/index.vue'
import PomodoroTodoPage from './pages/pomodoro-todo/index.vue'
import QRCodeGeneratorPage from './pages/qrcode-generator/index.vue'

const navItems = [
  { id: 'viral-script', label: '视频文案', icon: 'ti ti-movie' },
  { id: 'movie', label: '电影推荐', icon: 'ti ti-device-tv' },
  { id: 'mind-diffuser', label: '思维扩散', icon: 'ti ti-bulb' },
  { id: 'pomodoro-todo', label: '番茄任务', icon: 'ti ti-checklist' },
  { id: 'qrcode-generator', label: '二维码生成', icon: 'ti ti-qrcode' },
]

const feature = ref('viral-script')
</script>

<style scoped>
.app-shell {
  width: 100%;
}
.feature-nav {
  display: flex;
  gap: 4px;
  margin: 30px 0;
  background: rgba(255, 255, 255, 0.04);
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 4px;
  position: relative;
  z-index: 100;
}
.nav-btn {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
}
.nav-btn.active {
  background: rgba(0, 122, 255, 0.15);
  color: var(--accent);
}
</style>
