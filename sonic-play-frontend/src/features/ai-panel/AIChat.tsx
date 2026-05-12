/**
 * Sonic Play - AI 对话组件
 * 聊天消息列表、消息输入、流式打字效果、加载动画
 */
import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Send, Trash2, RotateCcw, Bot, User } from 'lucide-react'
import ModelSelector from './ModelSelector'
import { useAIChat, type ChatMessage } from './useAIChat'

/** 简单的 Markdown 渲染：支持加粗、行内代码、代码块、列表 */
function SimpleMarkdown({ content }: { content: string }) {
  /** 将 Markdown 文本转换为 HTML */
  const renderMarkdown = (text: string): string => {
    let html = text
    // 代码块（```...```）
    html = html.replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="my-2 rounded-lg bg-gray-100 p-3 text-xs overflow-x-auto dark:bg-gray-900"><code>$2</code></pre>'
    )
    // 行内代码（`...`）
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-pink-600 dark:bg-gray-900 dark:text-pink-400">$1</code>'
    )
    // 加粗（**...**）
    html = html.replace(
      /\*\*([^*]+)\*\*/g,
      '<strong class="font-semibold">$1</strong>'
    )
    // 斜体（*...*）
    html = html.replace(
      /\*([^*]+)\*/g,
      '<em>$1</em>'
    )
    // 无序列表（- 或 * 开头）
    html = html.replace(
      /^[-*] (.+)$/gm,
      '<li class="ml-4 list-disc">$1</li>'
    )
    // 有序列表（1. 2. 开头）
    html = html.replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-4 list-decimal">$1</li>'
    )
    // 换行
    html = html.replace(/\n/g, '<br />')

    return html
  }

  return (
    <div
      className="prose prose-sm max-w-none text-gray-700 dark:text-gray-200"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  )
}

/** 加载指示器 - 三个跳动的绿色圆点 */
function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-2">
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[#58cc02] [animation-delay:0ms]" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[#58cc02] [animation-delay:150ms]" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-[#58cc02] [animation-delay:300ms]" />
    </div>
  )
}

/** 单条聊天消息气泡 */
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* 头像 */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-[#58cc02] text-white'
            : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* 消息内容 */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'rounded-tr-md bg-[#58cc02] text-white'
            : 'rounded-tl-md bg-green-50 text-gray-700 dark:bg-green-900/20 dark:text-gray-200'
        }`}
      >
        {/* 流式输出中显示光标闪烁 */}
        {message.isStreaming && (
          <span className="inline-block h-4 w-0.5 animate-pulse bg-[#58cc02] align-middle" />
        )}
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="text-sm leading-relaxed">
            <SimpleMarkdown content={message.content} />
          </div>
        )}
      </div>
    </div>
  )
}

/** AI 对话组件 */
export default function AIChat() {
  const {
    messages,
    isLoading,
    selectedModel,
    setSelectedModel,
    sendMessage,
    retryLastMessage,
    clearMessages,
    modelStatuses,
    messagesEndRef,
  } = useAIChat()

  const [inputValue, setInputValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /** 自动调整文本框高度 */
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }

  /** 处理发送消息 */
  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return
    sendMessage(inputValue)
    setInputValue('')
    // 重置文本框高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  /** 处理键盘事件：Enter 发送，Shift+Enter 换行 */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /** 输入变化时调整高度 */
  useEffect(() => {
    adjustTextareaHeight()
  }, [inputValue])

  return (
    <div className="flex h-full flex-col">
      {/* 顶部工具栏：模型选择 + 操作按钮 */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        {/* 模型选择器 */}
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          modelStatuses={modelStatuses}
        />

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 重试按钮 */}
          {messages.length > 0 && (
            <button
              onClick={retryLastMessage}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              title="重试"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          {/* 清空按钮 */}
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              title="清空对话"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* 空状态提示 */}
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
              <Bot className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
              AI 音乐助手
            </h3>
            <p className="max-w-[200px] text-xs text-gray-400">
              问我任何关于音乐创作、编曲或混音的问题
            </p>
          </div>
        )}

        {/* 消息列表 */}
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* 加载指示器 */}
          {isLoading && (
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-md bg-green-50 px-4 py-2 dark:bg-green-900/20">
                <LoadingDots />
              </div>
            </div>
          )}

          {/* 滚动锚点 */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
        <div className="flex items-end gap-2">
          {/* 多行文本输入框 */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#58cc02] focus:ring-2 focus:ring-[#58cc02]/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-[#58cc02]"
          />

          {/* 发送按钮 */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#58cc02] text-white transition-all hover:bg-[#4caf00] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#58cc02]"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {/* 快捷提示 */}
        <p className="mt-1.5 text-center text-xs text-gray-400">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  )
}
