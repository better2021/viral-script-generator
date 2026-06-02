/** 系统提示词：定义 AI 角色、创作规则和行为约束 */
export const SYSTEM_PROMPT = `# 角色
你是抖音/小红书顶级内容策划，擅长写出口语自然、情绪真实、
像朋友说话的爆款脚本。

# 输出结构
按以下顺序输出，不省略任何模块：
1. 分镜脚本（每镜：【画面提示5-15字】+ 旁白15-30字）
2. 剪映导入版（纯旁白，段间空行）
3. 封面文案（主标题≤15字 / 副标题≤20字 / 角标≤5字）
4. 标题备选×5（分别对应：数字型/痛点型/反常识型/故事型/悬念型）
5. 话题标签×10（不加#）

# 分镜数量
15秒=9镜，30秒=14镜，60秒=21镜

# 必须遵守的6条规则
1. 【开场钩子】第1镜必须用：痛点/反常识/数字冲击/场景代入/悬念留白 之一，禁止平铺直叙
2. 【情绪共鸣】多用"你"视角，用具体场景代替抽象情感词，让观众觉得"说的就是我"
3. 【评论钩子】最后1镜必须用：开放提问/立场分裂/扣1互动/悬念续集/情绪共谋 之一收尾
4. 【真人语感】禁止"首先其次最后"、禁止"希望对大家有帮助"等套话，禁止连续3句相同句式
5. 【节奏感】关键结论用短句（≤8字），铺垫用长句，长短交替
6. 【画面可拍】画面提示必须具象（"凌晨盯手机的脸"✓，"人物思考"✗）

# 参考链接处理
若用户提供视频链接，先拆解其钩子类型/节奏/情绪弧线，再按同结构仿写主题。`

/** 构建用户提示词 */
export function buildUserPrompt({ topic, platform, duration, style, refUrl }) {
  const platLabel = platform === 'douyin' ? '抖音' : '小红书'
  const styleLabels = {
    干货: '知识干货',
    情感: '情感共鸣',
    种草: '产品种草',
    幽默: '搞笑幽默',
    励志: '励志正能量',
    反转: '剧情反转',
  }

  const sceneCount = duration === '15' ? '9个' : duration === '30' ? '14个' : '21个'

  let prompt = `请根据以下参数生成爆款短视频脚本：

## 基本信息
- 主题/关键词：${topic}
- 发布平台：${platLabel}
- 视频时长：${duration}秒
- 内容风格：${styleLabels[style] || style}
- 分镜数量：大约${sceneCount}

请严格按以下 JSON 格式返回，不要包含任何 markdown 代码块标记：
{
  "scenes": [
    { "text": "旁白文字15-30字", "hint": "画面提示5-15字" }
  ],
  "titles": ["数字型标题", "痛点型标题", "反常识型标题", "故事型标题", "悬念型标题"],
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5", "标签6", "标签7", "标签8", "标签9", "标签10"],
  "covers": [
    { "main": "主标题≤15字", "sub": "副标题≤20字", "tags": ["角标≤5字", "角标≤5字"] }
  ]
}`

  if (refUrl && refUrl.trim()) {
    prompt += `\n\n## 参考链接
有一个可参考的爆款视频链接：${refUrl.trim()}
请先拆解该视频的结构（钩子类型、节奏、情绪弧线、互动设计），再按同样结构仿写。`
  }

  return prompt
}

export function buildEnhancePrompt({ scenes, titles, tags, covers, style, mode }) {
  const modeLabel = mode === 'compress' ? '压缩脚本' : mode === 'interactive' ? '强化互动' : '润色脚本'
  const scenesJson = JSON.stringify(scenes, null, 2)
  const titlesJson = JSON.stringify(titles, null, 2)
  const tagsJson = JSON.stringify(tags, null, 2)
  const coversJson = JSON.stringify(covers, null, 2)
  const styleLabel = style || '原始风格'

  return `请对以下短视频脚本进行${modeLabel}，保持原有结构不变。\n\n现有脚本：\n${scenesJson}\n\n封面文案：\n${coversJson}\n\n标题备选：\n${titlesJson}\n\n话题标签：\n${tagsJson}\n\n要求：\n1. 保持分镜数量和基础结构，不要输出 markdown 代码块。\n2. 若为“压缩脚本”，请让旁白更精炼、更有冲击力。\n3. 若为“强化互动”，请让最后一句增加评论/点赞引导。\n4. 若为“润色脚本”，请让语言更口语化、更有节奏感。\n5. 继续保留当前风格：${styleLabel}\n\n请返回 JSON 格式：\n{\n  "scenes": [{ "text": "...", "hint": "..." }],\n  "titles": ["..."],\n  "tags": ["..."],\n  "covers": [{ "main": "...", "sub": "...", "tags": ["...", "..."] }]\n}`
}
