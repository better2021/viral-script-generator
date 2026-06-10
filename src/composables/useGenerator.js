import { ref, reactive, watch } from 'vue'
import { HOOKS, MIDDLES, ENDINGS, TITLES, HASHTAGS, COVER_TEMPLATES, HINTS, HOOK_HINTS, ENDING_HINTS } from '../templates/index.js'
import { callAI, callAIStream, buildPrompt } from '../services/ai.js'
import { buildEnhancePrompt } from '../prompts/index.js'
import { generateCoverImage as agnesGenerateCover, generateVideo as agnesGenerateVideo } from '../services/media.js'

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fill(s, topic) {
  return s.replace(/\{t\}/g, topic)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildScenes(topic, style, dur) {
  const count = dur === '15' ? 9 : dur === '30' ? 14 : 21
  const mid = shuffle(MIDDLES[style])
  const hp = HINTS[style]

  return Array.from({ length: count }, (_, i) => {
    let text, hint
    if (i === 0) {
      text = fill(pick(HOOKS[style]), topic)
      hint = pick(HOOK_HINTS)
    } else if (i === count - 1) {
      text = fill(pick(ENDINGS[style]), topic)
      hint = pick(ENDING_HINTS)
    } else {
      text = fill(mid[i % mid.length], topic)
      hint = pick(hp)
    }
    return { i: i + 1, text, hint }
  })
}

function buildCovers(topic, style, platform) {
  const pool = COVER_TEMPLATES[style] || COVER_TEMPLATES['干货']
  const platKey = platform === 'xhs' ? 'xhs' : 'dy'
  const arr = pool[platKey] || pool['dy'] || []
  return arr.map(c => ({
    main: fill(c.main, topic),
    sub: fill(c.sub, topic),
    tags: c.tags,
    platform: platKey,
  }))
}

const LS_KEY_PREFIX = 'viral_script_api_key_'

export function useGenerator() {
  const topic = ref('')
  const platform = ref('douyin')
  const duration = ref('30')
  const style = ref('干货')
  const refUrl = ref('')
  const aiModel = ref('glm')
  const apiKeyInput = ref('')
  const loading = ref(false)
  const error = ref('')
  const streamingText = ref('')
  const isStreaming = ref(false)

  const resultVisible = ref(false)
  const activeTab = ref('sc')

  const resultData = reactive({
    scenes: [],
    titles: [],
    tags: [],
    covers: [],
    topic: '',
    plat: 'douyin',
  })

  const storedApiKey = ref('')

  function loadStoredKey() {
    try {
      storedApiKey.value = localStorage.getItem(LS_KEY_PREFIX + aiModel.value) || ''
    } catch {
      storedApiKey.value = ''
    }
  }
  // 初始化加载
  loadStoredKey()

  function hasUrl() {
    const v = refUrl.value.trim()
    return v.length > 10 && (v.startsWith('http') || v.startsWith('www'))
  }

  function saveApiKey() {
    const key = apiKeyInput.value.trim()
    if (key) {
      try {
        localStorage.setItem(LS_KEY_PREFIX + aiModel.value, key)
        apiKeyInput.value = ''
        loadStoredKey()
      } catch { /* 忽略存储错误 */ }
    }
  }

  function clearApiKey() {
    try {
      localStorage.removeItem(LS_KEY_PREFIX + aiModel.value)
      loadStoredKey()
    } catch { /* 忽略 */ }
  }

  /** 模板随机生成（降级方案） */
  function gen() {
    const t = topic.value.trim()
    if (!t) return false

    const scenes = buildScenes(t, style.value, duration.value)
    const titles = TITLES[style.value].map(s => fill(s, t))
    const tags = [...HASHTAGS[style.value], t, t + '技巧', t + '分享']
    const covers = buildCovers(t, style.value, platform.value)

    resultData.scenes = scenes
    resultData.titles = titles
    resultData.tags = tags
    resultData.covers = covers
    resultData.topic = t
    resultData.plat = platform.value === 'xhs' ? 'xhs' : 'dy'

    resultVisible.value = true
    activeTab.value = 'sc'
    error.value = ''
    return true
  }

  /** AI 生成（SSE 流式 + 打字机效果） */
  async function genWithAI() {
    const t = topic.value.trim()
    if (!t) {
      error.value = '请先输入主题关键词'
      return false
    }
    if (loading.value) return false

    const key = storedApiKey.value || apiKeyInput.value.trim()
    if (!key) {
      error.value = '请先输入 API Key'
      return false
    }

    saveApiKey()
    loading.value = true
    error.value = ''
    isStreaming.value = true
    streamingText.value = ''
    resultVisible.value = true
    activeTab.value = 'sc'

    try {
      const prompt = buildPrompt({
        topic: t,
        platform: platform.value,
        duration: duration.value,
        style: style.value,
        refUrl: refUrl.value,
      })

      // 首次生成使用稍高温度（0.85）激发创意，增强钩子冲击力
      const fullText = await callAIStream(prompt, aiModel.value, key, (text) => {
        streamingText.value = text
      }, 0.85)

      // 尝试解析 JSON，兼容可能出现的 markdown 代码块包裹
      let result
      try {
        result = JSON.parse(fullText)
      } catch {
        const cleaned = fullText
          .replace(/```json?\s*/g, '')
          .replace(/```\s*/g, '')
          .trim()
        try {
          result = JSON.parse(cleaned)
        } catch {
          throw new Error('AI 返回格式异常，无法解析')
        }
      }

      // 校验并填充场景
      const scenes = Array.isArray(result.scenes) ? result.scenes.map((s, i) => ({
        i: i + 1,
        text: s.text || '',
        hint: s.hint || '',
      })) : []
      if (!scenes.length) throw new Error('AI 未返回有效分镜')

      // 标题
      const titles = Array.isArray(result.titles) ? result.titles : []

      // 标签
      const tags = Array.isArray(result.tags) ? result.tags : []

      // 封面
      const covers = Array.isArray(result.covers) ? result.covers.map(c => ({
        main: c.main || '',
        sub: c.sub || '',
        tags: Array.isArray(c.tags) ? c.tags : [],
        platform: platform.value === 'xhs' ? 'xhs' : 'dy',
      })) : []

      resultData.scenes = scenes
      resultData.titles = titles
      resultData.tags = tags
      resultData.covers = covers
      resultData.topic = t
      resultData.plat = platform.value === 'xhs' ? 'xhs' : 'dy'

      isStreaming.value = false
      loading.value = false
      return true
    } catch (e) {
      error.value = e.message || '生成失败，请检查 API Key 和网络连接'
      isStreaming.value = false
      loading.value = false
      return false
    }
  }

  function switchTab(tab) {
    activeTab.value = tab
  }

  function getJianyinText() {
    return resultData.scenes.map(s => s.text).join('\n\n')
  }

  function getCopyText(type) {
    if (type === 'jy') return getJianyinText()
    if (type === 'ht') return resultData.tags.map(h => '#' + h).join(' ')
    if (type === 'cv') return resultData.covers.map(c => c.main + '\n' + c.sub).join('\n\n---\n\n')
    return ''
  }

  async function enhanceScript(mode) {
    const t = topic.value.trim()
    if (!t) {
      error.value = '请先输入主题关键词'
      return false
    }
    if (loading.value) return false

    const key = storedApiKey.value || apiKeyInput.value.trim()
    if (!key) {
      error.value = '请先输入 API Key'
      return false
    }
    if (!resultData.scenes.length) {
      error.value = '请先生成脚本，再进行增强'
      return false
    }

    saveApiKey()
    loading.value = true
    error.value = ''
    isStreaming.value = true
    streamingText.value = ''
    resultVisible.value = true
    activeTab.value = 'sc'

    try {
      const prompt = buildEnhancePrompt({
        scenes: resultData.scenes,
        titles: resultData.titles,
        tags: resultData.tags,
        covers: resultData.covers,
        style: style.value,
        mode,
      })

      // 增强时使用偏低温度（0.7）保持结构稳定，减少内容偏离
      const fullText = await callAIStream(prompt, aiModel.value, key, (text) => {
        streamingText.value = text
      }, 0.7)

      let result
      try {
        result = JSON.parse(fullText)
      } catch {
        const cleaned = fullText
          .replace(/```json?\s*/g, '')
          .replace(/```\s*/g, '')
          .trim()
        try {
          result = JSON.parse(cleaned)
        } catch {
          throw new Error('AI 返回格式异常，无法解析')
        }
      }

      const scenes = Array.isArray(result.scenes) ? result.scenes.map((s, i) => ({
        i: i + 1,
        text: s.text || '',
        hint: s.hint || '',
      })) : []
      if (!scenes.length) throw new Error('AI 未返回有效分镜')

      const titles = Array.isArray(result.titles) ? result.titles : []
      const tags = Array.isArray(result.tags) ? result.tags : []
      const covers = Array.isArray(result.covers) ? result.covers.map(c => ({
        main: c.main || '',
        sub: c.sub || '',
        tags: Array.isArray(c.tags) ? c.tags : [],
        platform: platform.value === 'xhs' ? 'xhs' : 'dy',
      })) : []

      resultData.scenes = scenes
      resultData.titles = titles
      resultData.tags = tags
      resultData.covers = covers
      resultData.topic = t
      resultData.plat = platform.value === 'xhs' ? 'xhs' : 'dy'

      isStreaming.value = false
      loading.value = false
      return true
    } catch (e) {
      error.value = e.message || '增强失败，请检查 API Key 和网络连接'
      isStreaming.value = false
      loading.value = false
      return false
    }
  }

  // ==================== 媒体生成（视频 + 封面图片）====================

  /** 视频生成状态 */
  const videoLoading = ref(false)
  const videoUrl = ref('')
  const videoError = ref('')

  /** 封面生成状态（每张预览卡片独立，固定 2 个条目） */
  const coverGenerations = reactive([
    { loading: false, imageUrl: '', error: '' },
    { loading: false, imageUrl: '', error: '' },
  ])

  // 脚本重新生成时重置媒体状态
  watch(() => resultData.covers, (newCovers) => {
    if (newCovers.length) {
      resetMediaStates()
    }
  })

  /** 读取 Agnes 模型专属 API Key */
  function getAgnesApiKey() {
    const key = storedApiKey.value || apiKeyInput.value.trim()
    if (key) return key
    try {
      return localStorage.getItem('viral_script_api_key_agnes') || ''
    } catch {
      return ''
    }
  }

  /** 重置所有媒体生成状态 */
  function resetMediaStates() {
    videoLoading.value = false
    videoUrl.value = ''
    videoError.value = ''
    coverGenerations[0] = { loading: false, imageUrl: '', error: '' }
    coverGenerations[1] = { loading: false, imageUrl: '', error: '' }
  }

  /**
   * 从分镜脚本生成视频
   * @param {Array} scenes - 分镜数组 [{ i, text, hint }]
   */
  async function generateVideoFromScenes(scenes) {
    if (!scenes || !scenes.length) {
      videoError.value = '暂无分镜脚本，请先生成文案'
      return false
    }
    if (videoLoading.value) return false

    const key = getAgnesApiKey()
    if (!key) {
      videoError.value = '请先配置 Agnes API Key'
      return false
    }

    // 将分镜拼接为视频提示词
    const prompt = scenes.map(s => `镜头${s.i}：${s.text}`).join('\n') +
      '\n\n风格：短视频，节奏明快，画面连贯'

    videoLoading.value = true
    videoUrl.value = ''
    videoError.value = ''

    try {
      const url = await agnesGenerateVideo({
        prompt,
        apiKey: key,
        onStatus: (status) => {
          // 可通过回调更新轮询进度（暂不暴露给 UI）
        },
      })
      videoUrl.value = url
      return true
    } catch (e) {
      videoError.value = e.message || '视频生成失败'
      return false
    } finally {
      videoLoading.value = false
    }
  }

  /**
   * 根据封面文案生成封面图片
   * @param {string} text - 封面文案（main + sub）
   * @param {number} index - coverGenerations 数组索引（0 或 1）
   */
  async function generateCoverImage(text, index) {
    if (!text || !text.trim()) {
      coverGenerations[index].error = '封面文案为空'
      return false
    }
    if (coverGenerations[index].loading) return false

    const key = getAgnesApiKey()
    if (!key) {
      coverGenerations[index].error = '请先配置 Agnes API Key'
      return false
    }

    coverGenerations[index].loading = true
    coverGenerations[index].imageUrl = ''
    coverGenerations[index].error = ''

    try {
      const url = await agnesGenerateCover({
        prompt: text,
        apiKey: key,
      })
      coverGenerations[index].imageUrl = url
      return true
    } catch (e) {
      coverGenerations[index].error = e.message || '封面图片生成失败'
      return false
    } finally {
      coverGenerations[index].loading = false
    }
  }

  function getAiAnalyzePrompt() {
    const url = refUrl.value.trim()
    const t = topic.value.trim() || '我的主题'
    const d = duration.value
    const plat = platform.value === 'douyin' ? '抖音' : '小红书'
    const styleLabels = { 干货: '知识干货', 情感: '情感共鸣', 种草: '产品种草', 幽默: '搞笑幽默', 励志: '励志正能量', 反转: '剧情反转' }

    return `请帮我分析并仿写这个爆款视频的脚本结构。

参考视频链接：${url}

仿写要求：
- 主题替换为「${t}」
- 平台：${plat}
- 时长：${d}秒
- 风格：${styleLabels[style.value]}

请先拆解参考视频的结构（钩子类型、节奏、爆点位置、收尾方式），然后按照相同结构生成新脚本，每个分镜都要有【画面提示】和旁白文字，最后附上5个标题备选和话题标签。`
  }

  return {
    topic,
    platform,
    duration,
    style,
    refUrl,
    aiModel,
    apiKeyInput,
    loading,
    error,
    streamingText,
    isStreaming,
    resultVisible,
    activeTab,
    resultData,
    storedApiKey,
    loadStoredKey,
    hasUrl,
    gen,
    genWithAI,
    saveApiKey,
    clearApiKey,
    switchTab,
    getJianyinText,
    getCopyText,
    enhanceScript,
    getAiAnalyzePrompt,

    // 媒体生成状态
    videoLoading,
    videoUrl,
    videoError,
    coverGenerations,

    // 媒体生成方法
    generateVideoFromScenes,
    generateCoverImage,
    getAgnesApiKey,
    resetMediaStates,
  }
}
