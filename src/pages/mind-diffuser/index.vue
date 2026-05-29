<template>
  <div class="mind-diffuser">
    <!-- 顶部 UI -->
    <div class="ui-top">
      <!-- 标题行 -->
      <div class="top-bar">
        <div class="title">
          <span class="title-text">思维扩散器</span>
          <span class="title-sub">Mind Diffuser</span>
        </div>
        <button class="settings-toggle" :class="{ on: showSettings }" @click="showSettings = !showSettings">
          <i class="ti ti-settings" aria-hidden="true"></i>
          <span v-if="aiConfigured" class="dot-on"></span>
        </button>
      </div>

      <!-- AI 设置面板 -->
      <Transition name="fade">
        <div v-if="showSettings" class="settings-card">
          <div class="s-row">
            <label class="s-lbl">AI 模型</label>
            <select v-model="aiModel" class="s-select">
              <option v-for="m in AI_MODELS" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div class="s-row" v-if="!storedAiKey">
            <label class="s-lbl">API Key</label>
            <p class="s-hint">{{ (AI_MODELS.find(m => m.value === aiModel) || {}).keyPlaceholder }}</p>
            <div class="s-key-row">
              <input type="password" v-model="aiKeyInput" placeholder="输入 API Key" class="s-input" />
              <button class="s-btn" @click="saveAiKey" :disabled="!aiKeyInput.trim()">保存</button>
            </div>
          </div>
          <div class="s-row" v-else>
            <label class="s-lbl">API Key</label>
            <span class="s-saved"><i class="ti ti-check"></i> 已配置（{{ aiModel }}）</span>
            <button class="s-btn" @click="clearAiKey">清除</button>
          </div>
        </div>
      </Transition>

      <!-- 输入区 -->
      <div class="input-area">
        <div class="input-wrap">
          <i class="ti ti-brain input-icon" aria-hidden="true"></i>
          <input
            v-model="keyword"
            type="text"
            placeholder="输入关键词，Enter 扩散..."
            class="glow-input"
            @keyup.enter="diffuse"
          />
        </div>
        <button class="diffuse-btn" @click="diffuse">
          <i class="ti ti-sparkles" aria-hidden="true"></i>
          <span>扩散</span>
        </button>
        <button class="reset-btn" @click="resetGraph" :disabled="!rootNode">
          <i class="ti ti-trash" aria-hidden="true"></i>
          <span>重置</span>
        </button>
      </div>

      <!-- 错误提示 -->
      <Transition name="fade">
        <p v-if="errorMsg" class="error-msg"><i class="ti ti-alert-triangle"></i> {{ errorMsg }}</p>
      </Transition>
    </div>

    <!-- Canvas 扩散区：全宽 -->
    <div class="canvas-area" ref="canvasAreaRef">
      <canvas ref="canvasRef" class="main-canvas" @click="handleCanvasClick"></canvas>

      <!-- 无节点时的引导 -->
      <div class="guide" v-if="!rootNode && !isDiffusing">
        <div class="guide-icon"><i class="ti ti-click"></i></div>
        <p class="guide-text">输入关键词，点击「扩散」开始</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ============ AI 模型配置 ============
