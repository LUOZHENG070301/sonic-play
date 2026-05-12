/**
 * Sonic Play - Gemini API 服务
 * 封装 Google Gemini API 调用，支持文本生成和流式响应
 */

/** Gemini API 配置 */
interface GeminiConfig {
  /** API Key */
  apiKey: string
  /** 模型名称 */
  model: string
  /** API 基础 URL */
  baseUrl: string
}

/** Gemini 消息内容部分 */
interface GeminiContentPart {
  text: string
}

/** Gemini 消息内容 */
export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiContentPart[]
}

/** Gemini 生成配置 */
interface GeminiGenerationConfig {
  temperature?: number
  topP?: number
  topK?: number
  maxOutputTokens?: number
  responseMimeType?: string
}

/** Gemini 请求体 */
interface GeminiRequest {
  contents: GeminiContent[]
  generationConfig?: GeminiGenerationConfig
  systemInstruction?: GeminiContentPart
}

/** Gemini 响应候选 */
interface GeminiCandidate {
  content: {
    parts: GeminiContentPart[]
    role: string
  }
  finishReason: string
}

/** Gemini 响应体 */
interface GeminiResponse {
  candidates: GeminiCandidate[]
  promptFeedback?: {
    blockReason?: string
  }
}

/** 流式响应的单个块 */
interface StreamChunk {
  text: string
  done: boolean
  error?: string
}

/** API 错误信息 */
interface APIError {
  code: number
  message: string
  status: string
}

/** 重试配置 */
interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number
  /** 初始延迟（毫秒） */
  initialDelay: number
  /** 最大延迟（毫秒） */
  maxDelay: number
  /** 延迟倍数 */
  backoffMultiplier: number
}

/** 默认配置 */
const DEFAULT_CONFIG: Partial<GeminiConfig> = {
  model: 'gemini-2.0-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
}

/** 默认重试配置 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
}

/**
 * Gemini API 服务类
 * 提供文本生成和流式响应功能
 */
export class GeminiService {
  private config: GeminiConfig
  private retryConfig: RetryConfig

