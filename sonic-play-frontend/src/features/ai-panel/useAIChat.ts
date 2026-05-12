/**
 * Sonic Play - AI 对话 Hook
 * 管理聊天消息状态、支持真实 Gemini API 和 Mock 模式
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { GeminiService, getGeminiService, type GeminiContent } from '@/services/geminiService'
import { SYSTEM_INSTRUCTION_MUSIC_ASSISTANT } from '@/lib/prompts'

/** AI 模型提供商类型 */
export type AIModelProvider = 'gemini' | 'openai' | 'ollama'

/** 聊天消息角色 */
export type MessageRole = 'user' | 'assistant'

/** 聊天消息接口 */
export interface ChatMessage {
  /** 唯一标识 */
  id: string
  /** 消息角色 */
  role: MessageRole
  /** 消息内容 */
  content: string
  /** 创建时间 */
  timestamp: number
  /** 是否正在流式输出中 */
  isStreaming?: boolean
  /** 错误信息 */
  error?: string
}

/** 模型状态信息 */
export interface ModelStatus {
  /** 提供商 */
  provider: AIModelProvider
  /** 是否已配置（已连接） */
  isConfigured: boolean
  /** 模型名称 */
  modelName: string
}

/** useAIChat Hook 返回值 */
export interface UseAIChatReturn {
  /** 聊天消息列表 */
  messages: ChatMessage[]
  /** 是否正在等待 AI 回复 */
  isLoading: boolean
  /** 当前选中的模型提供商 */
  selectedModel: AIModelProvider
  /** 设置当前模型 */
  setSelectedModel: (model: AIModelProvider) => void
  /** 发送消息 */
  sendMessage: (content: string) => void
  /** 重试最后一条消息 */
  retryLastMessage: () => void
  /** 清空聊天记录 */
  clearMessages: () => void
  /** 获取模型状态列表 */
  modelStatuses: ModelStatus[]
  /** 消息列表容器的引用（用于自动滚动） */
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  /** 是否使用真实 API */
  useRealAPI: boolean
}

/** 模拟 AI 回复的预设回答库 */
const MOCK_RESPONSES: Record<string, string[]> = {
  default: [
    '你好！我是 Sonic Play AI 助手，可以帮你进行音乐创作、分析和建议。有什么我可以帮你的吗？',
    '这是一个很好的想法！让我分析一下你的项目...\n\n根据当前的调性和节奏，我建议你可以尝试在第三小节加入一个转调过渡，这样会让整体听感更加丰富。',
    '关于你提到的编曲问题，这里有几个建议：\n\n1. **增加低音层次** - 可以在低音区加入八度叠加\n2. **使用和弦外音** - 在旋律中加入经过音会让线条更流畅\n3. **动态对比** - 在副歌部分适当增加音轨密度',
    '我分析了你的和声进行，发现主要使用了 I-V-vi-IV 的经典走向。如果想增加新鲜感，可以尝试 ii-V-I 的爵士进行，或者加入一些借用和弦。',
    '好的，让我为你生成一段旋律...\n\n建议使用 C 大调五声音阶作为基础，配合切分节奏，这样能创造出既和谐又有律动感的旋律线。',
  ],
  composition: [
    '关于音乐创作，我有以下建议：\n\n**旋律写作技巧：**\n- 使用重复与变化的平衡\n- 在乐句结尾使用半终止或全终止\n- 适当使用跳进与级进的交替\n\n**和声编排：**\n- 尝试使用七和弦增加色彩\n- 在关键转位处使用减七和弦作为过渡\n- 保持低音线条的独立性',
  ],
  mixing: [
    '混音建议：\n\n1. **频率均衡** - 检查各音轨之间的频率冲突，适当削减重叠频段\n2. **声像定位** - 将节奏乐器稍微偏左，旋律乐器偏右，创造立体声场\n3. **动态处理** - 使用压缩器控制动态范围，让整体更加均衡\n4. **混响空间** - 根据音乐风格选择合适的混响时间',
  ],
}

