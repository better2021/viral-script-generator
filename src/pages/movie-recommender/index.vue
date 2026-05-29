<template>
  <div class="movie-page">
    <div class="hd">
      <div class="hd-row">
        <div>
          <h1><i class="ti ti-device-tv" aria-hidden="true" style="font-size:22px;vertical-align:-3px;margin-right:8px;color:var(--accent)"></i>AI 电影推荐器</h1>
          <p>智能推荐 · 海量片库 · 一键收藏</p>
        </div>
        <button class="settings-toggle" :class="{ on: showSettings }" @click="showSettings = !showSettings" :title="tmdbConfigured ? '已配置 TMDB' : '未配置 TMDB'">
          <i class="ti ti-settings"></i>
          <span v-if="tmdbConfigured" class="dot-on"></span>
        </button>
      </div>
    </div>

    <!-- 设置面板（可折叠） -->
    <div v-if="showSettings" class="card settings-panel">
      <div class="setting-row">
        <label class="setting-lbl">TMDB API Key</label>
        <p class="setting-hint">在 <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">TMDB API 设置页</a> 申请（免费）</p>
        <div class="key-row">
          <input
            type="password"
            :value="tmdbApiKey"
            @input="onTmdbKeyInput($event.target.value)"
            placeholder="输入 TMDB API Key (v3 auth)"
            class="key-input"
          />
          <button v-if="tmdbApiKey" class="small-btn" @click="clearTmdbConfig">清除</button>
        </div>
      </div>

      <div class="setting-divider"></div>

      <div class="setting-row">
        <label class="setting-lbl">AI 推荐模型</label>
        <p class="setting-hint">用于分析你的推荐需求并生成搜索参数</p>
        <div class="key-row">
          <select :value="aiModel" @change="onAiModelChange($event.target.value)" class="key-input">
            <option v-for="m in aiModels" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <div class="setting-row" v-if="!aiStoredApiKey">
        <label class="setting-lbl">{{ currentAiModel?.apiKeyLabel || 'AI API Key' }}</label>
        <div class="key-row">
          <input
            type="password"
            v-model="aiApiKeyInput"
            :placeholder="currentAiModel?.apiKeyPlaceholder || '输入 API Key'"
            class="key-input"
          />
          <button class="small-btn" @click="saveAiApiKey" :disabled="!aiApiKeyInput.trim()">保存</button>
        </div>
      </div>
      <div class="setting-row" v-else>
        <label class="setting-lbl">{{ currentAiModel?.apiKeyLabel || 'AI API Key' }}</label>
        <span class="key-saved"><i class="ti ti-check"></i> Key 已配置（{{ aiModel }}）</span>
        <button class="small-btn" @click="clearAiApiKey">清除</button>
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
    <div class="ai-section">
      <div class="ai-label">
        <i class="ti ti-sparkles" aria-hidden="true"></i> AI 智能推荐
      </div>
      <div class="ai-row">
        <div class="ai-input-wrap">
          <input
            type="text"
            v-model="aiQuery"
            placeholder="描述你的需求，如：推荐像《霸王别姬》那样有时代感的电影"
            @keyup.enter="aiRecommend"
            class="ai-input"
          />
          <button
            v-if="voiceSupported"
            class="voice-btn"
            :class="{ recording: isListening }"
            :title="isListening ? '点击停止录音' : '语音输入'"
            @click="toggleVoiceInput"
          >
            <i class="ti ti-microphone" aria-hidden="true"></i>
          </button>
        </div>
        <button
          class="ai-btn"
          :class="{ loading: aiRecommending }"
          :disabled="aiRecommending"
          @click="handleAiRecommend"
        >
          <i v-if="aiRecommending" class="ti ti-loader" aria-hidden="true"></i>
          <i v-else class="ti ti-wand" aria-hidden="true"></i>
          {{ aiRecommending ? '分析中...' : 'AI 推荐' }}
        </button>
      </div>
      <p v-if="!tmdbConfigured" class="ai-hint">
        <i class="ti ti-info-circle" aria-hidden="true"></i> 请先在上方设置中配置 TMDB API Key
      </p>
    </div>

    <!-- AI 推理说明 -->
    <div class="reasoning" v-if="aiReasoning">
      <i class="ti ti-info-circle" aria-hidden="true"></i> {{ aiReasoning }}
    </div>

    <!-- 错误提示 -->
    <div class="error-msg" v-if="error || aiRecommendationError">
      <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ error || aiRecommendationError }}
    </div>

    <!-- 结果列表 -->
    <div class="results" v-if="!loading && movies.length">
      <div class="result-hd">
        <span v-if="query || genre">找到 {{ movies.length }} 部影片</span>
        <span v-else-if="aiReasoning">AI 推荐结果</span>
        <span v-else>热门推荐</span>
        <span class="result-count">{{ movies.length }} 部</span>
      </div>
      <MovieList
        :movies="movies"
        @select="selectMovie"
      />
    </div>

    <!-- 加载中 -->
    <div class="loading-state" v-if="loading">
      <i class="ti ti-loader" aria-hidden="true"></i>
      <p>{{ loadingStage || (aiRecommending ? 'AI 推荐中...' : '正在搜索...') }}</p>
    </div>

    <!-- 空状态 -->
    <div class="empty" v-else-if="!loading && searched && !movies.length && !error && !aiRecommendationError">
      <i class="ti ti-mood-empty" aria-hidden="true"></i>
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
  if (isListening.value) {
    stopVoiceInput()
    return
  }
  startVoiceInput()
}

