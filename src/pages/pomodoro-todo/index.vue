<template>
  <div class="pomodoro-page">
    <!-- Canvas 背景层 -->
    <canvas ref="starfieldRef" id="starfieldCanvas" aria-hidden="true"></canvas>
    <canvas ref="particleRef" id="particleCanvas" aria-hidden="true"></canvas>
    <div ref="floatingRef" id="floatingTomatoes" aria-hidden="true"></div>

    <!-- 主卡片 -->
    <main class="main-content">
      <section class="card">
        <header class="card-header">
          <p class="card-subtitle">today feels lighter</p>
          <h1 class="card-title">🍅 慢慢完成</h1>
        </header>

        <PomodoroTimer />

        <div class="divider"></div>

        <TodoSection @todo-completed="showPraise = true" />
      </section>
    </main>

    <PraiseModal :show="showPraise" @close="showPraise = false" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useStarfield, useParticleTrail, useFloatingTomatoes } from './composables/useCanvasEffects.js'
import PomodoroTimer from './components/PomodoroTimer.vue'
import TodoSection from './components/TodoSection.vue'
import PraiseModal from './components/PraiseModal.vue'

const starfieldRef = ref(null)
const particleRef = ref(null)
const floatingRef = ref(null)
const showPraise = ref(false)

useStarfield(starfieldRef)
useParticleTrail(particleRef)
useFloatingTomatoes(floatingRef)
</script>

<style scoped>
.pomodoro-page {
  width: 100%;
  min-height: 100%;
  position: relative;
}

#starfieldCanvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

#particleCanvas {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
}

#floatingTomatoes {
  position: fixed;
  inset: 0;
  z-index: 20;
  overflow: hidden;
  pointer-events: none;
}

.main-content {
  position: relative;
  z-index: 10;
  margin: 0 auto;
  display: flex;
  min-height: calc(100vh - 4rem);
  width: 100%;
  max-width: 36rem;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.card {
  width: 100%;
  border-radius: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.75);
  padding: 1.25rem;
  box-shadow: 0 24px 70px rgba(4, 12, 24, 0.28);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  transition: all 0.3s;
  animation: appEnter 580ms ease-out both;
}
.card:hover {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

@media (min-width: 640px) {
  .card {
    padding: 1.75rem;
  }
}

@keyframes appEnter {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  margin-bottom: 1.75rem;
  text-align: center;
}

.card-subtitle {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: #78716c;
}

.card-title {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 600;
  letter-spacing: normal;
  color: #47413c;
}

@media (min-width: 640px) {
  .card-title {
    font-size: 2.25rem;
  }
}

.divider {
  margin: 1.5rem 0;
  border: none;
  border-top: 1px solid rgba(231, 229, 228, 0.5);
}
</style>