  /**
   * 创建 Gemini 服务实例
   * @param apiKey - Gemini API Key
   * @param options - 可选配置
   */
  constructor(apiKey: string, options: Partial<GeminiConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options,
      apiKey,
    } as GeminiConfig
    this.retryConfig = DEFAULT_RETRY_CONFIG
  }

  /**
   * 检查 API Key 是否已配置
   */
  static hasApiKey(): boolean {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    return typeof apiKey === 'string' && apiKey.trim().length > 0
  }

  /**
   * 从环境变量获取 API Key
   */
  static getApiKey(): string | undefined {
    return import.meta.env.VITE_GEMINI_API_KEY
  }

  /**
   * 创建默认实例（从环境变量读取 API Key）
   */
  static createDefault(): GeminiService | null {
    const apiKey = GeminiService.getApiKey()
    if (!apiKey) {
      return null
    }
    return new GeminiService(apiKey)
  }

  /**
   * 生成文本内容
   * @param prompt - 用户提示
   * @param systemInstruction - 系统指令
   * @param config - 生成配置
   * @returns 生成的文本内容
   */
  async generateContent(
    prompt: string,
    systemInstruction?: string,
    config?: GeminiGenerationConfig
  ): Promise<string> {
    const contents: GeminiContent[] = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ]

    return this.generateContentWithHistory(contents, systemInstruction, config)
  }

  /**
   * 带历史记录的文本生成
   * @param contents - 对话历史
   * @param systemInstruction - 系统指令
   * @param config - 生成配置
   * @returns 生成的文本内容
   */
  async generateContentWithHistory(
    contents: GeminiContent[],
    systemInstruction?: string,
    config?: GeminiGenerationConfig
  ): Promise<string> {
    const requestBody: GeminiRequest = {
      contents,
      generationConfig: config,
    }

    if (systemInstruction) {
      requestBody.systemInstruction = { text: systemInstruction }
    }

    const url = `${this.config.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`

    return this.executeWithRetry(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await this.parseErrorResponse(response)
        throw new Error(`Gemini API 错误: ${error.message}`)
      }

      const data: GeminiResponse = await response.json()

      // 检查是否有阻止反馈
      if (data.promptFeedback?.blockReason) {
        throw new Error(`请求被阻止: ${data.promptFeedback.blockReason}`)
      }

      // 提取生成的文本
      if (data.candidates && data.candidates.length > 0) {
        const parts = data.candidates[0].content.parts
        return parts.map((part) => part.text).join('')
      }

      throw new Error('未收到有效响应')
    })
  }

  /**
   * 流式生成文本内容
   * @param prompt - 用户提示
   * @param systemInstruction - 系统指令
   * @param config - 生成配置
   * @param onChunk - 接收到块时的回调
   */
  async streamGenerateContent(
    prompt: string,
    systemInstruction?: string,
    config?: GeminiGenerationConfig,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    const contents: GeminiContent[] = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ]

    return this.streamGenerateContentWithHistory(contents, systemInstruction, config, onChunk)
  }

  /**
   * 带历史记录的流式生成
   * @param contents - 对话历史
   * @param systemInstruction - 系统指令
   * @param config - 生成配置
   * @param onChunk - 接收到块时的回调
   */
  async streamGenerateContentWithHistory(
    contents: GeminiContent[],
    systemInstruction?: string,
    config?: GeminiGenerationConfig,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    const requestBody: GeminiRequest = {
      contents,
      generationConfig: config,
    }

    if (systemInstruction) {
      requestBody.systemInstruction = { text: systemInstruction }
    }

    const url = `${this.config.baseUrl}/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`

    return this.executeWithRetry(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await this.parseErrorResponse(response)
        throw new Error(`Gemini API 错误: ${error.message}`)
      }

      if (!response.body) {
        throw new Error('响应体为空')
      }

      return this.processStreamResponse(response.body, onChunk)
    })
  }

  /**
   * 处理流式响应
   * @param body - ReadableStream
   * @param onChunk - 回调函数
   */
  private async processStreamResponse(
    body: ReadableStream<Uint8Array>,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    const reader = body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          onChunk?.({ text: '', done: true })
          break
        }

        // 解码数据块
        buffer += decoder.decode(value, { stream: true })

        // 处理 SSE 格式的数据
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一个可能不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim()
            if (jsonStr === '[DONE]' || jsonStr === '') continue

            try {
              const data: GeminiResponse = JSON.parse(jsonStr)

              if (data.candidates && data.candidates.length > 0) {
                const parts = data.candidates[0].content.parts
                const text = parts.map((part) => part.text).join('')
                fullText += text
                onChunk?.({ text, done: false })
              }
            } catch (parseError) {
              // 忽略解析错误，继续处理下一行
              console.warn('解析 SSE 数据失败:', parseError)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return fullText
  }

  /**
   * 解析错误响应
   */
  private async parseErrorResponse(response: Response): Promise<APIError> {
    try {
      const data = await response.json()
      return {
        code: response.status,
        message: data.error?.message || response.statusText,
        status: data.error?.status || 'UNKNOWN',
      }
    } catch {
      return {
        code: response.status,
        message: response.statusText,
        status: 'UNKNOWN',
      }
    }
  }

  /**
   * 带重试逻辑的执行
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null
    let delay = this.retryConfig.initialDelay

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // 检查是否为可重试的错误
        if (!this.isRetryableError(lastError)) {
          throw lastError
        }

        // 如果还有重试机会，等待后重试
        if (attempt < this.retryConfig.maxRetries) {
          console.warn(`Gemini API 请求失败，${delay}ms 后重试 (尝试 ${attempt + 1}/${this.retryConfig.maxRetries})`)
          await this.sleep(delay)
          delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelay)
        }
      }
    }

    throw lastError
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    // 网络错误、超时、服务暂时不可用等可重试
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('503') ||
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('overloaded')
    )
  }

  /**
   * 异步等待
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 测试 API 连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.generateContent('你好，请回复"连接成功"')
      return {
        success: true,
        message: `API 连接成功，响应: ${response.substring(0, 100)}`,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '未知错误',
      }
    }
  }
}

/** 导出单例实例（延迟初始化） */
let _instance: GeminiService | null = null

/**
 * 获取 Gemini 服务单例
 */
export function getGeminiService(): GeminiService | null {
  if (!_instance) {
    _instance = GeminiService.createDefault()
  }
  return _instance
}

/**
 * 重置单例实例（用于测试或更换 API Key）
 */
export function resetGeminiService(): void {
  _instance = null
}

/** 默认导出 */
export default GeminiService
