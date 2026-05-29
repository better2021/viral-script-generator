/**
 * 电影推荐器状态管理
 * 支持 TMDB API（实时数据）和本地数据 fallback，以及 AI 智能推荐
 */
import { ref, computed } from 'vue'
import {
  searchMovies,
  getMovieDetail,
  getAllGenres,
  getStoredTmdbApiKey,
  saveTmdbApiKey,
  clearTmdbApiKey,
} from '../services/movieApi.js'
import { getRecommendationParams, rerankMovies } from '../services/recommendationService.js'
import { searchMoviesTMDB, discoverMoviesTMDB, getGenreListTMDB, getCachedGenres, mapSearchResult } from '../services/tmdbApi.js'

const AI_LS_KEY_PREFIX = 'viral_script_api_key_'

export function useMovieRecommender() {
  // === 基础搜索状态 ===
  const query = ref('')
  const genre = ref('')
  const loading = ref(false)
  const error = ref('')
  const searched = ref(false)

  const movies = ref([])
  const selected = ref(null)

  const genres = getAllGenres()

  // === TMDB 配置状态 ===
  const tmdbApiKey = ref(getStoredTmdbApiKey())
  const showSettings = ref(false)

  /** TMDB 类型列表（供 UI 下拉使用） */
  const tmdbGenres = ref([])

  async function refreshTmdbGenres() {
    if (!tmdbApiKey.value) {
      tmdbGenres.value = []
      return
    }
    try {
      const list = await getGenreListTMDB(tmdbApiKey.value)
      tmdbGenres.value = list.map(g => g.name).sort()
    } catch {
      tmdbGenres.value = []
    }
  }

  // TMDB Key 已存在时预加载类型
  if (tmdbApiKey.value) {
    refreshTmdbGenres()
  }

  function onTmdbKeyInput(val) {
    tmdbApiKey.value = val
    if (val) {
      saveTmdbApiKey(val)
      refreshTmdbGenres()
    } else {
      clearTmdbApiKey()
      tmdbGenres.value = []
    }
  }

  function clearTmdbConfig() {
    tmdbApiKey.value = ''
    clearTmdbApiKey()
    tmdbGenres.value = []
  }

  const tmdbConfigured = computed(() => !!tmdbApiKey.value)

  // === AI 推荐状态 ===
  const aiQuery = ref('')
  const aiRecommending = ref(false)
  const aiRecommendationError = ref('')
  const aiReasoning = ref('')

  const aiModel = ref('deepseek')
  const aiApiKeyInput = ref('')
  const aiStoredApiKey = ref('')

  function loadAiStoredKey() {
    try {
      aiStoredApiKey.value = localStorage.getItem(AI_LS_KEY_PREFIX + aiModel.value) || ''
    } catch {
      aiStoredApiKey.value = ''
    }
  }
  loadAiStoredKey()

  function saveAiApiKey() {
    const key = aiApiKeyInput.value.trim()
    if (key) {
      localStorage.setItem(AI_LS_KEY_PREFIX + aiModel.value, key)
      aiApiKeyInput.value = ''
      loadAiStoredKey()
    }
  }

  function clearAiApiKey() {
    localStorage.removeItem(AI_LS_KEY_PREFIX + aiModel.value)
    loadAiStoredKey()
  }

  function onAiModelChange(model) {
    aiModel.value = model
    aiApiKeyInput.value = ''
    loadAiStoredKey()
  }

  // === 搜索 ===
  async function search() {
    loading.value = true
    error.value = ''
    searched.value = true

    try {
      const results = await searchMovies({
        query: query.value,
        genre: genre.value,
      })
      movies.value = results
    } catch (e) {
      error.value = e.message || '搜索失败，请重试'
      movies.value = []
    } finally {
      loading.value = false
    }
  }

  // === AI 智能推荐 ===
  /** 当前推荐阶段文案 */
  const loadingStage = ref('')

  async function aiRecommend() {
    const q = aiQuery.value.trim()
    if (!q) {
      aiRecommendationError.value = '请输入推荐需求'
      return
    }
    if (!tmdbConfigured.value) {
      aiRecommendationError.value = '请先在上方设置中配置 TMDB API Key'
      return
    }

    const aiKey = aiStoredApiKey.value || aiApiKeyInput.value.trim()
    if (!aiKey) {
      aiRecommendationError.value = '请先在上方设置中配置 AI API Key'
      return
    }

    saveAiApiKey()
    aiRecommending.value = true
    aiRecommendationError.value = ''
    aiReasoning.value = ''
    loading.value = true
    searched.value = true

    try {
      // =============================================
      // Phase 1: AI 分析需求 → discover 参数
      // =============================================
      loadingStage.value = 'AI 正在分析你的需求...'

      let params
      try {
        params = await getRecommendationParams(q, aiModel.value, aiKey)
        aiReasoning.value = params.reasoning
      } catch (e) {
        console.warn('Phase 1 (AI analysis) failed:', e)
        params = {
          genreIds: [],
          yearFrom: null,
          yearTo: null,
          voteAverageMin: 6,
          voteCountMin: 200,
          language: null,
        }
      }

      // =============================================
      // Phase 2: TMDB discover → 候选列表
      // =============================================
      loadingStage.value = '正在从 TMDB 获取候选影片...'

      let genreMap = getCachedGenres()
      if (!genreMap) {
        await getGenreListTMDB(tmdbApiKey.value)
        genreMap = getCachedGenres()
      }

      const tmdbKey = tmdbApiKey.value
      const minVoteAvg = params.voteAverageMin || 6
      const discoverOpts = {
        genreIds: params.genreIds,
        yearFrom: params.yearFrom,
        yearTo: params.yearTo,
        sortBy: 'vote_average.desc',
        minVoteCount: 100,
        minVoteAverage: minVoteAvg,
      }

      // 并行搜索：英文关键词（搜剧情简介）+ 中文关键词（搜片名）+ discover（类型保底）
      const searchTerms = [
        ...params.englishKeywords,
        ...params.chineseKeywords,
      ].filter(Boolean).slice(0, 5)

      const allFetches = [
        ...([1, 2].map(page =>
          discoverMoviesTMDB({ ...discoverOpts, page }, tmdbKey)
        )),
        ...searchTerms.map(term =>
          searchMoviesTMDB({ query: term, page: 1 }, tmdbKey)
        ),
      ]

      const results = await Promise.all(allFetches)

      // 合并去重，取 40 部
      const seen = new Set()
      const candidates = []
      for (const res of results) {
        for (const movie of (res.results || [])) {
          if (seen.has(movie.id)) continue
          seen.add(movie.id)
          candidates.push(movie)
        }
      }

      // 按评分降序，取最多 40 部
      candidates.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
      const topCandidates = candidates.slice(0, 40)

      if (topCandidates.length === 0) {
        movies.value = []
        aiRecommendationError.value = '没有找到符合条件的电影，请尝试更宽泛的描述'
        return
      }

      // =============================================
      // Phase 3: AI 按相关性重新排名 → Top 10
      // =============================================
      loadingStage.value = 'AI 正在筛选最相关的结果...'

      let rankedIds = null
      let rankedReasons = {}

      try {
        const rankingResult = await rerankMovies(q, topCandidates, aiModel.value, aiKey)
        if (rankingResult && rankingResult.rankedIds.length > 0) {
          rankedIds = rankingResult.rankedIds
          rankedReasons = rankingResult.reasons || {}
        }
      } catch (e) {
        console.warn('Phase 3 (reranking) failed, falling back to vote sort:', e)
      }

      // =============================================
      // 构建最终展示列表
      // =============================================
      const mappedMap = {}
      for (const m of topCandidates) {
        const mapped = mapSearchResult(m, genreMap)
        mappedMap[mapped.id] = mapped
      }

      let finalMovies

      if (rankedIds) {
        finalMovies = rankedIds
          .map(id => mappedMap[id])
          .filter(Boolean)
        finalMovies.forEach(m => { m._rerankReason = rankedReasons[m.id] || '' })
      } else {
        // 降级：按评分排序，仍比旧系统好（已经过 discover 主题筛选）
        finalMovies = topCandidates.map(m => mapSearchResult(m, genreMap))
      }

      movies.value = finalMovies.slice(0, 10)
    } catch (e) {
      aiRecommendationError.value = e.message || '推荐失败，请重试'
      movies.value = []
    } finally {
      aiRecommending.value = false
      loading.value = false
      loadingStage.value = ''
    }
  }

  // === 选集 & 弹窗 ===
  async function selectMovie(id) {
    try {
      const movie = await getMovieDetail(id)
      if (movie) {
        selected.value = movie
      } else {
        // 详情获取不到数据时，用搜索结果已有信息兜底
        const fallback = movies.value.find(m => m.id === id)
        if (fallback) selected.value = fallback
      }
    } catch (e) {
      console.warn('电影详情获取失败:', e)
      // 异常时用搜索结果已有信息兜底
      const fallback = movies.value.find(m => m.id === id)
      if (fallback) selected.value = fallback
    }
  }

  function closeDetail() {
    selected.value = null
  }

  return {
    // 基础搜索
    query,
    genre,
    genres,
    movies,
    loading,
    error,
    searched,
    selected,
    search,
    selectMovie,
    closeDetail,

    // TMDB
    tmdbApiKey,
    tmdbConfigured,
    showSettings,
    tmdbGenres,
    onTmdbKeyInput,
    clearTmdbConfig,

    // AI 推荐
    aiQuery,
    aiRecommending,
    aiRecommendationError,
    aiReasoning,
    aiModel,
    aiApiKeyInput,
    aiStoredApiKey,
    onAiModelChange,
    saveAiApiKey,
    clearAiApiKey,
    aiRecommend,
    loadingStage,
  }
}
