<template>
  <div class="qrcode-page">
    <div class="page-card">
      <h1 class="page-title">二维码生成</h1>
      <p class="page-desc">输入文本或链接，一键生成二维码</p>

      <div class="input-row">
        <input
          v-model="text"
          type="text"
          class="text-input"
          placeholder="输入文本或粘贴 URL 链接..."
          maxlength="500"
          @keyup.enter="generate"
        />
        <button class="btn-generate" :disabled="!text.trim()" @click="generate">
          <i class="ti ti-qrcode"></i> 生成二维码
        </button>
      </div>

      <div v-show="generated" class="qr-section">
        <div class="qr-wrapper">
          <canvas ref="canvasRef" class="qr-canvas"></canvas>
        </div>
        <button class="btn-download" @click="download">
          <i class="ti ti-download"></i> 下载二维码
        </button>
        <p class="qr-hint">{{ text }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import QRCode from 'qrcode'

const text = ref('')
const canvasRef = ref(null)
const generated = ref(false)

async function generate() {
  const val = text.value.trim()
  if (!val) return

  generated.value = false
  await nextTick()

  const canvas = canvasRef.value
  if (!canvas) return

  try {
    await QRCode.toCanvas(canvas, val, {
      width: 240,
      margin: 2,
      color: {
        dark: '#1a1a1a',
        light: '#ffffff'
      }
    })
    generated.value = true
  } catch (err) {
    console.error('二维码生成失败:', err)
  }
}

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
</script>

<style scoped>
.qrcode-page {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 40px;
}

.page-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg-secondary);
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 32px 28px;
  text-align: center;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 24px;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.text-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-primary);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}
.text-input::placeholder {
  color: var(--text-tertiary);
}
.text-input:focus {
  border-color: var(--accent);
}

.btn-generate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 11px 20px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.btn-generate:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
.btn-generate:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-generate:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qr-section {
  animation: fadeIn 0.3s ease-out;
}

.qr-wrapper {
  display: inline-flex;
  padding: 16px;
  border-radius: var(--radius-md);
  background: #fff;
  margin-bottom: 16px;
}

.qr-canvas {
  display: block;
  width: 240px;
  height: 240px;
}

.btn-download {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 11px 20px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-primary);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.btn-download:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}
.btn-download:active {
  transform: scale(0.98);
}

.qr-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
