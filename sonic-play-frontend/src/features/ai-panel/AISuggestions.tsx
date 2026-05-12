/**
 * Sonic Play - AI 创作建议组件
 * 提供音乐创作建议卡片，支持一键应用到项目
 * 支持真实 Gemini API 和 Mock 模式
 */
import { useState, useCallback } from 'react'
import {
  Headphones,
  ArrowRightLeft,
  Sparkles,
  Music,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { v4 as uuidv4 } from 'uuid'
import type { Note, NoteDuration } from '@/types'
import { getGeminiService, GeminiService } from '@/services/geminiService'
import {
  createLoFiGenerationPrompt,
  createTransitionPrompt,
  createChordEnhancementPrompt,
  createMelodyContinuationPrompt,
  parseJsonResult,
  SYSTEM_INSTRUCTION_JSON_OUTPUT,
  type MelodyContinuationResult,
} from '@/lib/prompts'

/** 建议卡片数据接口 */
interface SuggestionCard {
  /** 唯一标识 */
  id: string
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 图标 */
  icon: typeof Headphones
  /** 图标背景色 */
  iconBg: string
  /** 图标颜色 */
  iconColor: string
  /** 标签色 */
  tagColor: string
  /** 标签文字 */
  tag: string
}

/** 建议卡片列表 */
const SUGGESTION_CARDS: SuggestionCard[] = [
  {
    id: 'lofi',
    title: '注入 Lo-Fi 灵感',
    description: 'AI 将为你生成复古节拍，加入磁带质感和环境噪音，创造放松的 Lo-Fi 氛围',
    icon: Headphones,
    iconBg: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-500',
    tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    tag: 'Lo-Fi',
  },
  {
    id: 'transition',
    title: '建议一段过渡',
    description: 'AI 将分析当前段落结构，创作一段自然的桥段过渡，让乐曲更加流畅',
    icon: ArrowRightLeft,
    iconBg: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-500',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    tag: '过渡',
  },
  {
    id: 'chord',
    title: '和弦增强',
    description: 'AI 将丰富当前和声，添加七和弦、九和弦等扩展和弦，提升音乐色彩',
    icon: Sparkles,
    iconBg: 'bg-purple-50 dark:bg-purple-900/20',
    iconColor: 'text-purple-500',
    tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    tag: '和声',
  },
  {
    id: 'melody',
    title: '旋律续写',
    description: 'AI 将根据当前旋律走向，续写一段连贯的旋律线条，保持风格一致性',
    icon: Music,
    iconBg: 'bg-green-50 dark:bg-green-900/20',
    iconColor: 'text-green-500',
    tagColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    tag: '旋律',
  },
]

/** 生成模拟音符数据 */
const generateMockNotes = (type: string): Note[] => {
  /** Lo-Fi 风格音符 */
  if (type === 'lofi') {
    const pitches = ['C3', 'E3', 'G3', 'B3', 'C4', 'D4', 'E4', 'G4']
    return pitches.map((pitch, i) => ({
      id: uuidv4(),
      pitch,
      duration: 'eighth' as NoteDuration,
      velocity: 60 + Math.floor(Math.random() * 30),
      startBeat: i * 0.5,
      isRest: false,
    }))
  }

  /** 过渡段音符 */
  if (type === 'transition') {
    const pitches = ['G4', 'F#4', 'E4', 'D4', 'C4', 'B3', 'A3', 'G3']
    return pitches.map((pitch, i) => ({
      id: uuidv4(),
      pitch,
      duration: 'quarter' as NoteDuration,
      velocity: 70 + Math.floor(Math.random() * 20),
      startBeat: i * 1,
      isRest: false,
    }))
  }

  /** 和弦增强音符 */
  if (type === 'chord') {
    const chords = [
      ['C4', 'E4', 'G4', 'B4'],
      ['A3', 'C4', 'E4', 'G4'],
      ['F3', 'A3', 'C4', 'E4'],
      ['G3', 'B3', 'D4', 'F4'],
    ]
    const notes: Note[] = []
    chords.forEach((chord, chordIndex) => {
      chord.forEach((pitch) => {
        notes.push({
          id: uuidv4(),
          pitch,
          duration: 'half' as NoteDuration,
          velocity: 65 + Math.floor(Math.random() * 25),
          startBeat: chordIndex * 2,
          isRest: false,
        })
      })
    })
    return notes
  }

  /** 旋律续写音符 */
  const pitches = ['E4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4', 'G4', 'E4', 'D4', 'C4', 'D4']
  return pitches.map((pitch, i) => ({
    id: uuidv4(),
    pitch,
    duration: (i % 3 === 0 ? 'quarter' : 'eighth') as NoteDuration,
    velocity: 75 + Math.floor(Math.random() * 20),
    startBeat: i * 0.5,
    isRest: false,
  }))
}

/** 单个建议卡片组件 */
function SuggestionItem({
  card,
  onApply,
  isApplying,
  isApplied,
  error,
}: {
  card: SuggestionCard
  onApply: (id: string) => void
  isApplying: boolean
  isApplied: boolean
  error?: string
}) {
  const IconComponent = card.icon

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800">
      {/* 卡片头部：图标 + 标签 */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
        >
          <IconComponent className={`h-5 w-5 ${card.iconColor}`} />
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${card.tagColor}`}
        >
          {card.tag}
        </span>
      </div>

      {/* 标题 */}
      <h4 className="mb-1.5 text-sm font-bold text-gray-800 dark:text-gray-100">
        {card.title}
      </h4>

      {/* 描述 */}
      <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {card.description}
      </p>

      {/* 错误提示 */}
      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 应用按钮 */}
      <button
        onClick={() => onApply(card.id)}
        disabled={isApplying}
        className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ${
          isApplied
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-[#58cc02] text-white hover:bg-[#4caf00] disabled:opacity-60'
        }`}
      >
        {isApplying ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>生成中...</span>
          </>
        ) : isApplied ? (
          <>
            <Check className="h-3.5 w-3.5" />
            <span>已应用</span>
          </>
        ) : (
          <span>应用建议</span>
        )}
      </button>
    </div>
  )
}

