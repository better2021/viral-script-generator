<template>
  <!-- 电影推荐器 - Apple/Stripe 融合设计 -->
  <div class="movie-page">
    <!-- 页面头部 -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">AI 电影推荐器</h1>
        <p class="page-subtitle">智能推荐 · 海量片库 · 一键收藏</p>
      </div>
      <button
        class="config-btn"
        :class="{ active: showSettings, configured: tmdbConfigured }"
        @click="showSettings = !showSettings"
        :title="tmdbConfigured ? '已配置 TMDB' : '未配置 TMDB'"
      >
        <i class="ti ti-settings"></i>
        <span v-if="tmdbConfigured" class="status-dot"></span>
      </button>
    </header>

    <!-- 配置面板 -->
    <div v-if="showSettings" class="config-panel">
      <div class="config-section">
        <label class="config-label">TMDB API Key</label>
        <p class="config-hint">在 <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">TMDB API 设置页</a> 申请（免费）</p>
        <div class="config-row">
          <input
            type="password"
            :value="tmdbApiKey"
            @input="onTmdbKeyInput($event.target.value)"
            placeholder="输入 TMDB API Key (v3 auth)"
            class="config-input"
          />
          <button v-if="tmdbApiKey" class="btn-sm btn-ghost" @click="clearTmdbConfig">清除</button>
        </div>
      </div>

      <div class="config-divider"></div>

      <div class="config-section">
        <label class="config-label">AI 推荐模型</label>
        <p class="config-hint">用于分析推荐需求并生成搜索参数</p>
        <div class="config-row">
          <select :value="aiModel" @change="onAiModelChange($event.target.value)" class="config-select">
            <option v-for="m in aiModels" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <div class="config-section" v-if="!aiStoredApiKey">
        <label class="config-label">{{ currentAiModel?.apiKeyLabel || 'AI API Key' }}</label>
        <div class="config-row">
          <input
            type="password"
            v-model="aiApiKeyInput"
            :placeholder="currentAiModel?.apiKeyPlaceholder || '输入 API Key'"
            class="config-input"
          />
          <button class="btn-sm btn-primary" @click="saveAiApiKey" :disabled="!aiApiKeyInput.trim()">保存</button>
        </div>
      </div>
      <div class="config-section config-section--saved" v-else>
        <div class="config-row">
          <span class="config-saved"><i class="ti ti-check-circle"></i> Key 已配置（{{ aiModel }}）</span>
          <button class="btn-sm btn-ghost" @click="clearAiApiKey">清除</button>
        </div>
      </div>
    </div>

    <!-- 搜索表单 -->
    <MovieSearchForm
      :query="query"
      :genre="genre"
      :genres="displayGenres"
      @update:query="query = $event"
      @update:genre="genre = $event"
      @search="handleSearch"
    />

    <!-- AI 推荐区 -->
    <section class="ai-section">
      <div class="ai-header">
        <div class="ai-badge">
          <i class="ti ti-sparkles"></i> AI 智能推荐
        </div>
        <p class="ai-desc">描述你想看的电影，AI 为你精准推荐</p>
      </div>
      <div class="ai-input-group">
        <div class="ai-input-wrap">
          <input
            type="text"
            v-model="aiQuery"
            placeholder="描述你的需求，如：推荐像《霸王别姬》那样有时代感的电影"
            @keyup.enter="handleAiRecommend"
            class="ai-input"
          />
          <button
            v-if="voiceSupported"
            class="voice-btn"
            :class="{ recording: isListening }"
            :title="isListening ? '点击停止' : '语音输入'"
            @click="toggleVoiceInput"
          >
            <i class="ti ti-microphone"></i>
          </button>
        </div>
        <button
          class="ai-submit"
          :class="{ loading: aiRecommending }"
          :disabled="aiRecommending"
          @click="handleAiRecommend"
        >
          <i v-if="aiRecommending" class="ti ti-loader"></i>
          <i v-else class="ti ti-wand"></i>
          {{ aiRecommending ? '分析中...' : 'AI 推荐' }}
        </button>
      </div>
      <p v-if="!tmdbConfigured" class="ai-notice">
        请先在上方设置中配置 TMDB API Key
      </p>
    </section>

    <!-- AI 推理说明 -->
    <div v-if="aiReasoning" class="reasoning-banner">
      <i class="ti ti-info-circle"></i> {{ aiReasoning }}
    </div>

    <!-- 错误提示 -->
    <div v-if="error || aiRecommendationError" class="error-banner">
      <i class="ti ti-alert-circle"></i> {{ error || aiRecommendationError }}
    </div>

    <!-- 结果列表 -->
    <div v-if="!loading && movies.length" class="results-section">
      <div class="results-header">
        <span v-if="query || genre">搜索结果</span>
        <span v-else-if="aiReasoning">AI 推荐结果</span>
        <span v-else>热门推荐</span>
        <span class="results-count">{{ movies.length }} 部影片</span>
      </div>
      <MovieList
        :movies="movies"
        @select="selectMovie"
      />
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>{{ loadingStage || (aiRecommending ? 'AI 推荐中...' : '正在搜索...') }}</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading && searched && !movies.length && !error && !aiRecommendationError" class="empty-state">
      <i class="ti ti-mood-empty"></i>
      <p>没有找到匹配的影片，换个关键词试试</p>
    </div>

    <!-- 详情弹窗 -->
    <MovieDetailModal
      v-if="selected"
      :movie="selected"
      @close="closeDetail"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MovieSearchForm from './components/MovieSearchForm.vue'
