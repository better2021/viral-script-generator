<template>
  <div class="app">
    <div class="hd">
      <h1><i class="ti ti-movie" aria-hidden="true" style="font-size:22px;vertical-align:-3px;margin-right:8px;color:var(--accent)"></i>爆火视频文案生产器</h1>
      <p>AI 驱动 · 多模型支持 · 一键生成分镜脚本</p>
    </div>

    <ScriptForm
      :topic="topic"
      :platform="platform"
      :duration="duration"
      :style="style"
      :ref-url="refUrl"
      :has-url="hasUrl()"
      :ai-model="aiModel"
      :api-key-input="apiKeyInput"
      :has-api-key="!!storedApiKey"
      :loading="loading"
      :error="error"
      @update:topic="topic = $event"
      @update:platform="platform = $event"
      @update:duration="duration = $event"
      @update:style="style = $event"
      @update:ref-url="refUrl = $event"
      @update:ai-model="onModelChange"
      @update:api-key-input="apiKeyInput = $event"
      @generate="handleGenerate"
    />

    <div class="res" :class="{ on: resultVisible }">
      <SceneTimeline v-if="resultVisible && !isStreaming && resultData.scenes.length" :visuals="sceneVisuals" />
      <div v-if="resultVisible && !isStreaming && resultData.scenes.length" class="enhance-actions">
        <button class="btn" @click="handleEnhance('polish')">润色脚本</button>
        <button class="btn" @click="handleEnhance('compress')">压缩脚本</button>
      </div>
      <StatsBar
        v-if="!isStreaming"
        :scenes="resultData.scenes"
        :duration="duration"
        :covers="resultData.covers.length"
        :tags="resultData.tags.length"
      />

      <!-- 流式打字机面板 -->
      <div v-if="isStreaming" class="card glass streaming-card">
        <div class="streaming-hd">
          <span class="streaming-dot"></span>
          <span>AI 正在生成</span>
        </div>
        <div class="streaming-body" ref="streamingBodyRef">
          <code>{{ streamingText }}</code>
          <span class="cursor">|</span>
        </div>
      </div>

      <div v-else class="card glass" style="padding-bottom:0.5rem">
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab"
            :class="{ on: activeTab === tab.key }"
            @click="switchTab(tab.key)"
          >{{ tab.label }}</button>
        </div>

        <!-- 分镜脚本 -->
        <div class="tp" :class="{ on: activeTab === 'sc' }">
          <p class="source-hint" v-if="aiGenerated">
            <i class="ti ti-sparkles" aria-hidden="true" style="font-size:11px"></i> AI 生成 · 内容仅供参考
          </p>
          <SceneBlock
            v-for="(scene, idx) in resultData.scenes"
            :key="idx"
            :label="String(scene.i).padStart(2, '0')"
            :text="scene.text"
            :hint="scene.hint"
            :is-first="idx === 0"
            :is-last="idx === resultData.scenes.length - 1"
          />
        </div>

        <!-- 剪映导入版 -->
        <div class="tp" :class="{ on: activeTab === 'jy' }">
          <p class="tip"><i class="ti ti-info-circle" aria-hidden="true" style="vertical-align:-2px"></i> 纯净版 · 直接粘贴到剪映「图文成片」文本框</p>
          <div class="ca">{{ jianyinText }}</div>
          <div class="arow">
            <CopyButton :text="jianyinText" label="一键复制" color="blue" />
            <button class="btn" @click="handleRegen"><i class="ti ti-refresh" aria-hidden="true"></i>重新生成</button>
          </div>
        </div>

        <!-- 封面文案 -->
        <div class="tp" :class="{ on: activeTab === 'cv' }">
          <p class="sec-lbl">视觉封面预览</p>
          <div class="cover-grid">
            <CoverPreview
              v-for="(cover, idx) in previewCovers"
              :key="idx"
              :main="cover.main"
              :sub="cover.sub"
              :tags="cover.tags"
              :is-dy="resultData.plat === 'dy'"
              @copy="cpText"
            />
          </div>
          <p class="sec-lbl">更多封面文案备选</p>
          <div v-if="altCovers.length">
            <div class="alt-item" v-for="(cover, idx) in altCovers" :key="idx">
              <div>
                <div class="alt-main">{{ cover.main.replace(/\n/g, ' · ') }}</div>
                <div class="alt-sub">{{ cover.sub }}</div>
              </div>
              <button class="tcopy" @click="cpText(cover.main + '\n' + cover.sub)">复制</button>
            </div>
          </div>
          <p v-else style="font-size:13px;color:var(--text-tertiary)">当前无更多封面方案</p>
          <div class="arow">
            <CopyButton :text="coverAllText" label="复制全部封面文案" color="blue" icon-class="ti ti-copy" />
          </div>
        </div>

        <!-- 标题备选 -->
        <div class="tp" :class="{ on: activeTab === 'ti' }">
          <p class="sec-lbl">标题备选</p>
          <div class="titem" v-for="(title, idx) in resultData.titles" :key="idx">
            <span>{{ title }}</span>
            <button class="tcopy" @click="cpText(title)">复制</button>
          </div>
        </div>

        <!-- 话题标签 -->
        <div class="tp" :class="{ on: activeTab === 'ht' }">
          <p class="sec-lbl">推荐话题标签</p>
          <span class="htag" v-for="(tag, idx) in resultData.tags" :key="idx">#{{ tag }}</span>
          <div class="arow" style="margin-top:12px">
            <CopyButton :text="hashtagText" label="复制所有标签" color="blue" icon-class="ti ti-copy" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, watch } from 'vue'
