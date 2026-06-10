/**
 * Agnes AI 媒体生成 API 封装
 * 图片生成（同步） + 视频生成（异步轮询）
 */

const AGNES_BASE = 'https://apihub.agnes-ai.com/v1'

/**
 * 生成封面图片（同步接口）
 * @param {object} params
 * @param {string} params.prompt - 图片描述
 * @param {string} params.apiKey - Agnes API Key
 * @param {string} [params.size='1024x768'] - 图片尺寸
 * @returns {Promise<string>} 图片 URL
 * @throws {Error} API 请求失败或返回格式异常
 */
export async function generateCoverImage({ prompt, apiKey, size = '1024x768' }) {
  const res = await fetch(`${AGNES_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'agnes-image-2.1-flash',
      prompt,
      size,
      n: 1,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`图片生成失败 (${res.status}): ${errBody.slice(0, 200)}`)
  }

  const data = await res.json()
  const imageUrl = data.data?.[0]?.url
  if (!imageUrl) throw new Error('图片生成返回异常，未获取到图片地址')

  return imageUrl
}

/**
 * 生成视频（异步接口，含轮询）
 * @param {object} params
 * @param {string} params.prompt - 视频描述
 * @param {string} params.apiKey - Agnes API Key
 * @param {number} [params.numFrames=121] - 总帧数（须满足 8n+1）
 * @param {number} [params.frameRate=24] - 帧率
 * @param {(status: string) => void} [params.onStatus] - 状态回调
 * @returns {Promise<string>} 视频 URL
 * @throws {Error} 创建任务失败、生成失败或超时
 */
export async function generateVideo({ prompt, apiKey, numFrames = 121, frameRate = 24, onStatus }) {
  // Step 1: 创建视频生成任务
  const createRes = await fetch(`${AGNES_BASE}/videos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'agnes-video-v2.0',
      prompt,
      num_frames: numFrames,
      frame_rate: frameRate,
    }),
  })

  if (!createRes.ok) {
    const errBody = await createRes.text()
    throw new Error(`视频任务创建失败 (${createRes.status}): ${errBody.slice(0, 200)}`)
  }

  const { id: taskId } = await createRes.json()
  if (!taskId) throw new Error('视频任务创建返回异常，未获取到任务 ID')

  // Step 2: 轮询任务结果（视频生成约耗时 2-3 分钟）
  const MAX_POLLS = 60    // 最多等 5 分钟
  const POLL_INTERVAL = 5000  // 每 5 秒查一次

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL))

    const pollRes = await fetch(`${AGNES_BASE}/videos/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!pollRes.ok) continue

    const result = await pollRes.json()
    const status = result.status

    // 回调暴露当前状态
    if (onStatus) onStatus(status)

    if (status === 'completed') {
      return result.video_url || result.remixed_from_video_id
    }

    if (status === 'failed') {
      throw new Error(result.error || '视频生成失败')
    }

    // queued / in_progress / 未知状态 → 继续轮询
  }

  throw new Error('视频生成超时，请稍后重试')
}