import MovieList from './components/MovieList.vue'
import MovieDetailModal from './components/MovieDetailModal.vue'
import { useMovieRecommender } from './composables/useMovieRecommender.js'
import { AI_MODELS } from '../../templates/index.js'

const {
  query, genre, genres,
  movies, loading, error, searched,
  selected, search, selectMovie, closeDetail,
  tmdbApiKey, tmdbConfigured, showSettings, tmdbGenres,
  onTmdbKeyInput, clearTmdbConfig,
  loadingStage,
  aiQuery, aiRecommending, aiRecommendationError, aiReasoning,
  aiModel, aiApiKeyInput, aiStoredApiKey,
  onAiModelChange, saveAiApiKey, clearAiApiKey, aiRecommend,
} = useMovieRecommender()

const aiModels = AI_MODELS
const currentAiModel = computed(() => aiModels.find(m => m.value === aiModel.value))

// === 语音输入 ===
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
const voiceSupported = !!SpeechRecognitionAPI

let recognitionInstance = null
const isListening = ref(false)
const voiceError = ref('')

function toggleVoiceInput() {
  if (isListening.value) { stopVoiceInput(); return }
  startVoiceInput()
}

function startVoiceInput() {
  if (!SpeechRecognitionAPI) return
  aiQuery.value = ''
  const recog = new SpeechRecognitionAPI()
  recog.lang = 'zh-CN'
  recog.continuous = true
  recog.interimResults = true
  recog.onresult = (event) => {
    let text = ''
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript
    }
    aiQuery.value = text
  }
  recog.onerror = (event) => {
    if (event.error === 'not-allowed') {
      voiceError.value = '语音权限被拒绝，请在浏览器设置中允许麦克风'
    } else if (event.error !== 'no-speech') {
      voiceError.value = '语音识别错误: ' + event.error
    }
    isListening.value = false
  }
  recog.onend = () => { isListening.value = false }
  recognitionInstance = recog
  isListening.value = true
  voiceError.value = ''
  recog.start()
}

function stopVoiceInput() {
  if (recognitionInstance) { recognitionInstance.stop(); recognitionInstance = null }
  isListening.value = false
}

const displayGenres = computed(() => tmdbGenres.value.length ? tmdbGenres.value : genres)

function handleSearch() { search() }

function handleAiRecommend() {
  stopVoiceInput()
  aiRecommend()
}

onMounted(() => { if (!tmdbApiKey.value) search() })
onUnmounted(() => stopVoiceInput())
</script>

<style scoped>
/* ============================================
   Apple/Stripe 融合设计系统 - 电影推荐器页面
   ============================================ */