/** 生成唯一 ID */
const generateId = (): string =>
  `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

/** 根据用户输入选择合适的模拟回复 */
const pickMockResponse = (userMessage: string): string => {
  const lowerMsg = userMessage.toLowerCase()
  if (lowerMsg.includes('创作') || lowerMsg.includes('作曲') || lowerMsg.includes('旋律')) {
    const pool = MOCK_RESPONSES.composition
    return pool[Math.floor(Math.random() * pool.length)]
  }
  if (lowerMsg.includes('混音') || lowerMsg.includes('混响') || lowerMsg.includes('均衡')) {
    const pool = MOCK_RESPONSES.mixing
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const pool = MOCK_RESPONSES.default
  return pool[Math.floor(Math.random() * pool.length)]
}

/** 模拟流式输出的延迟间隔（毫秒） */
const STREAMING_CHAR_DELAY = 30
/** 流式输出每个批次输出的字符数 */
const STREAMING_BATCH_SIZE = 2

/**
 * AI 对话自定义 Hook
 * 管理聊天消息状态，支持真实 API 和 Mock 模式
 */
export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AIModelProvider>('gemini')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef(false)
  const geminiServiceRef = useRef<GeminiService | null>(null)

  /** 检查是否使用真实 API */
  const useRealAPI = GeminiService.hasApiKey()

  /** 初始化 Gemini 服务 */
  useEffect(() => {
    if (useRealAPI) {
      geminiServiceRef.current = getGeminiService()
    }
  }, [useRealAPI])

  /** 模型状态列表 */
  const modelStatuses: ModelStatus[] = [
    {
      provider: 'gemini',
      isConfigured: useRealAPI,
      modelName: 'Gemini 2.0 Flash',
    },
    {
      provider: 'openai',
      isConfigured: false,
      modelName: 'GPT-4o',
    },
    {
      provider: 'ollama',
      isConfigured: false,
      modelName: 'Llama 3 (本地)',
    },
  ]

  /** 自动滚动到最新消息 */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  /** 模拟流式输出效果 */
  const simulateStreaming = useCallback(
    (messageId: string, fullContent: string) => {
      abortRef.current = false
      let currentIndex = 0

      const streamInterval = setInterval(() => {
        // 如果被中止，停止流式输出
        if (abortRef.current) {
          clearInterval(streamInterval)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, isStreaming: false, content: fullContent }
                : msg
            )
          )
          return
        }

        currentIndex += STREAMING_BATCH_SIZE

        if (currentIndex >= fullContent.length) {
          // 流式输出完成
          clearInterval(streamInterval)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, isStreaming: false, content: fullContent }
                : msg
            )
          )
        } else {
          // 逐步更新内容
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, content: fullContent.substring(0, currentIndex) }
                : msg
            )
          )
          scrollToBottom()
        }
      }, STREAMING_CHAR_DELAY)
    },
    [scrollToBottom]
  )

  /** 使用真实 Gemini API 发送消息 */
  const sendMessageWithRealAPI = useCallback(
    async (content: string) => {
      const service = geminiServiceRef.current
      if (!service) {
        // 降级到 Mock 模式
        sendMessageWithMock(content)
        return
      }

      // 构建对话历史
      const history: GeminiContent[] = messages.map((msg) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      }))

      // 添加当前用户消息
      history.push({
        role: 'user',
        parts: [{ text: content }],
      })

      // 创建 AI 回复消息（初始为空，等待流式填充）
      const aiMessageId = generateId()
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      }

      setMessages((prev) => [...prev, aiMessage])
      setIsLoading(false)
      scrollToBottom()

      try {
        // 使用流式 API
        let fullContent = ''
        await service.streamGenerateContentWithHistory(
          history,
          SYSTEM_INSTRUCTION_MUSIC_ASSISTANT,
          { temperature: 0.7 },
          (chunk) => {
            if (chunk.done) {
              // 流式输出完成
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, isStreaming: false, content: fullContent }
                    : msg
                )
              )
            } else {
              // 更新内容
              fullContent += chunk.text
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: fullContent }
                    : msg
                )
              )
              scrollToBottom()
            }
          }
        )
      } catch (error) {
        // 处理错误
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, isStreaming: false, error: errorMessage }
              : msg
          )
        )
        console.error('Gemini API 调用失败:', error)
      }
    },
    [messages, scrollToBottom]
  )

  /** 使用 Mock 模式发送消息 */
  const sendMessageWithMock = useCallback(
    (content: string) => {
      // 模拟 AI 思考延迟
      const thinkDelay = 800 + Math.random() * 1200

      setTimeout(() => {
        // 选择模拟回复
        const responseContent = pickMockResponse(content)

        // 创建 AI 回复消息（初始为空，等待流式填充）
        const aiMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        }

        setMessages((prev) => [...prev, aiMessage])
        setIsLoading(false)
        scrollToBottom()

        // 开始流式输出
        simulateStreaming(aiMessage.id, responseContent)
      }, thinkDelay)
    },
    [simulateStreaming, scrollToBottom]
  )

  /** 发送消息 */
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || isLoading) return

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)

      // 根据是否有 API Key 选择模式
      if (useRealAPI && selectedModel === 'gemini') {
        sendMessageWithRealAPI(content.trim())
      } else {
        sendMessageWithMock(content.trim())
      }
    },
    [isLoading, useRealAPI, selectedModel, sendMessageWithRealAPI, sendMessageWithMock]
  )

  /** 重试最后一条消息 */
  const retryLastMessage = useCallback(() => {
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user')

    if (lastUserMessage) {
      // 移除最后一条用户消息之后的所有消息（包括失败的 AI 回复）
      const lastUserIndex = messages.findIndex(
        (msg) => msg.id === lastUserMessage.id
      )
      setMessages((prev) => prev.slice(0, lastUserIndex))
      // 重新发送
      setTimeout(() => {
        sendMessage(lastUserMessage.content)
      }, 100)
    }
  }, [messages, sendMessage])

  /** 清空聊天记录 */
  const clearMessages = useCallback(() => {
    abortRef.current = true
    setMessages([])
  }, [])

  // 组件卸载时中止流式输出
  useEffect(() => {
    return () => {
      abortRef.current = true
    }
  }, [])

  return {
    messages,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    retryLastMessage,
    clearMessages,
    modelStatuses,
    messagesEndRef,
    useRealAPI,
  }
}
