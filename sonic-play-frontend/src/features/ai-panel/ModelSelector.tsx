/**
 * Sonic Play - AI 模型选择器组件
 * 下拉选择 AI 模型提供商，显示连接状态，支持 API Key 配置
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Settings, Wifi, WifiOff } from 'lucide-react'
import type { AIModelProvider, ModelStatus } from './useAIChat'

/** 模型选择器属性 */
interface ModelSelectorProps {
  /** 当前选中的模型 */
  selectedModel: AIModelProvider
  /** 切换模型回调 */
  onModelChange: (model: AIModelProvider) => void
  /** 模型状态列表 */
  modelStatuses: ModelStatus[]
}

/** 模型显示名称映射 */
const MODEL_LABELS: Record<AIModelProvider, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  ollama: 'Ollama (本地)',
}

/** 模型图标颜色映射 */
const MODEL_COLORS: Record<AIModelProvider, string> = {
  gemini: 'bg-blue-500',
  openai: 'bg-green-500',
  ollama: 'bg-orange-500',
}

/** 模型选择器组件 */
export default function ModelSelector({
  selectedModel,
  onModelChange,
  modelStatuses,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  /** 获取当前模型的状态信息 */
  const currentStatus = modelStatuses.find(
    (s) => s.provider === selectedModel
  )

  /** 点击外部关闭下拉菜单 */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /** 处理模型切换 */
  const handleSelect = (model: AIModelProvider) => {
    onModelChange(model)
    setIsOpen(false)
  }

  /** 保存 API Key（模拟） */
  const handleSaveApiKey = () => {
    // 模拟保存 API Key 的操作
    setShowSettings(false)
    setApiKeyInput('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 模型选择按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        {/* 模型颜色标识点 */}
        <span
          className={`h-2 w-2 rounded-full ${MODEL_COLORS[selectedModel]}`}
        />

        {/* 模型名称 */}
        <span className="flex-1 text-left text-gray-700 dark:text-gray-200">
          {MODEL_LABELS[selectedModel]}
        </span>

        {/* 连接状态指示 */}
        {currentStatus?.isConfigured ? (
          <Wifi className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <WifiOff className="h-3.5 w-3.5 text-gray-400" />
        )}

        {/* 下拉箭头 */}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {/* 模型选项列表 */}
          {modelStatuses.map((status) => (
            <button
              key={status.provider}
              onClick={() => handleSelect(status.provider)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {/* 颜色标识 */}
              <span
                className={`h-2 w-2 rounded-full ${MODEL_COLORS[status.provider]}`}
              />

              {/* 模型名称 */}
              <span className="flex-1 text-left text-gray-700 dark:text-gray-200">
                {MODEL_LABELS[status.provider]}
              </span>

              {/* 连接状态 */}
              <span
                className={`text-xs ${
                  status.isConfigured
                    ? 'text-green-500'
                    : 'text-gray-400'
                }`}
              >
                {status.isConfigured ? '已连接' : '未配置'}
              </span>

              {/* 选中标记 */}
              {selectedModel === status.provider && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </button>
          ))}

          {/* 分隔线 */}
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

          {/* 设置按钮 */}
          <button
            onClick={() => {
              setShowSettings(true)
              setIsOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <Settings className="h-4 w-4" />
            <span>API Key 设置</span>
          </button>
        </div>
      )}

      {/* API Key 设置弹窗 */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              API Key 设置
            </h3>

            {/* 当前模型提示 */}
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              正在配置：
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {MODEL_LABELS[selectedModel]}
              </span>
            </p>

            {/* API Key 输入框 */}
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="请输入 API Key..."
              className="mb-4 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-green-500"
            />

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSettings(false)
                  setApiKeyInput('')
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                取消
              </button>
              <button
                onClick={handleSaveApiKey}
                className="rounded-lg bg-[#58cc02] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#4caf00] active:scale-95"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
