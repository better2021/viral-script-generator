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
          <p class="card-date" :style="gradientStyle">{{ dateText }}</p>
          <p class="card-quote" :style="gradientStyle">「{{ dailyQuote }}」</p>
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
import { ref, computed } from 'vue'
import { useStarfield, useParticleTrail, useFloatingTomatoes } from './composables/useCanvasEffects.js'
import PomodoroTimer from './components/PomodoroTimer.vue'
import TodoSection from './components/TodoSection.vue'
import PraiseModal from './components/PraiseModal.vue'

const starfieldRef = ref(null)
const particleRef = ref(null)
const floatingRef = ref(null)
const showPraise = ref(false)

/** 中文星期映射 */
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 每日鼓励语列表 */
const DAILY_QUOTES = [
  '慢慢来，比较快。',
  '完成比完美更重要。',
  '每一个番茄钟都是前进的一步。',
  '专注当下，未来自然会来。',
  '你比你想象中更有力量。',
  '休息不是偷懒，是为了走更远的路。',
  '种一棵树最好的时间是十年前，其次是现在。',
  '不积跬步，无以至千里。',
  '你今天的努力，是明天幸运的伏笔。',
  '有时候慢下来，才能走得更远。',
  '自律即自由。',
  '坚持不是长跑，是无数个重新开始。',
  '小步快跑，持续迭代。',
  '不要和他人比较，和昨天的自己比。',
  '做的每一件小事，都在塑造未来的你。',
  '心静下来，事情就简单了。',
  '行动是治愈焦虑的良药。',
  '你的注意力在哪里，收获就在哪里。',
  '今天不想跑，所以才去跑。',
  '温柔而坚定地前进吧。',
  '哪怕只完成一件，也比什么都没做强。',
  '专注于过程，结果自然水到渠成。',
  '给自己的耐心，是最好的礼物。',
  '关掉干扰，打开可能。',
  '一天之计在于晨，一个番茄钟在于开始。',
  '番茄钟滴答，你在变强大。',
  '允许自己慢慢进步。',
  '不要等准备好了才行动，在行动中准备。',
  '每一个完成的任务，都是对自己的承诺。',
  '宁静致远，专注成事。',
]

/** 根据日期字符串生成确定性的索引，保证每日同一句话 */
function pickDailyQuote() {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i)
    hash |= 0
  }
  return DAILY_QUOTES[Math.abs(hash) % DAILY_QUOTES.length]
}

/** 根据日期生成渐变色，每日不同 */
function dailyGradient() {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i)
    hash |= 0
  }
  const h = Math.abs(hash) % 360
  // 取互补色附近，保证从 h 渐变到 h2 跨度约 40-80 度
  const h2 = (h + 40 + Math.abs(hash >> 8) % 40) % 360
  return {
    backgroundImage: `linear-gradient(to right, hsl(${h}, 70%, 50%), hsl(${h2}, 75%, 45%))`,
  }
}

const dateText = computed(() => {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = WEEKDAYS[d.getDay()]
  return `${y}年${m}月${day}日 星期${w}`
})
const dailyQuote = ref(pickDailyQuote())
const gradientStyle = ref(dailyGradient())

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

.card-date {
  margin: 0.75rem 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.card-quote {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  font-style: italic;
  line-height: 1.5;
  font-weight: 500;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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
