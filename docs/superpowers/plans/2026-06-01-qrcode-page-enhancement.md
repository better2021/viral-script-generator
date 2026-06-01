# QR 码页面优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为二维码生成页面增加颜色定制、纠错等级、尺寸选择、复制图片和历史记录功能

**Architecture:** 单文件改造 `src/pages/qrcode-generator/index.vue`，所有新增功能使用 qrcode 库已有 API 能力，历史记录存储到 localStorage

**Tech Stack:** Vue 3 + qrcode npm 包

---

### Task 1: 更新 Template — 输入区 + 选项面板 + 历史记录

**Files:**
- Modify: `src/pages/qrcode-generator/index.vue:1-31` (template 全部替换)

- [ ] **Step 1: 替换全部 template 内容**

```html
<template>
  <div class="qrcode-page">
    <div class="page-card">
      <h1 class="page-title">二维码生成</h1>
      <p class="page-desc">输入文本或链接，一键生成二维码</p>

      <!-- 输入区 -->
      <div class="input-row">
        <div class="input-wrap">
          <input
            v-model="text"
            type="text"
            class="text-input"
            placeholder="输入文本或粘贴 URL 链接..."
            maxlength="500"
            @keyup.enter="generate"
          />
          <button v-if="text" class="btn-clear" title="清空" @click="clearAll">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <button class="btn-generate" :disabled="!text.trim()" @click="generate">
          <i class="ti ti-qrcode"></i> 生成二维码
        </button>
      </div>

      <!-- 二维码展示区 -->
      <div v-show="generated" class="qr-section">
        <div class="qr-wrapper">
          <canvas ref="canvasRef" class="qr-canvas"></canvas>
        </div>

        <!-- 自定义选项面板 -->
        <div class="options-panel">
          <div class="option-row">
            <span class="option-label">前景色</span>
            <input type="color" v-model="fgColor" class="color-picker" @input="regenerate" />
            <span class="option-label">背景色</span>
            <input type="color" v-model="bgColor" class="color-picker" @input="regenerate" />
          </div>

          <div class="option-row">
            <span class="option-label">纠错</span>
            <div class="seg-control">
              <button
                v-for="level in errorLevels"
                :key="level.value"
                class="seg-btn"
                :class="{ active: errorLevel === level.value }"
                @click="errorLevel = level.value; regenerate()"
              >
                {{ level.label }}
                <small>{{ level.desc }}</small>
              </button>
            </div>
          </div>

          <div class="option-row">
            <span class="option-label">尺寸</span>
            <div class="seg-control">
              <button
                v-for="s in sizes"
                :key="s.value"
                class="seg-btn"
                :class="{ active: size === s.value }"
                @click="size = s.value; regenerate()"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-row">
          <button class="btn-action" @click="download">
            <i class="ti ti-download"></i> 下载 PNG
          </button>
          <button class="btn-action" @click="copyImage">
            <i class="ti ti-copy"></i> 复制图片
          </button>
        </div>

        <p class="qr-hint" :title="text">{{ text }}</p>
      </div>

      <!-- 历史记录 -->
      <div v-if="history.length" class="history-section">
        <div class="history-header">
          <span class="history-title"><i class="ti ti-clock"></i> 最近记录</span>
          <button class="btn-clear-history" @click="clearHistory">清空</button>
        </div>
        <ul class="history-list">
          <li
            v-for="item in history"
            :key="item.id"
            class="history-item"
            @click="restoreHistory(item)"
          >
            <i class="ti ti-history"></i>
            <span class="history-text">{{ item.text }}</span>
            <span class="history-time">{{ item.time }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
```

### Task 2: 更新 Script — 全部状态与逻辑

**Files:**
- Modify: `src/pages/qrcode-generator/index.vue:32-74` (script 全部替换)

- [ ] **Step 1: 替换全部 script 内容**

