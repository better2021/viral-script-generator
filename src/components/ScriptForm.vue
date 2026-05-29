<template>
  <div class="card">
    <div class="fg">
      <div class="fl">
        <label>主题 / 关键词</label>
        <input type="text" :value="topic" @input="$emit('update:topic', $event.target.value)" placeholder="例：早起习惯、护肤步骤、副业赚钱、减脂饮食..." />
      </div>
      <div>
        <label>发布平台</label>
        <select :value="platform" @change="$emit('update:platform', $event.target.value)">
          <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
      <div>
        <label>视频时长</label>
        <select :value="duration" @change="$emit('update:duration', $event.target.value)">
          <option v-for="d in durations" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
      </div>
      <div>
        <label>AI 模型</label>
        <select :value="aiModel" @change="onModelChange">
          <option v-for="m in aiModels" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
      <div class="fl" v-if="!hasApiKey">
        <label>{{ currentModel?.apiKeyLabel || 'API Key' }}</label>
        <div class="key-row">
          <input type="password" :value="apiKeyInput" @input="$emit('update:apiKeyInput', $event.target.value)" :placeholder="currentModel?.apiKeyPlaceholder || '请输入 API Key'" />
        </div>
      </div>
      <div class="fl">
        <label>内容风格</label>
        <div class="trow">
          <span
            v-for="s in styles"
            :key="s.value"
            class="tag"
            :class="{ on: style === s.value }"
            @click="$emit('update:style', s.value)"
          >{{ s.label }}</span>
        </div>
      </div>
      <div class="fl">
        <label>
          <i class="ti ti-link" aria-hidden="true" style="vertical-align:-1px;margin-right:4px"></i>
          参考爆款链接 <span style="font-weight:400;color:var(--text-tertiary)">（可选）</span>
        </label>
        <div class="url-box">
          <input type="url" :value="refUrl" @input="$emit('update:refUrl', $event.target.value)" placeholder="粘贴抖音 / 小红书视频链接..." />
          <span class="url-badge" :class="{ on: hasUrl }">已检测到链接</span>
        </div>
      </div>
    </div>

    <div class="error-msg" v-if="error">
      <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ error }}
    </div>

    <div class="btn-row">
      <button class="gbtn" :class="{ loading }" :disabled="loading" @click="$emit('generate')">
        <i v-if="loading" class="ti ti-loader" aria-hidden="true"></i>
        <i v-else class="ti ti-wand" aria-hidden="true"></i>
        {{ loading ? 'AI 生成中...' : 'AI 智能生成' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PLATFORMS, DURATIONS, STYLES, AI_MODELS } from '../templates/index.js'

const props = defineProps({
  topic: String,
  platform: String,
  duration: String,
  style: String,
  refUrl: String,
  hasUrl: Boolean,
  aiModel: String,
  apiKeyInput: String,
  hasApiKey: Boolean,
  loading: Boolean,
  error: String,
})

const emit = defineEmits([
  'generate',
  'ai-analyze',
  'update:topic',
  'update:platform',
  'update:duration',
  'update:style',
  'update:refUrl',
  'update:aiModel',
  'update:apiKeyInput',
])

const platforms = PLATFORMS
const durations = DURATIONS
const styles = STYLES
const aiModels = AI_MODELS

const currentModel = computed(() => aiModels.find(m => m.value === props.aiModel))

function onModelChange(e) {
  emit('update:aiModel', e.target.value)
}
</script>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.fg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.fl {
  grid-column: 1 / -1;
}
label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
  display: block;
  margin-bottom: 6px;
  letter-spacing: 0.02em;
}
select,
input[type='text'],
input[type='url'],
input[type='password'] {
  width: 100%;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-primary);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  font-family: inherit;
  transition: all 0.2s ease;
  outline: none;
}
select:focus,
input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
}
select option {
  background: #1c1c1e;
  color: var(--text-primary);
}

.key-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.key-row input {
  flex: 1;
}

.trow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.tag {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  border: 0.5px solid rgba(255, 255, 255, 0.2);
  color: var(--text-secondary);
  background: transparent;
  transition: all 0.2s ease;
  user-select: none;
  font-weight: 500;
}
.tag:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}
.tag.on {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.url-box {
  position: relative;
}
.url-box input {
  padding-right: 100px;
}
.url-badge {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(48, 209, 88, 0.15);
  color: var(--accent-green);
  font-weight: 500;
  pointer-events: none;
  display: none;
}
.url-badge.on {
  display: block;
}

.error-msg {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(255, 69, 58, 0.1);
  border: 0.5px solid rgba(255, 69, 58, 0.3);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: #ff453a;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.5;
}

.btn-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 1rem;
}
.gbtn {
  padding: 14px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  transition: all 0.2s ease;
}
.gbtn:hover {
  background: var(--accent-hover);
}
.gbtn:active {
  transform: scale(0.98);
}
.gbtn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.gbtn.loading {
  background: var(--accent-hover);
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.gbtn.loading .ti-loader {
  animation: spin 1s linear infinite;
}
</style>