const AI_MODELS = [
  { value: 'glm', label: 'GLM (智谱)', model: 'glm-4-plus', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', keyPlaceholder: '以 glm- 开头' },
  { value: 'deepseek', label: 'DeepSeek', model: 'deepseek-chat', url: 'https://api.deepseek.com/v1/chat/completions', keyPlaceholder: '以 sk- 开头' },
  { value: 'doubao', label: '豆包 (字节)', model: 'doubao-seed-2-0-lite-260428', url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', keyPlaceholder: '火山引擎 ARK Key' },
  { value: 'kimi', label: 'Kimi (月之暗面)', model: 'moonshot-v1-32k', url: 'https://api.moonshot.cn/v1/chat/completions', keyPlaceholder: '以 sk- 开头' },
]
const AI_LS_KEY = 'viral_script_api_key_'

const canvasAreaRef = ref(null)
const canvasRef = ref(null)
const keyword = ref('')
const isDiffusing = ref(false)
const errorMsg = ref('')
const showSettings = ref(false)
const aiModel = ref('deepseek')
const aiKeyInput = ref('')
const storedAiKey = ref('')
const aiConfigured = computed(() => !!storedAiKey.value)

let canvas, ctx, animId
let W = 0, H = 0

// ============ 节点数据 ============
let nodeIdCounter = 0
let rootNode = null          // 根节点引用
let allNodes = []            // 所有节点数组
let edges = []               // 边数组 { from, to }

// ============ 粒子 ============
let particles = []
const PARTICLE_COUNT = 50

// ============ 流动画 ============
let flowTime = 0

// ============ 节点几何 ============
const NODE_RADIUS = 32
function nodeRadius(text) { return Math.max(NODE_RADIUS, 16 + text.length * 4.5) }
const LEVEL_COLORS = [
  { hue: 245, sat: 70, light: 55 },  // 紫
  { hue: 280, sat: 65, light: 50 },  // 品
  { hue: 200, sat: 70, light: 50 },  // 蓝
  { hue: 320, sat: 60, light: 50 },  // 粉
  { hue: 180, sat: 65, light: 45 },  // 青
  { hue: 260, sat: 60, light: 50 },  // 紫蓝
]

// ============ 力导向布局 ============
let simRunning = false
let simTimeout = null
const REPULSION = 80000
const ATTRACTION = 0.015
const DAMPING = 0.75
const CENTER_STRENGTH = 0.004
const MIN_SPEED = 0.05
/** 边界安全边距（像素） */
const BOUNDARY_PADDING = 60

function startSimulation() {
  simRunning = true
  if (simTimeout) clearTimeout(simTimeout)
  simTimeout = setTimeout(() => { simRunning = false }, 10000)
}

function tickSimulation() {
  if (!simRunning) return

  // 重置力
  for (const n of allNodes) {
    n.fx = 0; n.fy = 0
  }

  // 排斥力（所有节点对）
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const a = allNodes[i], b = allNodes[j]
      let dx = b.x - a.x, dy = b.y - a.y
      let dist = Math.sqrt(dx * dx + dy * dy) || 1
      const minDist = nodeRadius(a.keyword) + nodeRadius(b.keyword) + 40
      if (dist < minDist) dist = minDist
      const force = REPULSION / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.fx -= fx; a.fy -= fy
      b.fx += fx; b.fy += fy
    }
  }

  // 吸引力（沿边）
  for (const e of edges) {
    const a = e.from, b = e.to
    const dx = b.x - a.x, dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const restLen = nodeRadius(a.keyword) + nodeRadius(b.keyword) + 50
    const force = (dist - restLen) * ATTRACTION
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    a.fx += fx; a.fy += fy
    b.fx -= fx; b.fy -= fy
  }

  // 向心力 + 速度更新 + 边界约束
  let totalSpeed = 0
  for (const n of allNodes) {
    n.fx += (W / 2 - n.x) * CENTER_STRENGTH
    n.fy += (H / 2 - n.y) * CENTER_STRENGTH
    n.vx = (n.vx || 0) + n.fx
    n.vy = (n.vy || 0) + n.fy
    n.vx *= DAMPING
    n.vy *= DAMPING
    n.x += n.vx
    n.y += n.vy
    // 边界约束：节点不超出可视区域
    const r = n.radius + BOUNDARY_PADDING
    n.x = Math.max(r, Math.min(W - r, n.x))
    n.y = Math.max(r, Math.min(H - r, n.y))
    totalSpeed += Math.abs(n.vx) + Math.abs(n.vy)
  }

  if (totalSpeed < MIN_SPEED) simRunning = false
}

