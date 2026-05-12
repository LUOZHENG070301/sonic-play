/**
 * Sonic Play - AI 面板主组件
 * 侧边栏抽屉式设计，支持标签切换、拖拽调整宽度、滑入/滑出动画
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, MessageSquare, BarChart3, Lightbulb, GripVertical } from 'lucide-react'
import { useEditorStore } from '@/stores/editorStore'
import AIChat from './AIChat'
import AIAnalysis from './AIAnalysis'
import AISuggestions from './AISuggestions'

/** 面板标签类型 */
type PanelTab = 'chat' | 'analysis' | 'suggestions'

/** 标签配置 */
const TAB_CONFIG: {
  id: PanelTab
  label: string
  icon: typeof MessageSquare
}[] = [
  { id: 'chat', label: '对话', icon: MessageSquare },
  { id: 'analysis', label: '分析', icon: BarChart3 },
  { id: 'suggestions', label: '建议', icon: Lightbulb },
]

/** 面板最小宽度 */
const MIN_PANEL_WIDTH = 320
/** 面板最大宽度 */
const MAX_PANEL_WIDTH = 600
/** 面板默认宽度 */
const DEFAULT_PANEL_WIDTH = 400

/** AI 面板主组件 */
export default function AIPanel() {
  const { isAIPanelOpen, toggleAIPanel } = useEditorStore()
  const [activeTab, setActiveTab] = useState<PanelTab>('chat')
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const isDragging = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)

  /** 处理拖拽开始 */
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      isDragging.current = true

      const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!isDragging.current) return

        const moveClientX =
          'touches' in moveEvent
            ? moveEvent.touches[0].clientX
            : moveEvent.clientX

        // 计算新宽度：从窗口右侧到鼠标位置的距离
        const newWidth = window.innerWidth - moveClientX
        const clampedWidth = Math.max(
          MIN_PANEL_WIDTH,
          Math.min(MAX_PANEL_WIDTH, newWidth)
        )
        setPanelWidth(clampedWidth)
      }

      const handleDragEnd = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleDragMove)
        document.removeEventListener('mouseup', handleDragEnd)
        document.removeEventListener('touchmove', handleDragMove)
        document.removeEventListener('touchend', handleDragEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.addEventListener('touchmove', handleDragMove)
      document.addEventListener('touchend', handleDragEnd)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    []
  )

  /** 阻止文本选择（拖拽时） */
  useEffect(() => {
    if (isDragging.current) {
      return () => {
        document.body.style.userSelect = ''
      }
    }
  }, [panelWidth])

  return (
    <AnimatePresence>
      {isAIPanelOpen && (
        <>
          {/* 遮罩层（可选，点击关闭面板） */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20"
            onClick={toggleAIPanel}
          />

          {/* 面板主体 */}
          <motion.div
            ref={panelRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{ width: panelWidth }}
            className="fixed right-0 top-0 z-50 flex h-full flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
          >
            {/* 面板头部 */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
              {/* 标题 */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#58cc02]">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  AI 助手
                </h2>
              </div>

              {/* 关闭按钮 */}
              <button
                onClick={toggleAIPanel}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 标签切换栏 */}
            <div className="flex border-b border-gray-100 px-4 dark:border-gray-700">
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'text-[#58cc02]'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>

                    {/* 激活状态底部指示条 */}
                    {isActive && (
                      <motion.div
                        layoutId="ai-panel-tab-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#58cc02]"
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* 标签内容区域 */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {activeTab === 'chat' && <AIChat />}
                  {activeTab === 'analysis' && <AIAnalysis />}
                  {activeTab === 'suggestions' && <AISuggestions />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 拖拽调整宽度的手柄 */}
            <div
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className="absolute left-0 top-0 z-10 flex h-full w-2 cursor-col-resize items-center justify-center hover:bg-[#58cc02]/10 active:bg-[#58cc02]/20"
            >
              <GripVertical className="h-4 w-4 text-gray-300 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100 dark:text-gray-600" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