function startVoiceInput() {
  if (!SpeechRecognitionAPI) return

  // 点击录音时清空输入框
  aiQuery.value = ''

  const recog = new SpeechRecognitionAPI()
  recog.lang = 'zh-CN'
  recog.continuous = true
  recog.interimResults = true

  recog.onresult = (event) => {
    // 每次从 event.results 完整重建文字，确保实时显示
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
      voiceError.value = `语音识别错误: ${event.error}`
    }
    isListening.value = false
  }

  recog.onend = () => {
    isListening.value = false
  }

  recognitionInstance = recog
  isListening.value = true
  voiceError.value = ''
  recog.start()
}

function stopVoiceInput() {
  if (recognitionInstance) {
    recognitionInstance.stop()
    recognitionInstance = null
  }
  isListening.value = false
}

/** 优先使用 TMDB 类型列表，无 TMDB 时用本地类型 */
const displayGenres = computed(() => {
  return tmdbGenres.value.length ? tmdbGenres.value : genres
})

function handleSearch() {
  search()
}

/** 点击 AI 推荐：先停止录音，再发起推荐 */
function handleAiRecommend() {
  stopVoiceInput()
  aiRecommend()
}

// 无 TMDB Key 时首次加载本地热门
onMounted(() => {
  if (!tmdbApiKey.value) {
    search()
  }
})

// 卸载时停止语音识别
onUnmounted(() => {
  stopVoiceInput()
})

</script>

<style scoped>
.movie-page {
  padding: 0;
}
.hd {
  margin-bottom: 1.25rem;
}
.hd-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.hd h1 {
  font-size: 22px;
  font-weight: 600;
  color: #f5f5f7;
  letter-spacing: -0.3px;
}
.hd p {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* 设置按钮 */
.settings-toggle {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0.5px solid var(--border-secondary);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;
  font-size: 16px;
  margin-top: 2px;
}
.settings-toggle:hover,
.settings-toggle.on {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  border-color: var(--accent);
}
.dot-on {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #30d158;
}

/* 设置面板 */
.settings-panel {
  margin-bottom: 1rem;
}
.setting-row {
  margin-bottom: 12px;
}
.setting-row:last-child {
  margin-bottom: 0;
}
.setting-lbl {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.setting-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}
.setting-hint a {
  color: var(--accent);
  text-decoration: none;
}
.setting-hint a:hover {
  text-decoration: underline;
}
.setting-divider {
  height: 0.5px;
  background: var(--border-secondary);
  margin: 12px 0;
}
.key-row {
  display: flex;
  gap: 6px;
}
.key-input {
  flex: 1;
  padding: 8px 10px;
  font-size: 13px;
  border: 0.5px solid var(--border-secondary);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}
.key-input:focus {
  border-color: var(--accent);
}
.key-input::placeholder {
  color: var(--text-tertiary);
}
select.key-input {
  cursor: pointer;
  appearance: auto;
}
.small-btn {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  border: 0.5px solid var(--border-secondary);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.small-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
.small-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.key-saved {
  font-size: 12px;
  color: #30d158;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* AI 推荐区 */
.ai-section {
  margin-top: 1rem;
  margin-bottom: 0.75rem;
}
.ai-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}
.ai-row {
  display: flex;
  gap: 8px;
}
.ai-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 54px 14px 18px;
  font-size: 14px;
  border: 0.5px solid var(--border-secondary);
  border-radius: var(--radius-md);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}
.ai-input:focus {
  border-color: var(--accent);
}
.ai-input::placeholder {
  color: var(--text-tertiary);
  font-size: 13px;
}
.ai-input-wrap {
  position: relative;
  flex: 1;
}
.ai-input-wrap .ai-input {
  padding-right: 54px;
}
.voice-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-size: 17px;
}
.voice-btn:hover {
  color: var(--accent);
  background: rgba(0, 122, 255, 0.1);
}
.voice-btn.recording {
  color: #ff453a;
  background: rgba(255, 69, 58, 0.12);
  animation: voice-pulse 1.2s ease-in-out infinite;
}
@keyframes voice-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 69, 58, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(255, 69, 58, 0); }
}
.ai-btn {
  padding: 14px 24px;
  font-size: 14px;
  font-weight: 500;
  border: none;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.ai-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
.ai-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.ai-btn.loading {
  background: linear-gradient(135deg, #667eea, #764ba2);
}
.ai-btn i.ti-loader {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.ai-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* AI 推理 */
.reasoning {
  padding: 10px 14px;
  background: rgba(102, 126, 234, 0.1);
  border: 0.5px solid rgba(102, 126, 234, 0.25);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  line-height: 1.5;
}

.results {
  margin-top: 1.25rem;
}
.result-hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.result-count {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 400;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-tertiary);
}
.loading-state i {
  font-size: 28px;
  display: block;
  margin-bottom: 12px;
  animation: spin 1s linear infinite;
}
.loading-state p {
  font-size: 14px;
}

.empty {
  text-align: center;
  padding: 3rem 0;
  color: var(--text-tertiary);
}
.empty i {
  font-size: 32px;
  display: block;
  margin-bottom: 12px;
}
.empty p {
  font-size: 14px;
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
}
</style>
