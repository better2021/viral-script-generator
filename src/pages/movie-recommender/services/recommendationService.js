/**
 * AI 电影推荐服务
 * 模块：电影推荐器 - AI 意图分析
 * 将用户模糊的推荐需求转化为 TMDB discover 参数，
 * 并对候选结果按相关性重新排名
 */

const API_CONFIG = {
  glm: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-plus',
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
  },
  doubao: {
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    model: 'doubao-seed-2-0-lite-260428',
  },
  kimi: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-32k',
  },
}

/**
 * 调用 AI 模型（仅限电影推荐场景）
 * @param {string} prompt - 完整 prompt（含指令）
 * @param {string} model - 模型标识
 * @param {string} apiKey - API Key
 * @param {number} [temperature=0.7] - 生成温度
 * @returns {Promise<object>} 解析后的 JSON 对象
 */
async function callAIMovie(prompt, model, apiKey, temperature = 0.7) {
  const config = API_CONFIG[model]
  if (!config) throw new Error(`不支持的模型: ${model}`)

  const body = {
    model: config.model,
    messages: [{ role: 'user', content: prompt }],
    temperature,
    max_tokens: 4096,
  }

  if (model !== 'doubao') {
    body.response_format = { type: 'json_object' }
  }

  const maxRetries = 2
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('AI 返回为空')

      try {
        return JSON.parse(content)
      } catch {
        const match = content.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) return JSON.parse(match[1])
        throw new Error('AI 返回格式异常，无法解析')
      }
    }

    if (res.status === 429 && attempt < maxRetries) {
      const wait = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 4000)
      await new Promise(r => setTimeout(r, wait))
      continue
    }

    const errBody = await res.text()
    throw new Error(`AI 请求失败 (${res.status}): ${errBody.slice(0, 200)}`)
  }

  throw new Error('AI 请求重试已耗尽')
}

/**
 * Phase 1: 构建 AI 需求分析 prompt
 * 将用户需求转化为 TMDB discover API 筛选参数
 * @param {string} userQuery
 * @returns {string}
 */
export function buildRecommendationPrompt(userQuery) {
  return `你是一个专业的电影推荐引擎。分析用户的电影需求，输出 TMDB 搜索参数。

用户需求：${userQuery}

## 任务
1. 理解用户想看的电影是什么主题/题材/风格
2. 把你理解的核心题材翻译成英文搜索词（TMDB 的英文搜索会匹配电影的剧情简介，非常有效）
3. 根据用户需求选择最匹配的 TMDB 类型 ID
4. 如果有中文字面关键词也可以提供

TMDB 类型 ID：动作=28, 冒险=12, 动画=16, 喜剧=35, 犯罪=80, 纪录片=99, 剧情=18, 家庭=10751, 奇幻=14, 历史=36, 恐怖=27, 音乐=10402, 悬疑=9648, 爱情=10749, 科幻=878, 惊悚=53, 战争=10752, 西部=37

严格返回以下 JSON 格式，不包含任何其他文字或 markdown 标记：
{
  "reasoning": "用 1-2 句话说明用户的核心需求以及你的推荐策略",
  "englishKeywords": ["英文搜索词，2-4 个不同角度的词组，TMDB 会匹配剧情简介，如 stock market, wall street, finance thriller"],
  "chineseKeywords": ["中文搜索词，可能匹配中文片名，没有则为空数组"],
  "genreIds": [最匹配的类型 ID 数组，最多 3 个],
  "yearFrom": 起始年份或 null,
  "yearTo": 结束年份或 null,
  "voteAverageMin": 最低评分门槛(6.0-8.0),
  "voteCountMin": 最低投票数门槛(通常100-200)
}`
}

/**
 * Phase 1: 分析用户需求，提取 TMDB discover 参数
 * @param {string} userQuery
 * @param {string} model
 * @param {string} apiKey
 * @returns {Promise<{reasoning: string, genreIds: number[], yearFrom: number|null, yearTo: number|null, voteAverageMin: number, voteCountMin: number, language: string|null}>}
 */