// ============ 添加节点 ============
function addNode(keyword, parentId) {
  const id = ++nodeIdCounter
  let x, y
  let level = 0

  if (parentId) {
    const parent = allNodes.find(n => n.id === parentId)
    if (parent) {
      level = parent.level + 1
      // 子节点以父节点为中心按固定槽位均匀分布
      const siblings = allNodes.filter(n => n.parentId === parentId)
      const siblingIdx = siblings.length
      const slots = 6  // 每父节点最多 6 个槽位
      const angle = (siblingIdx / slots) * Math.PI * 2 + (Math.random() - 0.5) * 0.2
      const dist = 110 + level * 40
      x = parent.x + Math.cos(angle) * dist
      y = parent.y + Math.sin(angle) * dist
    } else {
      x = W / 2 + (Math.random() - 0.5) * 100
      y = H / 2 + (Math.random() - 0.5) * 100
    }
  } else {
    x = W / 2
    y = H / 2
  }

  // 记录父级的预期子节点数量
  const parent = allNodes.find(n => n.id === parentId)
  if (parent) parent.childrenCount = (parent.childrenCount || 0) + 1

  const node = {
    id, keyword, parentId, level,
    x, y, vx: 0, vy: 0, fx: 0, fy: 0,
    radius: nodeRadius(keyword),
    hue: LEVEL_COLORS[level % LEVEL_COLORS.length].hue,
    childrenCount: 0,
    scale: 0,  // 入场缩放动画
  }
  allNodes.push(node)
  if (!parentId) rootNode = node

  // 边
  if (parentId) {
    const p = allNodes.find(n => n.id === parentId)
    if (p) edges.push({ from: p, to: node })
  }

  return node
}

// ============ AI 调用 ============
async function callAI(keyword, history) {
  const cfg = AI_MODELS.find(m => m.value === aiModel.value)
  if (!cfg) throw new Error('不支持的模型')

  const prompt = `你是一个思维扩散引擎。围绕「${keyword}」进行联想扩散，生成 5 个紧密相关的关键词。

扩散历史：${history || '无'}

要求：
- 从不同角度联想：相似概念、相关领域、上下游延伸、隐喻类比
- 避免简单同义词
- 中文为主
- 不要重复历史中已出现的词

JSON 格式返回（不要 markdown）：{"keywords":["词1","词2"...]}`

  const body = {
    model: cfg.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.85, max_tokens: 2048,
  }
  if (aiModel.value !== 'doubao') body.response_format = { type: 'json_object' }

  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedAiKey.value}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`AI 请求失败 (${res.status})`)

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('AI 返回为空')

  let parsed
  try { parsed = JSON.parse(content) }
  catch {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (m) parsed = JSON.parse(m[1])
    else throw new Error('AI 返回格式异常')
  }
  return Array.isArray(parsed.keywords) ? parsed.keywords : []
}

// ============ 重置 ============
function resetGraph() {
  allNodes.length = 0
  edges.length = 0
  nodeIdCounter = 0
  rootNode = null
  simRunning = false
  if (simTimeout) { clearTimeout(simTimeout); simTimeout = null }
}

// ============ 扩散入口 ============
async function diffuse() {
  const input = keyword.value.trim()
  if (!input) { errorMsg.value = '请输入关键词'; return }
  if (!aiConfigured.value) { showSettings.value = true; errorMsg.value = '请先配置 AI API Key'; return }

  errorMsg.value = ''
  isDiffusing.value = true

  try {
    const history = allNodes.map(n => n.keyword).join('、')
    const kws = await callAI(input, history)

    if (kws.length === 0) throw new Error('AI 返回为空')

    // 找父节点：图中已有该关键词 → 以它为父；否则先添加为新根节点
    let parent = allNodes.find(n => n.keyword === input)
    if (!parent) parent = addNode(input, null)

    for (const kw of kws) {
      // 避免重复
      if (allNodes.some(n => n.keyword === kw)) continue
      addNode(kw, parent ? parent.id : null)
    }
    startSimulation()
  } catch (e) {
    console.warn('AI 扩散失败:', e.message)
    // fallback: 直接添加输入词为根节点
    if (!rootNode) {
      addNode(input, null)
      // 加几个联想词
      const fallbacks = ['探索', '连接', '系统', '模式', '演化', '涌现'].filter(k => k !== input)
      for (const f of fallbacks.slice(0, 4)) {
        if (!allNodes.some(n => n.keyword === f)) addNode(f, rootNode.id)
      }
      startSimulation()
    }
  } finally {
    isDiffusing.value = false
    keyword.value = ''
  }
}