```html
<script setup>
import { ref, nextTick } from 'vue'
import QRCode from 'qrcode'

/* ---- 常量 ---- */
const STORAGE_HISTORY_KEY = 'qrcode-history-list'
const MAX_HISTORY = 8

const errorLevels = [
  { value: 'L', label: 'L', desc: '7%' },
  { value: 'M', label: 'M', desc: '15%' },
  { value: 'Q', label: 'Q', desc: '25%' },
  { value: 'H', label: 'H', desc: '30%' },
]
const sizes = [
  { value: 180, label: '小' },
  { value: 240, label: '中' },
  { value: 320, label: '大' },
]

/* ---- 状态 ---- */
const text = ref('')
const canvasRef = ref(null)
const generated = ref(false)
const fgColor = ref('#1a1a1a')
const bgColor = ref('#ffffff')
const errorLevel = ref('M')
const size = ref(240)
const history = ref([])

/* ---- 初始化加载历史 ---- */
loadHistory()

/* ---- 生成 ---- */
async function generate() {
  const val = text.value.trim()
  if (!val) return

  generated.value = false
  await nextTick()
  await doRender(val)
  addHistory(val)
}

/** 选项变化时自动重新渲染，不新增历史记录 */
async function regenerate() {
  if (!generated.value) return
  const val = text.value.trim()
  if (!val) return
  await doRender(val)
}

/** 核心渲染逻辑 */
async function doRender(val) {
  const canvas = canvasRef.value
  if (!canvas) return

  try {
    await QRCode.toCanvas(canvas, val, {
      width: size.value,
      margin: 2,
      color: {
        dark: fgColor.value,
        light: bgColor.value,
      },
      errorCorrectionLevel: errorLevel.value,
    })
    generated.value = true
  } catch (err) {
    console.error('二维码生成失败:', err)
  }
}

/* ---- 下载 ---- */
function download() {
  const canvas = canvasRef.value
  if (!canvas) return
  const url = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = `qrcode-${Date.now()}.png`
  link.href = url
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/* ---- 复制图片到剪贴板 ---- */
async function copyImage() {
  const canvas = canvasRef.value
  if (!canvas) return
  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ])
  } catch (err) {
    // clipboard 不支持时降级为复制文本
    const val = text.value.trim()
    if (val) {
      try {
        await navigator.clipboard.writeText(val)
      } catch { /* ignore */ }
    }
  }
}

/* ---- 清空 ---- */
function clearAll() {
  text.value = ''
  generated.value = false
}

/* ---- 历史记录 ---- */
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY)
    history.value = raw ? JSON.parse(raw) : []
  } catch {
    history.value = []
  }
}

function saveHistory() {
  localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history.value))
}

function addHistory(val) {
  // 去重：已存在则移到最前
  const idx = history.value.findIndex(h => h.text === val)
  if (idx !== -1) {
    const item = history.value.splice(idx, 1)[0]
    history.value.unshift(item)
    saveHistory()
    return
  }

  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  history.value.unshift({
    id: Date.now().toString(36),
    text: val,
    time,
  })
  if (history.value.length > MAX_HISTORY) {
    history.value = history.value.slice(0, MAX_HISTORY)
  }
  saveHistory()
}

function restoreHistory(item) {
  text.value = item.text
  generate()
}

function clearHistory() {
  history.value = []
  localStorage.removeItem(STORAGE_HISTORY_KEY)
}
</script>
```

### Task 3: 更新 Style — 全部新增样式

**Files:**
- Modify: `src/pages/qrcode-generator/index.vue:80-230` (style 替换全部)

- [ ] **Step 1: 替换全部 style 内容（在现有样式基础上新增）**

保留现有的 `.qrcode-page`、`.page-card`、`.page-title`、`.page-desc`、`.input-row`、`.text-input`、`.btn-generate`、`.qr-section`、`.qr-wrapper`、`.qr-canvas`、`.qr-hint`、`@keyframes fadeIn` 样式不变，在 `.btn-generate:disabled` 后面追加以下新样式：

```css
/* ---- 输入区增强 ---- */
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.text-input {
  padding-right: 40px;
}

.btn-clear {
  position: absolute;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 16px;
  transition: all 0.15s;
}
.btn-clear:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* ---- 自定义选项面板 ---- */
.options-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 18px;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  text-align: left;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.option-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
}

.color-picker {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  padding: 0;
  cursor: pointer;
  background: none;
}
.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}
.color-picker::-webkit-color-swatch {
  border: 0.5px solid var(--border-primary);
  border-radius: 6px;
}

/* 分段按钮组 */
.seg-control {
  display: flex;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.seg-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 0.5px solid transparent;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.3;
}
.seg-btn:hover {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.04);
}
.seg-btn.active {
  border-color: var(--border-primary);
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
.seg-btn small {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.6;
}

/* ---- 操作按钮行 ---- */
.action-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-primary);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-action:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}
.btn-action:active {
  transform: scale(0.98);
}

/* ---- 历史记录 ---- */
.history-section {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 0.5px solid var(--border-primary);
  text-align: left;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.history-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-clear-history {
  font-size: 12px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}
.btn-clear-history:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 13px;
  color: var(--text-secondary);
}
.history-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.history-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.history-item i {
  font-size: 14px;
  color: var(--text-tertiary);
}
```

### Task 4: 构建验证

- [ ] **Step 1: 运行构建检查**

```bash
npm run build 2>&1
```

Expected: `✓ built in Xs`，无错误输出

### Task 5: 提交

- [ ] **Step 1: 提交代码**

```bash
git add src/pages/qrcode-generator/index.vue
git commit -m "feat: 二维码页面增加颜色/纠错/尺寸定制及历史记录"
```
