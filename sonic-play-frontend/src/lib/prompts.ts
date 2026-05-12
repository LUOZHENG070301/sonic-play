/**
 * Sonic Play - AI Prompt 模板库
 * 包含音乐分析、旋律续写、和弦分析、风格建议等 Prompt 模板
 */

/** Prompt 模板类型 */
export type PromptType =
  | 'music-analysis'
  | 'melody-continuation'
  | 'chord-analysis'
  | 'style-suggestion'
  | 'lofi-generation'
  | 'transition-generation'
  | 'chord-enhancement'
  | 'chat-music-assistant'

/** 音乐分析结果接口 */
export interface MusicAnalysisResult {
  /** 调性 */
  key: string
  /** BPM */
  bpm: number
  /** 和弦进行 */
  chordProgression: string[]
  /** 风格标签 */
  styleTags: string[]
  /** 结构分析 */
  structure: Array<{
    type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro'
    label: string
    startMeasure: number
    endMeasure: number
  }>
  /** 分析说明 */
  description: string
}

/** 旋律续写结果接口 */
export interface MelodyContinuationResult {
  /** 音符列表 */
  notes: Array<{
    pitch: string
    duration: string
    velocity: number
  }>
  /** 续写说明 */
  description: string
}

/** 和弦分析结果接口 */
export interface ChordAnalysisResult {
  /** 和弦进行 */
  progression: string[]
  /** 调性分析 */
  keyAnalysis: string
  /** 和弦功能分析 */
  functionalAnalysis: string[]
  /** 改进建议 */
  suggestions: string[]
}

/** 风格建议结果接口 */
export interface StyleSuggestionResult {
  /** 风格名称 */
  styleName: string
  /** 特点描述 */
  characteristics: string[]
  /** 编曲建议 */
  arrangementTips: string[]
  /** 推荐乐器 */
  recommendedInstruments: string[]
}

/** 系统指令：AI 音乐助手 */
export const SYSTEM_INSTRUCTION_MUSIC_ASSISTANT = `你是一个专业的 AI 音乐助手，专门帮助用户进行音乐创作、编曲和混音。你的专长包括：

1. **音乐理论**：精通和声学、对位法、曲式分析等
2. **编曲技巧**：熟悉各种乐器的编配和音色设计
3. **混音知识**：了解均衡、压缩、混响等音频处理技术
4. **风格分析**：能够识别和分析各种音乐风格的特征

回答时请注意：
- 使用简洁明了的中文
- 提供具体的、可操作的建议
- 必要时使用专业术语但需解释
- 可以使用 Markdown 格式组织内容
- 对于音乐创作问题，提供具体的音符或和弦示例`

/** 系统指令：JSON 输出模式 */
export const SYSTEM_INSTRUCTION_JSON_OUTPUT = `你是一个音乐分析 AI。请严格按照要求的 JSON 格式输出，不要添加任何额外的文字说明。确保输出的 JSON 格式正确、可以被解析。`

/**
 * 音乐分析 Prompt
 * @param projectInfo - 项目信息
 */
export function createMusicAnalysisPrompt(projectInfo: {
  name: string
  tempo: number
  timeSignature: string
  totalMeasures: number
  tracks: Array<{
    name: string
    instrument: string
    notesCount: number
  }>
}): string {
  return `请分析以下音乐项目并返回 JSON 格式的分析结果。

项目信息：
- 名称：${projectInfo.name}
- 速度：${projectInfo.tempo} BPM
- 拍号：${projectInfo.timeSignature}
- 总小节数：${projectInfo.totalMeasures}
- 音轨：
${projectInfo.tracks.map(t => `  - ${t.name} (${t.instrument})，${t.notesCount} 个音符`).join('\n')}

请返回以下 JSON 格式（仅返回 JSON，不要其他文字）：
{
  "key": "调性，如 C Major 或 A Minor",
  "bpm": 检测到的速度数字,
  "chordProgression": ["和弦1", "和弦2", "..."],
  "styleTags": ["风格标签1", "风格标签2", "..."],
  "structure": [
    {"type": "intro|verse|chorus|bridge|outro", "label": "段落名称", "startMeasure": 起始小节, "endMeasure": 结束小节}
  ],
  "description": "对这首音乐的整体分析说明"
}`
}

/**
 * 旋律续写 Prompt
 * @param melodyInfo - 旋律信息
 */
export function createMelodyContinuationPrompt(melodyInfo: {
  key: string
  currentNotes: Array<{
    pitch: string
    duration: string
  }>
  style?: string
  barsToGenerate: number
}): string {
  return `请根据以下旋律信息续写一段旋律。

当前调性：${melodyInfo.key}
风格：${melodyInfo.style || '流行'}
需要续写的小节数：${melodyInfo.barsToGenerate}

当前旋律音符：
${melodyInfo.currentNotes.map(n => `${n.pitch} (${n.duration})`).join(' -> ')}

请返回以下 JSON 格式（仅返回 JSON，不要其他文字）：
{
  "notes": [
    {"pitch": "音高如 C4", "duration": "时值如 quarter/eighth/half", "velocity": 力度60-100}
  ],
  "description": "续写思路说明"
}

注意事项：
- 保持与现有旋律的风格一致性
- 注意旋律的起伏和呼吸感
- 使用合适的节奏变化
- 力度变化要自然`
}

/**
 * 和弦分析 Prompt
 * @param chordInfo - 和弦信息
 */