export async function getRecommendationParams(userQuery, model, apiKey) {
  const prompt = buildRecommendationPrompt(userQuery)

  try {
    const result = await callAIMovie(prompt, model, apiKey)

    return {
      reasoning: typeof result.reasoning === 'string' ? result.reasoning : '',
      englishKeywords: Array.isArray(result.englishKeywords) ? result.englishKeywords.filter(Boolean) : [],
      chineseKeywords: Array.isArray(result.chineseKeywords) ? result.chineseKeywords.filter(Boolean) : [],
      genreIds: Array.isArray(result.genreIds) ? result.genreIds.filter(n => typeof n === 'number') : [],
      yearFrom: typeof result.yearFrom === 'number' ? result.yearFrom : null,
      yearTo: typeof result.yearTo === 'number' ? result.yearTo : null,
      voteAverageMin: typeof result.voteAverageMin === 'number' ? result.voteAverageMin : 6,
      voteCountMin: typeof result.voteCountMin === 'number' ? result.voteCountMin : 100,
    }
  } catch (e) {
    console.warn('AI 需求分析失败，使用默认参数:', e.message)
    return {
      reasoning: '',
      englishKeywords: [],
      chineseKeywords: [],
      genreIds: [],
      yearFrom: null,
      yearTo: null,
      voteAverageMin: 6,
      voteCountMin: 100,
    }
  }
}

/**
 * Phase 3: 构建 reranking prompt
 * @param {string} userQuery
 * @param {Array<{id: number, title: string, year: number|null, genres: string[], rating: number, summary: string}>} movies - 候选电影列表
 * @returns {string}
 */
export function buildRerankPrompt(userQuery, movies) {
  const movieList = movies.map((m, i) => {
    const genres = (m.genres || []).slice(0, 3).join('/') || '未知'
    const year = m.year || '未知'
    const summary = (m.summary || '').slice(0, 200).replace(/\n/g, ' ')
    return `${i + 1} | ${m.id} | ${m.title} | ${year} | ${genres} | ${m.rating || '?'} | ${summary}`
  }).join('\n')

  return `你是一个专业的电影推荐筛选引擎。用户的需求是：${userQuery}

以下是符合基本筛选条件的 ${movies.length} 部候选电影。请根据每部电影与用户需求的**主题相关性**评分，选出最相关的 10 部。

评分标准：
- 9-10 分：完全命中用户需求的核心主题、氛围和风格
- 7-8 分：很好地匹配了主要需求
- 5-6 分：部分匹配
- 0-4 分：不太相关

候选电影列表（序号 | 电影ID | 片名 | 年份 | 类型 | 评分 | 简介）：
${movieList}

输出严格为以下 JSON 格式：
{
  "rankings": [
    {"movieId": <TMDB电影ID>, "score": <0-10>, "reason": "为什么这部适合该用户（一句话）"},
    ...
  ]
}

要求：
1. 必须精确选择 10 部电影（如果候选≥10 部），按得分从高到低排序
2. 评分要考虑主题、氛围、时代背景、叙事风格的匹配度
3. 如果用户提及了参考电影，优先选择在主题深度和气质上与之相似的作品
4. 如果候选不足 10 部，则全部列出并排序`
}

/**
 * Phase 3: AI 对候选电影按相关性重新排名
 * @param {string} userQuery - 用户的原始需求
 * @param {Array} candidates - 候选电影列表（TMDB 原始结果，含 title/overview/vote_average/release_date 等）
 * @param {string} model - AI 模型
 * @param {string} apiKey - AI API Key
 * @returns {Promise<{rankedIds: number[], reasons: object}|null>}
 */
export async function rerankMovies(userQuery, candidates, model, apiKey) {
  const prompt = buildRerankPrompt(userQuery, candidates)

  try {
    const result = await callAIMovie(prompt, model, apiKey, 0.3)

    if (!Array.isArray(result.rankings) || result.rankings.length === 0) {
      throw new Error('AI 返回的 rankings 为空')
    }

    const rankedIds = []
    const reasons = {}

    for (const r of result.rankings) {
      if (typeof r.movieId === 'number') {
        rankedIds.push(r.movieId)
        if (r.reason) reasons[r.movieId] = r.reason
      }
    }

    if (rankedIds.length === 0) throw new Error('未解析出有效的电影 ID')

    return { rankedIds, reasons }
  } catch (e) {
    console.warn('AI 重新排名失败:', e.message)
    return null
  }
}