import ScriptForm from './components/ScriptForm.vue'
import StatsBar from './components/StatsBar.vue'
import SceneBlock from './components/SceneBlock.vue'
import CoverPreview from './components/CoverPreview.vue'
import CopyButton from './components/CopyButton.vue'
import SceneTimeline from './components/SceneTimeline.vue'
import { useGenerator } from './composables/useGenerator.js'

const {
  topic, platform, duration, style, refUrl,
  aiModel, apiKeyInput, loading, error,
  streamingText, isStreaming,
  resultVisible, activeTab, resultData,
  storedApiKey, loadStoredKey,
  hasUrl, genWithAI, saveApiKey, switchTab,
  getJianyinText, getCopyText,
  getSceneVisuals, enhanceScript,
} = useGenerator()

const aiGenerated = ref(false)

const streamingBodyRef = ref(null)
watch(streamingText, () => {
  nextTick(() => {
    if (streamingBodyRef.value) {
      streamingBodyRef.value.scrollTop = streamingBodyRef.value.scrollHeight
    }
  })
})

const tabs = [
  { key: 'sc', label: '分镜脚本' },
  { key: 'jy', label: '剪映导入版' },
  { key: 'cv', label: '封面文案' },
  { key: 'ti', label: '标题备选' },
  { key: 'ht', label: '话题标签' },
]

const jianyinText = computed(() => getJianyinText())
const coverAllText = computed(() => getCopyText('cv'))
const hashtagText = computed(() => getCopyText('ht'))
const sceneVisuals = computed(() => getSceneVisuals())

const previewCovers = computed(() => resultData.covers.slice(0, 2))
const altCovers = computed(() => resultData.covers.slice(2))

function onModelChange(val) {
  aiModel.value = val
  apiKeyInput.value = ''
  saveApiKey()
  loadStoredKey()
}

async function handleGenerate() {
  const ok = await genWithAI()
  if (ok) {
    aiGenerated.value = true
  }
}

async function handleEnhance(mode) {
  const ok = await enhanceScript(mode)
  if (ok) {
    aiGenerated.value = true
  }
}

async function handleRegen() {
  const ok = await genWithAI()
  if (ok) {
    aiGenerated.value = true
  }
}

async function cpText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 静默失败
  }
}

</script>

<style scoped>
.app {
  padding: 0;
  max-width: 100%;
}

.hd {
  margin-bottom: 1.25rem;
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
  line-height: 1.5;
}

.res { display: none; }
.res.on { display: block; }

.source-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.tab {
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  background: transparent;
  font-family: inherit;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.tab:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.tab.on {
  background: rgba(0, 122, 255, 0.15);
  color: var(--accent);
}

.tp { display: none; }
.tp.on { display: block; }

.tip {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 10px;
}

.ca {
  background: var(--bg-secondary);
  border: 0.5px solid var(--border-secondary);
  border-radius: var(--radius-md);
  padding: 1rem 1.1rem;
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.9;
  white-space: pre-wrap;
  font-family: var(--font-mono);
  min-height: 140px;
}

.arow {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: inherit;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn:hover {
  background: var(--bg-tertiary);
}

.cover-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.alt-item {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}
.alt-main {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}
.alt-sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.tcopy {
  font-size: 12px;
  padding: 4px 12px;
  border: 0.5px solid var(--border-primary);
  border-radius: 20px;
  cursor: pointer;
  background: transparent;
  color: var(--text-secondary);
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.tcopy:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.titem {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  font-size: 14px;
  color: var(--text-primary);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.htag {
  font-size: 13px;
  padding: 5px 12px;
  border-radius: 20px;
  background: rgba(0, 122, 255, 0.12);
  color: var(--accent);
  display: inline-block;
  margin: 3px;
  font-weight: 500;
}

.sec-lbl {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
  margin-top: 16px;
  letter-spacing: 0.02em;
}
.sec-lbl:first-child {
  margin-top: 0;
}

.card {
  background: var(--bg-primary);
  border: 0.5px solid var(--border-primary);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.card.glass {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.enhance-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 1rem;
}

.enhance-actions .btn {
  min-width: 130px;
}

/* ---- 流式打字机面板 ---- */
.streaming-card {
  min-height: 180px;
  display: flex;
  flex-direction: column;
}
.streaming-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
.streaming-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: s-pulse 1.2s ease-in-out infinite;
  flex-shrink: 0;
}
@keyframes s-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.streaming-body {
  flex: 1;
  background: rgba(0, 0, 0, 0.3);
  border-radius: var(--radius-md);
  padding: 1rem 1.1rem;
  font-family: var(--font-mono, 'SF Mono', 'Fira Code', monospace);
  font-size: 13px;
  line-height: 1.7;
  color: #cdd6f4;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 420px;
  overflow-y: auto;
  min-height: 100px;
}
.streaming-body code {
  font-family: inherit;
  color: inherit;
  background: none;
}
.cursor {
  display: inline-block;
  margin-left: 2px;
  color: var(--accent);
  font-weight: 700;
  animation: s-blink 0.7s step-end infinite;
}
@keyframes s-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