export function createChordAnalysisPrompt(chordInfo: {
  chords: string[]
  key?: string
}): string {
  return `请分析以下和弦进行。

和弦序列：${chordInfo.chords.join(' - ')}
${chordInfo.key ? `调性提示：${chordInfo.key}` : ''}

请返回以下 JSON 格式（仅返回 JSON，不要其他文字）：
{
  "progression": ["原和弦", "..."],
  "keyAnalysis": "调性分析说明",
  "functionalAnalysis": ["I级（主功能）", "V级（属功能）", "..."],
  "suggestions": ["改进建议1", "改进建议2", "..."]
}

分析要点：
1. 确定调性和调式
2. 分析每个和弦的功能（T/S/D）
3. 评价进行的流畅性
4. 提供可能的改进建议`
}

/**
 * 风格建议 Prompt
 * @param styleInfo - 风格信息
 */
export function createStyleSuggestionPrompt(styleInfo: {
  currentStyle?: string
  instruments: string[]
  tempo: number
}): string {
  return `请根据以下信息提供音乐风格建议。

当前使用的乐器：${styleInfo.instruments.join(', ')}
速度：${styleInfo.tempo} BPM
${styleInfo.currentStyle ? `当前风格倾向：${styleInfo.currentStyle}` : ''}

请返回以下 JSON 格式（仅返回 JSON，不要其他文字）：
{
  "styleName": "推荐的风格名称",
  "characteristics": ["特点1", "特点2", "..."],
  "arrangementTips": ["编曲建议1", "编曲建议2", "..."],
  "recommendedInstruments": ["推荐添加的乐器1", "推荐添加的乐器2", "..."]
}

请提供具体、可操作的建议。`
}

/**
 * Lo-Fi 风格生成 Prompt
 */
export function createLoFiGenerationPrompt(): string {
  return `请生成一段 Lo-Fi 风格的音乐素材。

Lo-Fi 特点：
- 温暖、复古的音色
- 简单但有效的和弦进行
- 放松的节奏
- 可能包含环境噪音或磁带质感

请返回以下 JSON 格式（仅返回 JSON，不要其他文字）：
{
  "notes": [
    {"pitch": "音高如 C4", "duration": "时值如 quarter/eighth/half", "velocity": 力度}
  ],
  "description": "生成思路说明，包括如何营造 Lo-Fi 氛围"
}

建议：
- 使用七和弦和九和弦增加色彩
- 力度变化柔和
- 可以使用切分节奏`
}

/**
 * 过渡段生成 Prompt
 * @param context - 上下文信息
 */
export function createTransitionPrompt(context: {
  fromSection: string
  toSection: string
  key: string
  tempo: number
}): string {
  return `请生成一段过渡音乐，连接两个段落。

从：${context.fromSection}
到：${context.toSection}
调性：${context.key}
速度：${context.tempo} BPM

请返回以下 JSON 格式（仅返回 JSON，不要其他文字）：
{
  "notes": [
    {"pitch": "音高如 C4", "duration": "时值如 quarter/eighth/half", "velocity": 力度}
  ],
  "description": "过渡设计思路"
}

过渡要点：
- 制造张力和释放
- 使用适当的和弦过渡
- 动态变化要自然
- 为进入下一段做铺垫`
}

/**
 * 和弦增强 Prompt
 * @param basicChords - 基础和弦
 */
export function createChordEnhancementPrompt(basicChords: string[]): string {
  return `请将以下基础和弦进行增强，添加更多色彩。

基础和弦：${basicChords.join(' - ')}

请返回以下 JSON 格式（仅返回 JSON，不要其他文字）：
{
  "enhancedChords": ["增强后的和弦1", "增强后的和弦2", "..."],
  "notes": [
    {"pitch": "音高", "duration": "时值", "velocity": 力度}
  ],
  "description": "增强思路说明"
}

增强方式：
- 添加七度音（maj7, m7, 7）
- 添加九度音（add9, 9）
- 使用挂留和弦（sus2, sus4）
- 适当使用变化和弦`
}

/**
 * AI 对话上下文构建
 * @param messages - 消息历史
 */
export function buildChatContext(messages: Array<{
  role: 'user' | 'assistant'
  content: string
}>): string {
  if (messages.length === 0) return ''

  return `之前的对话：
${messages.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')}

---
请继续回答用户的问题。`
}

/**
 * 从 JSON 字符串解析结果
 * 尝试提取和解析 JSON，处理可能的格式问题
 */
export function parseJsonResult<T>(text: string): T | null {
  try {
    // 直接尝试解析
    return JSON.parse(text) as T
  } catch {
    // 尝试提取 JSON 块
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim()) as T
      } catch {
        // 继续尝试其他方式
      }
    }

    // 尝试找到 JSON 对象
    const objectMatch = text.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]) as T
      } catch {
        // 解析失败
      }
    }

    console.warn('无法解析 JSON 结果:', text.substring(0, 200))
    return null
  }
}

/** 默认导出 */
export default {
  SYSTEM_INSTRUCTION_MUSIC_ASSISTANT,
  SYSTEM_INSTRUCTION_JSON_OUTPUT,
  createMusicAnalysisPrompt,
  createMelodyContinuationPrompt,
  createChordAnalysisPrompt,
  createStyleSuggestionPrompt,
  createLoFiGenerationPrompt,
  createTransitionPrompt,
  createChordEnhancementPrompt,
  buildChatContext,
  parseJsonResult,
}