/* ---- 页面容器 ---- */
.movie-page {
  width: 100%;
  animation: pageEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pageEnter {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- 页面头部 ---- */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: var(--accent-gradient-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-top: 6px;
  font-weight: 400;
  letter-spacing: 0.02em;
}

/* ---- 配置按钮 ---- */
.config-btn {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 18px;
  backdrop-filter: blur(12px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.config-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}
.config-btn.active {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.3);
  color: var(--accent);
}
.config-btn.configured {
  color: var(--text-secondary);
}
.status-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}

/* ---- 配置面板 ---- */
.config-panel {
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(20px);
  animation: panelSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes panelSlide {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.config-section {
  margin-bottom: 16px;
}
.config-section:last-child { margin-bottom: 0; }
.config-section--saved { margin-top: 8px; }

.config-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.config-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 8px;
  line-height: 1.5;
}
.config-hint a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}
.config-hint a:hover { text-decoration: underline; }

.config-divider {
  height: 1px;
  background: linear-gradient(90deg, var(--border-secondary), transparent);
  margin: 16px 0;
}

.config-row {
  display: flex;
  gap: 8px;
}

.config-input {
  flex: 1;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.config-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  background: rgba(0, 0, 0, 0.4);
}
.config-input::placeholder { color: var(--text-tertiary); }

.config-select {
  flex: 1;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px solid var(--border-secondary);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='rgba(255,255,255,0.45)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}
.config-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
}
.config-select option { background: #1c1c1e; color: var(--text-primary); }

.config-saved {
  flex: 1;
  font-size: 13px;
  color: #22c55e;
  display: flex;
  align-items: center;
  gap: 6px;
}
.config-saved i { font-size: 15px; }

/* ---- 按钮系统 ---- */
.btn-sm {
  padding: 10px 16px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.btn-ghost {
  border: 1px solid var(--border-secondary);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
}
.btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border-color: rgba(255, 255, 255, 0.2);
}
.btn-primary {
  border: none;
  background: var(--accent-gradient);
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: scale(1.02);
}
.btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

/* ---- AI 推荐区 ---- */
.ai-section {
  margin-top: 28px;
  padding: 24px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.06), rgba(139, 92, 246, 0.06));
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: var(--radius-lg);
  position: relative;
  overflow: hidden;
}
.ai-section::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.ai-header { margin-bottom: 16px; }

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.ai-badge i { font-size: 13px; }

.ai-desc {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-top: 6px;
}

.ai-input-group {
  display: flex;
  gap: 10px;
}

.ai-input-wrap {
  position: relative;
  flex: 1;
}

.ai-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 52px 14px 18px;
  font-size: 14px;
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.4);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  backdrop-filter: blur(8px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.ai-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12), 0 0 20px rgba(99, 102, 241, 0.05);
  background: rgba(0, 0, 0, 0.5);
}
.ai-input::placeholder {
  color: var(--text-tertiary);
  font-size: 13px;
}

.voice-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.voice-btn:hover {
  color: var(--accent);
  background: rgba(99, 102, 241, 0.1);
}
.voice-btn.recording {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
  animation: pulseRing 1.5s ease-in-out infinite;
}

@keyframes pulseRing {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
}

.ai-submit {
  padding: 14px 28px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  background: var(--accent-gradient);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
}
.ai-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.35);
}
.ai-submit:active:not(:disabled) {
  transform: translateY(0);
}
.ai-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-submit i.ti-loader {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ai-notice {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ---- AI 推理说明 ---- */
.reasoning-banner {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.6;
  animation: fadeIn 0.3s ease;
}
.reasoning-banner i {
  color: var(--accent);
  margin-top: 2px;
  flex-shrink: 0;
}

/* ---- 错误提示 ---- */
.error-banner {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  font-size: 13px;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---- 结果区域 ---- */
.results-section {
  margin-top: 32px;
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.2px;
  margin-bottom: 16px;
}

.results-count {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 400;
}

/* ---- 加载状态 ---- */
.loading-state {
  text-align: center;
  padding: 64px 0;
  color: var(--text-tertiary);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--border-secondary);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 0 auto 16px;
}

.loading-state p {
  font-size: 14px;
}

/* ---- 空状态 ---- */
.empty-state {
  text-align: center;
  padding: 64px 0;
  color: var(--text-tertiary);
}
.empty-state i {
  font-size: 36px;
  display: block;
  margin-bottom: 16px;
  opacity: 0.5;
}
.empty-state p {
  font-size: 14px;
}
</style>