/** AI 创作建议组件 */
export default function AISuggestions() {
  const { project, addNote } = useProjectStore()
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})

  /** 检查是否使用真实 API */
  const useRealAPI = GeminiService.hasApiKey()

  /** 使用真实 Gemini API 生成音符 */
  const generateWithRealAPI = useCallback(async (cardId: string): Promise<Note[]> => {
    const service = getGeminiService()
    if (!service) {
      throw new Error('Gemini 服务未初始化')
    }

    let prompt: string
    const projectKey = 'C Major' // 默认调性，实际应从项目获取

    switch (cardId) {
      case 'lofi':
        prompt = createLoFiGenerationPrompt()
        break
      case 'transition':
        prompt = createTransitionPrompt({
          fromSection: '主歌',
          toSection: '副歌',
          key: projectKey,
          tempo: project.tempo,
        })
        break
      case 'chord':
        prompt = createChordEnhancementPrompt(['C', 'Am', 'F', 'G'])
        break
      case 'melody':
        prompt = createMelodyContinuationPrompt({
          key: projectKey,
          currentNotes: [
            { pitch: 'C4', duration: 'quarter' },
            { pitch: 'D4', duration: 'eighth' },
            { pitch: 'E4', duration: 'quarter' },
          ],
          style: '流行',
          barsToGenerate: 2,
        })
        break
      default:
        throw new Error('未知的建议类型')
    }

    const response = await service.generateContent(prompt, SYSTEM_INSTRUCTION_JSON_OUTPUT, {
      temperature: 0.7,
    })

    // 解析 JSON 结果
    const result = parseJsonResult<MelodyContinuationResult>(response)
    if (!result || !result.notes) {
      throw new Error('无法解析生成结果')
    }

    // 转换为 Note 格式
    return result.notes.map((n, i) => ({
      id: uuidv4(),
      pitch: n.pitch,
      duration: n.duration as NoteDuration,
      velocity: n.velocity,
      startBeat: i * 0.5, // 简单的时间分配
      isRest: false,
    }))
  }, [project.tempo])

  /** 使用 Mock 模式生成音符 */
  const generateWithMock = useCallback(async (cardId: string): Promise<Note[]> => {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return generateMockNotes(cardId)
  }, [])

  /** 应用建议到项目 */
  const handleApply = async (cardId: string) => {
    if (applyingId) return

    setApplyingId(cardId)
    setErrors((prev) => ({ ...prev, [cardId]: '' }))

    try {
      let notes: Note[]

      if (useRealAPI) {
        notes = await generateWithRealAPI(cardId)
      } else {
        notes = await generateWithMock(cardId)
      }

      // 获取第一个音轨
      const firstTrack = project.tracks[0]
      if (firstTrack) {
        // 获取第一个小节
        const firstMeasure = firstTrack.measures[0]
        if (firstMeasure) {
          // 添加音符到项目
          for (const note of notes) {
            addNote(firstTrack.id, firstMeasure.id, note)
          }
        }
      }

      setAppliedIds((prev) => new Set(prev).add(cardId))

      // 5 秒后重置应用状态
      setTimeout(() => {
        setAppliedIds((prev) => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
      }, 5000)
    } catch (err) {
      console.error('生成失败:', err)
      setErrors((prev) => ({
        ...prev,
        [cardId]: err instanceof Error ? err.message : '生成失败',
      }))
      // 降级到 Mock 数据
      const mockNotes = generateMockNotes(cardId)
      const firstTrack = project.tracks[0]
      if (firstTrack) {
        const firstMeasure = firstTrack.measures[0]
        if (firstMeasure) {
          for (const note of mockNotes) {
            addNote(firstTrack.id, firstMeasure.id, note)
          }
        }
      }
      setAppliedIds((prev) => new Set(prev).add(cardId))
      setTimeout(() => {
        setAppliedIds((prev) => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
      }, 5000)
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
      {/* 标题区域 */}
      <div className="mb-4">
        <h3 className="mb-1 text-sm font-bold text-gray-800 dark:text-gray-100">
          创作灵感
        </h3>
        <p className="text-xs text-gray-400">
          {useRealAPI
            ? '使用 Gemini API 生成建议'
            : '使用模拟数据（未配置 API Key）'}
        </p>
      </div>

      {/* 建议卡片列表 */}
      <div className="space-y-3">
        {SUGGESTION_CARDS.map((card) => (
          <SuggestionItem
            key={card.id}
            card={card}
            onApply={handleApply}
            isApplying={applyingId === card.id}
            isApplied={appliedIds.has(card.id)}
            error={errors[card.id]}
          />
        ))}
      </div>
    </div>
  )
}
