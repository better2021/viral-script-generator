import { SYSTEM_PROMPT, buildUserPrompt } from '../prompts/index.js'
import { AI_MODELS } from '../templates/index.js'

const API_CONFIG = Object.fromEntries(AI_MODELS.map(m => [m.value, { url: m.url, model: m.model }]))

// 不需要 response_format 的模型（返回原生 JSON）
const NO_JSON_MODE_MODELS = ['doubao', 'agnes']
const needResponseFormat = model => !NO_JSON_MODE_MODELS.includes(model)

export async function callAI(prompt, model, apiKey, temperature = 0.8) {
  const config = API_CONFIG[model]
  if (!config) throw new Error(`不支持的模型: ${model}`)

  const body = {
    model: config.model,
    messages: [
      { role: 'assistant', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    ...(needResponseFormat(model) && { response_format: { type: 'json_object' } }),
    temperature,
    max_tokens: 4096,
  }

  /** 带指数退避的重试，应对 429 限流 */
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    })

    if (res.ok) {
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('API 返回为空')

      return JSON.parse(content)
    }

    // 429 限流时等待后重试
    if (res.status === 429 && attempt < maxRetries) {
      const wait = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000)
      await new Promise(r => setTimeout(r, wait))
      continue
    }

    const errBody = await res.text()
    throw new Error(`API 请求失败 (${res.status}): ${errBody.slice(0, 200)}`)
  }
}

/**
 * SSE 流式调用：逐 token 回调 onText，返回完整文本
 * @param {string} prompt
 * @param {string} model
 * @param {string} apiKey
 * @param {(text: string) => void} onText 每次收到新内容时回调当前累积文本
 * @returns {Promise<string>} 完整响应文本
 */
export async function callAIStream(prompt, model, apiKey, onText, temperature = 0.8) {
  const config = API_CONFIG[model]
  if (!config) throw new Error(`不支持的模型: ${model}`)

  const body = {
    model: config.model,
    messages: [
      { role: 'assistant', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    ...(needResponseFormat(model) && { response_format: { type: 'json_object' } }),
    temperature,
    max_tokens: 4096,
    stream: true,
  }

  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      if (res.status === 429 && attempt < maxRetries) {
        const wait = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000)
        await new Promise(r => setTimeout(r, wait))
        continue
      }
      const errBody = await res.text()
      throw new Error(`API 请求失败 (${res.status}): ${errBody.slice(0, 200)}`)
    }

    // 降级：无 body 流时整体读取
    if (!res.body) {
      const text = await res.text()
      onText(text)
      return text
    }

    // SSE 流式读取
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content || ''
          if (delta) {
            fullText += delta
            onText(fullText)
          }
        } catch {
          // 跳过无法解析的中间块
        }
      }
    }

    // 处理缓冲区残留行
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim()
      if (data !== '[DONE]') {
        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta?.content || ''
          if (delta) {
            fullText += delta
            onText(fullText)
          }
        } catch { /* ignore */ }
      }
    }

    return fullText
  }

  throw new Error('所有重试均已失败')
}

export { buildUserPrompt as buildPrompt }
