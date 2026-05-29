/**
 * TMDB API 服务
 * 模块：电影推荐器 - 数据层
 * 提供 TMDB REST API 的封装，包括搜索、发现、详情、类型列表和图片 URL
 */

const BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

/** 模块级类型缓存：{ id -> name } */
let genreCache = null

/**
 * 通用 TMDB GET 请求
 * @param {string} endpoint - API 路径，如 '/search/movie'
 * @param {object} params - 查询参数（不含 api_key 和 language）
 * @param {string} apiKey - TMDB API Key (v3 auth)
 * @returns {Promise<object>} 解析后的 JSON 响应
 */
export async function fetchFromTMDB(endpoint, params = {}, apiKey) {
  const url = new URL(`${BASE}${endpoint}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'zh-CN')

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v))
    }
  })

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`TMDB 请求失败 (${res.status}): ${body.slice(0, 200)}`)
  }
  return res.json()
}

/**
 * 获取电影类型列表
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
export async function getGenreListTMDB(apiKey) {
  if (genreCache) {
    return Object.entries(genreCache).map(([id, name]) => ({ id: Number(id), name }))
  }

  const data = await fetchFromTMDB('/genre/movie/list', {}, apiKey)
  const genres = data.genres || []
  // 填充缓存
  genreCache = {}
  genres.forEach(g => { genreCache[g.id] = g.name })
  return genres
}

/** 获取缓存的类型映射 */
export function getCachedGenres() {
  return genreCache
}

/** 根据 ID 获取类型名称 */
export function getGenreName(genreId) {
  return genreCache?.[genreId] || ''
}

/**
 * 按关键词搜索电影
 * @param {object} params
 * @param {string} params.query - 搜索关键词
 * @param {number} [params.page=1] - 页码
 * @param {string} [params.language='zh-CN']
 * @returns {Promise<object>} TMDB 原始响应
 */
export async function searchMoviesTMDB({ query, page = 1, language = 'zh-CN' } = {}, apiKey) {
  return fetchFromTMDB('/search/movie', { query, page, language }, apiKey)
}

/**
 * 按条件发现电影（筛选/推荐）
 * @param {object} params
 * @param {number[]} [params.genreIds] - 类型 ID 数组
 * @param {number} [params.yearFrom] - 起始年份
 * @param {number} [params.yearTo] - 结束年份
 * @param {number} [params.page=1] - 页码
 * @param {string} [params.sortBy='popularity.desc'] - 排序
 * @param {string} [params.language='zh-CN']
 * @returns {Promise<object>} TMDB 原始响应
 */
export async function discoverMoviesTMDB({
  genreIds,
  yearFrom,
  yearTo,
  page = 1,
  sortBy = 'vote_average.desc',
  language = 'zh-CN',
  genreMatch = 'any',
  minVoteCount = 100,
  originalLanguage,
  minVoteAverage,
} = {}, apiKey) {
  const params = {
    sort_by: sortBy,
    page,
    language,
    'vote_count.gte': minVoteCount,
  }
  if (genreIds?.length) {
    params.with_genres = genreIds.join(genreMatch === 'all' ? '|' : ',')
  }
  if (yearFrom) {
    params['primary_release_date.gte'] = `${yearFrom}-01-01`
  }
  if (yearTo) {
    params['primary_release_date.lte'] = `${yearTo}-12-31`
  }
  if (originalLanguage) {
    params.with_original_language = originalLanguage
  }
  if (typeof minVoteAverage === 'number') {
    params['vote_average.gte'] = minVoteAverage
  }
  return fetchFromTMDB('/discover/movie', params, apiKey)
}

/**
 * 获取电影详情（含演职员表）
 * @param {number} movieId - TMDB 电影 ID
 * @returns {Promise<object>} TMDB 原始响应（含 credits）
 */
export async function getMovieDetailTMDB(movieId, apiKey, language = 'zh-CN') {
  return fetchFromTMDB(`/movie/${movieId}`, { append_to_response: 'credits', language }, apiKey)
}

/**
 * 构建 TMDB 图片完整 URL
 * @param {string} path - TMDB 返回的图片路径（如 /abc123.jpg）
 * @param {string} [size='w500'] - 图片尺寸
 * @returns {string|null}
 */
export function getImageUrl(path, size = 'w500') {
  if (!path) return null
  return `${IMAGE_BASE}/${size}${path}`
}

/** 从 release_date 中提取年份 */
function extractYear(releaseDate) {
  if (!releaseDate) return null
  const y = parseInt(releaseDate, 10)
  return Number.isNaN(y) ? null : y
}

/**
 * 将 TMDB 搜索结果映射为应用内部格式
 * @param {object} m - TMDB 搜索结果对象
 * @param {object|null} genreMap - 类型缓存 { id -> name }
 * @returns {object}
 */
export function mapSearchResult(m, genreMap) {
  const genres = (m.genre_ids || [])
    .map(id => genreMap?.[id] || '')
    .filter(Boolean)

  return {
    id: m.id,
    title: m.title,
    originalTitle: m.original_title !== m.title ? m.original_title : '',
    year: extractYear(m.release_date),
    rating: m.vote_average,
    genres,
    summary: m.overview || '',
    director: '',
    cast: '',
    poster: getImageUrl(m.poster_path),
    popularity: m.popularity || 0,
  }
}

/**
 * 将 TMDB 详情（含 credits）映射为应用内部格式
 * @param {object} d - TMDB 详情对象（含 credits）
 * @param {object|null} genreMap - 类型缓存
 * @returns {object}
 */
export function mapDetailResult(d, genreMap) {
  const genres = (d.genres || []).map(g => g.name)

  let director = ''
  let castList = []
  if (d.credits) {
    const directorCrew = d.credits.crew?.find(c => c.job === 'Director')
    if (directorCrew) director = directorCrew.name
    castList = (d.credits.cast || []).slice(0, 5).map(c => c.name)
  }

  return {
    id: d.id,
    title: d.title,
    originalTitle: d.original_title !== d.title ? d.original_title : '',
    year: extractYear(d.release_date),
    rating: d.vote_average,
    genres,
    summary: d.overview || '',
    director,
    cast: castList.join(' / '),
    poster: getImageUrl(d.poster_path),
    imdbId: d.imdb_id || '',
    homepage: d.homepage || '',
  }
}