// ============ Canvas 点击处理 ============
function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect()
  const cx = e.clientX - rect.left, cy = e.clientY - rect.top

  // 反向查节点（从上层到下层）
  for (let i = allNodes.length - 1; i >= 0; i--) {
    const n = allNodes[i]
    const dx = cx - n.x, dy = cy - n.y
    if (dx * dx + dy * dy < (n.radius + 8) * (n.radius + 8)) {
      // 点击节点 → 扩散
      keyword.value = n.keyword
      diffuse()
      return
    }
  }
}

// ============ 渲染 ============
function draw() {
  ctx.clearRect(0, 0, W, H)

  // —— 背景粒子 ——
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy
    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) { p.x = Math.random() * W; p.y = Math.random() * H }
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${p.h}, 60%, 60%, ${p.a})`
    ctx.fill()
  }
  // 粒子连线
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const d = dx * dx + dy * dy
      if (d < 20000) {
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = `hsla(260, 50%, 60%, ${0.06 * (1 - d / 20000)})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
  }

  // —— 边 + 箭头 + 流光 ——
  flowTime += 0.012
  for (const e of edges) {
    const { from: a, to: b } = e
    const dx = b.x - a.x, dy = b.y - a.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const nx = dx / dist, ny = dy / dist

    // 边线（发光效果）
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = `hsla(${a.hue}, 60%, 60%, 0.25)`
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 外层辉光
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = `hsla(${a.hue}, 70%, 55%, 0.08)`
    ctx.lineWidth = 5
    ctx.stroke()

    // 箭头
    const arrowLen = 10
    const angle = Math.atan2(dy, dx)
    const endX = b.x - nx * (b.radius + 4)
    const endY = b.y - ny * (b.radius + 4)
    ctx.beginPath()
    ctx.moveTo(endX, endY)
    ctx.lineTo(endX - arrowLen * Math.cos(angle - 0.4), endY - arrowLen * Math.sin(angle - 0.4))
    ctx.moveTo(endX, endY)
    ctx.lineTo(endX - arrowLen * Math.cos(angle + 0.4), endY - arrowLen * Math.sin(angle + 0.4))
    ctx.strokeStyle = `hsla(${a.hue}, 60%, 65%, 0.4)`
    ctx.lineWidth = 2
    ctx.stroke()

    // 流光：一个发光的圆点沿边移动
    const flowPos = (flowTime % 1)
    const fx = a.x + dx * flowPos
    const fy = a.y + dy * flowPos
    const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, 8)
    glow.addColorStop(0, `hsla(${a.hue}, 80%, 70%, 0.7)`)
    glow.addColorStop(0.5, `hsla(${a.hue}, 80%, 60%, 0.15)`)
    glow.addColorStop(1, `hsla(${a.hue}, 80%, 60%, 0)`)
    ctx.beginPath()
    ctx.arc(fx, fy, 8, 0, Math.PI * 2)
    ctx.fillStyle = glow
    ctx.fill()
  }

  // —— 节点 ——
  for (const n of allNodes) {
    // 入场缩放动画
    if (n.scale < 1) n.scale = Math.min(n.scale + 0.05, 1)
    const s = n.scale

    const c = LEVEL_COLORS[n.level % LEVEL_COLORS.length]

    // 外发光
    const glowGrad = ctx.createRadialGradient(n.x, n.y, n.radius * 0.5 * s, n.x, n.y, n.radius * 2 * s)
    glowGrad.addColorStop(0, `hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0.15)`)
    glowGrad.addColorStop(1, `hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0)`)
    ctx.beginPath()
    ctx.arc(n.x, n.y, n.radius * 2 * s, 0, Math.PI * 2)
    ctx.fillStyle = glowGrad
    ctx.fill()

    // 节点主体
    const grad = ctx.createRadialGradient(n.x - n.radius * 0.3 * s, n.y - n.radius * 0.3 * s, 2, n.x, n.y, n.radius * s)
    grad.addColorStop(0, `hsla(${c.hue}, ${c.sat + 10}%, ${c.light + 15}%, 0.9)`)
    grad.addColorStop(0.6, `hsla(${c.hue}, ${c.sat}%, ${c.light}%, 0.7)`)
    grad.addColorStop(1, `hsla(${c.hue}, ${c.sat - 10}%, ${c.light - 10}%, 0.5)`)
    ctx.beginPath()
    ctx.arc(n.x, n.y, n.radius * s, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()

    // 边框（霓虹）
    ctx.beginPath()
    ctx.arc(n.x, n.y, n.radius * s, 0, Math.PI * 2)
    ctx.strokeStyle = `hsla(${c.hue}, 80%, 65%, ${0.3 + 0.2 * Math.sin(flowTime * 3 + n.id)})`
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 文字
    ctx.font = `${Math.min(12, n.radius * 0.38)}px system-ui, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // 多行截断
    const text = n.keyword.length > 8 ? n.keyword.slice(0, 7) + '…' : n.keyword
    ctx.fillText(text, n.x, n.y)
  }

  // —— 物理模拟 ——
  if (simRunning) tickSimulation()
}

function animate() {
  draw()
  animId = requestAnimationFrame(animate)
}

// ============ Canvas 初始化 ============
function resize() {
  const parent = canvasAreaRef.value
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  W = window.innerWidth
  H = window.innerHeight - rect.top
  canvas.width = W
  canvas.height = H
  // 确保粒子在 resize 后重新分布
  if (particles.length > 0) {
    for (const p of particles) {
      if (p.x > W || p.y > H) { p.x = Math.random() * W; p.y = Math.random() * H }
    }
  }
}

function initParticles() {
  particles = []
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: 1.5 + Math.random() * 2, a: 0.2 + Math.random() * 0.4,
      h: 240 + Math.random() * 60,
    })
  }
}

function initCanvas() {
  canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  resize()
  initParticles()
  animate()
}

// ============ Key 管理 ============
function loadStoredKey() {
  try { storedAiKey.value = localStorage.getItem(AI_LS_KEY + aiModel.value) || '' }
  catch { storedAiKey.value = '' }
}
function saveAiKey() {
  const key = aiKeyInput.value.trim()
  if (key) { localStorage.setItem(AI_LS_KEY + aiModel.value, key); aiKeyInput.value = ''; loadStoredKey() }
}
function clearAiKey() { localStorage.removeItem(AI_LS_KEY + aiModel.value); loadStoredKey() }

// ============ 生命周期 ============
let resizeObserver = null

onMounted(() => {
  // 先立即初始化（window.innerWidth 不依赖布局）
  initCanvas()

  // 用 ResizeObserver 监听容器尺寸变化，确保始终正确
  if (canvasAreaRef.value) {
    resizeObserver = new ResizeObserver(() => resize())
    resizeObserver.observe(canvasAreaRef.value)
  }

  // 后备：100ms 后强制刷新一次
  setTimeout(resize, 100)

  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  if (animId) cancelAnimationFrame(animId)
  if (resizeObserver) resizeObserver.disconnect()
  window.removeEventListener('resize', resize)
})
</script>

<style scoped>
.mind-diffuser {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

/* ========== 顶部 UI ========== */
.ui-top {
  flex-shrink: 0;
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem 0.75rem;
  position: relative;
  z-index: 3;
  width: 100%;
  box-sizing: border-box;
}

/* ========== Canvas 扩散区 ========== */
.canvas-area {
  flex: 1;
  position: relative;
  width: 100vw;
  max-width: 100vw;
  overflow: hidden;
  min-height: 400px;
  margin-left: calc(-50vw + 50%);
}

.main-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
}

/* ========== 标题 ========== */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}
.title { user-select: none; }
.title-text {
  display: block;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 2px;
  background: linear-gradient(135deg, #667eea, #a855f7, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 16px rgba(102,126,234,0.35));
}
.title-sub {
  display: block;
  font-size: 11px;
  color: rgba(255,255,255,0.25);
  margin-top: 4px;
  letter-spacing: 5px;
  text-transform: uppercase;
  -webkit-text-fill-color: initial;
}

.settings-toggle {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border: 0.5px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s;
  font-size: 15px;
  margin-top: 4px;
}
.settings-toggle:hover, .settings-toggle.on { background: rgba(255,255,255,0.08); color: #f5f5f7; border-color: rgba(120,80,255,0.35); }
.dot-on { position: absolute; top: 5px; right: 5px; width: 6px; height: 6px; border-radius: 50%; background: #30d158; }

/* 设置面板 */
.settings-card {
  background: rgba(0,0,0,0.4);
  border: 0.5px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  backdrop-filter: blur(16px);
}
.s-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.s-row:last-child { margin-bottom: 0; }
.s-lbl { font-size: 13px; font-weight: 500; color: #f5f5f7; min-width: 70px; }
.s-hint { font-size: 11px; color: rgba(255,255,255,0.3); width: 100%; }
.s-select { flex:1; padding:7px 10px; font-size:13px; border:0.5px solid rgba(255,255,255,0.12); border-radius:8px; background:rgba(0,0,0,0.3); color:#f5f5f7; font-family:inherit; outline:none; cursor:pointer; }
.s-key-row { display: flex; gap: 6px; width: 100%; }
.s-input { flex:1; padding:7px 10px; font-size:13px; border:0.5px solid rgba(255,255,255,0.12); border-radius:8px; background:rgba(0,0,0,0.3); color:#f5f5f7; font-family:inherit; outline:none; }
.s-input:focus { border-color:rgba(120,80,255,0.4); }
.s-btn { padding:7px 12px; font-size:12px; font-weight:500; border:0.5px solid rgba(255,255,255,0.12); border-radius:8px; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.55); cursor:pointer; font-family:inherit; white-space:nowrap; flex-shrink:0; transition:all 0.2s; }
.s-btn:hover:not(:disabled) { background:rgba(255,255,255,0.1); color:#f5f5f7; }
.s-btn:disabled { opacity:0.4; cursor:default; }
.s-saved { font-size:12px; color:#30d158; display:flex; align-items:center; gap:4px; flex:1; }

/* 输入区 */
.input-area { display: flex; gap: 8px; margin-bottom: 0.75rem; }
.input-wrap { flex:1; position:relative; display:flex; align-items:center; }
.input-icon { position:absolute; left:13px; font-size:17px; color:rgba(255,255,255,0.25); z-index:1; pointer-events:none; }
.glow-input {
  width:100%; padding:11px 13px 11px 40px; font-size:14px; font-family:inherit;
  border:1px solid rgba(255,255,255,0.1); border-radius:12px;
  background:rgba(255,255,255,0.06); backdrop-filter:blur(12px);
  color:#f5f5f7; outline:none; transition:all 0.3s;
}
.glow-input::placeholder { color:rgba(255,255,255,0.2); }
.glow-input:focus { border-color:rgba(120,80,255,0.4); box-shadow:0 0 16px rgba(120,80,255,0.12); background:rgba(255,255,255,0.08); }

.diffuse-btn {
  display:flex; align-items:center; gap:6px; padding:11px 20px; font-size:14px; font-weight:600; font-family:inherit;
  border:none; border-radius:12px; background:linear-gradient(135deg,#667eea,#764ba2); color:#fff;
  cursor:pointer; white-space:nowrap; transition:all 0.25s;
}
.diffuse-btn:hover { transform:scale(1.03); box-shadow:0 0 24px rgba(102,126,234,0.35); }
.diffuse-btn:active { transform:scale(0.96); }

.reset-btn {
  display:flex; align-items:center; gap:6px; padding:11px 18px; font-size:14px; font-weight:500; font-family:inherit;
  border:0.5px solid rgba(255,255,255,0.12); border-radius:12px;
  background:rgba(255,255,255,0.04); color:rgba(255,255,255,0.45);
  cursor:pointer; white-space:nowrap; transition:all 0.25s;
}
.reset-btn:hover:not(:disabled) { background:rgba(255,69,58,0.12); border-color:rgba(255,69,58,0.3); color:#ff453a; }
.reset-btn:active:not(:disabled) { transform:scale(0.96); }
.reset-btn:disabled { opacity:0.3; cursor:not-allowed; }

.error-msg {
  display:flex; align-items:center; gap:6px; padding:9px 13px;
  background:rgba(255,69,58,0.1); border:0.5px solid rgba(255,69,58,0.25);
  border-radius:10px; font-size:13px; color:#ff453a; margin-bottom:0.75rem;
}

.guide {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  pointer-events: none;
}
.guide-icon { font-size:42px; margin-bottom:10px; }
.guide-icon i { background:linear-gradient(135deg,#667eea,#a855f7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.guide-text { font-size:14px; color:rgba(255,255,255,0.2); }

/* 过渡 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
