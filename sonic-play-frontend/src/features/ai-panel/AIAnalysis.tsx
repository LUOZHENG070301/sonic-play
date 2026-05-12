/**
 * Sonic Play - AI 音乐分析组件
 * 分析当前项目的调性、BPM、和弦、风格和结构
 * 支持真实 Gemini API 和 Mock 模式
 */
import { useState, useCallback } from 'react'
import {
  Zap,
  Music,
  Gauge,
  Layers,
  Tag,
  BarChart3,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { getGeminiService, GeminiService } from '@/services/geminiService'
import {
  createMusicAnalysisPrompt,
  parseJsonResult,
  SYSTEM_INSTRUCTION_JSON_OUTPUT,
  type MusicAnalysisResult,
} from '@/lib/prompts'

/** 音乐结构段类型 */
interface StructureSegment {
  /** 段落类型 */
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro'
  /** 段落标签 */
  label: string
  /** 起始小节 */
  startMeasure: number
  /** 结束小节 */
  endMeasure: number
}

/** 分析结果接口 */
interface AnalysisResult {
  /** 调性 */
  key: string
  /** BPM */
  bpm: number
  /** 和弦进行 */
  chordProgression: string[]
  /** 风格标签 */
  styleTags: string[]
  /** 结构分析 */
  structure: StructureSegment[]
  /** 分析说明 */
  description?: string
}

/** 段落类型颜色映射 */
const SEGMENT_COLORS: Record<StructureSegment['type'], string> = {
  intro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  verse: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  chorus: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  bridge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  outro: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
}

/** 段落类型标签映射 */
const SEGMENT_LABELS: Record<StructureSegment['type'], string> = {
  intro: '前奏',
  verse: '主歌',
  chorus: '副歌',
  bridge: '桥段',
  outro: '尾奏',
}

/** 生成模拟分析结果 */
const generateMockAnalysis = (tempo: number): AnalysisResult => ({
  key: 'C Major',
  bpm: tempo,
  chordProgression: [
    'Cmaj7',
    'Am7',
    'Dm7',
    'G7',
    'Fmaj7',
    'Em7',
    'Am7',
    'Dm7-G7',
  ],
  styleTags: ['流行', '轻音乐', '原声', '抒情'],
  structure: [
    { type: 'intro', label: '前奏', startMeasure: 1, endMeasure: 2 },
    { type: 'verse', label: '主歌 A', startMeasure: 3, endMeasure: 6 },
    { type: 'chorus', label: '副歌', startMeasure: 7, endMeasure: 10 },
    { type: 'verse', label: '主歌 B', startMeasure: 11, endMeasure: 14 },
    { type: 'bridge', label: '桥段', startMeasure: 15, endMeasure: 16 },
  ],
  description: '这是一首典型的流行歌曲结构，使用了经典的 I-V-vi-IV 和弦进行。',
})

/** AI 音乐分析组件 */
export default function AIAnalysis() {
  const { project, updateTempo } = useProjectStore()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** 检查是否使用真实 API */
  const useRealAPI = GeminiService.hasApiKey()

  /** 使用真实 Gemini API 进行分析 */
  const analyzeWithRealAPI = useCallback(async () => {
    const service = getGeminiService()
    if (!service) {
      throw new Error('Gemini 服务未初始化')
    }

    // 构建项目信息
    const projectInfo = {
      name: project.name,
      tempo: project.tempo,
      timeSignature: `${project.timeSignatureNumerator}/${project.timeSignatureDenominator}`,
      totalMeasures: project.totalMeasures,
      tracks: project.tracks.map((track) => ({
        name: track.name,
        instrument: track.instrument,
        notesCount: track.measures.reduce((sum, m) => sum + m.notes.length, 0),
      })),
    }

    const prompt = createMusicAnalysisPrompt(projectInfo)
    const response = await service.generateContent(prompt, SYSTEM_INSTRUCTION_JSON_OUTPUT, {
      temperature: 0.3,
    })

    // 解析 JSON 结果
    const result = parseJsonResult<MusicAnalysisResult>(response)
    if (!result) {
      throw new Error('无法解析分析结果')
    }

    return {
      key: result.key,
      bpm: result.bpm || project.tempo,
      chordProgression: result.chordProgression,
      styleTags: result.styleTags,
      structure: result.structure,
      description: result.description,
    } as AnalysisResult
  }, [project])

  /** 使用 Mock 模式进行分析 */
  const analyzeWithMock = useCallback(async () => {
    // 模拟延迟
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return generateMockAnalysis(project.tempo)
  }, [project.tempo])

  /** 执行分析 */
  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setApplied(false)
    setError(null)

    try {
      let result: AnalysisResult

      if (useRealAPI) {
        result = await analyzeWithRealAPI()
      } else {
        result = await analyzeWithMock()
      }

      setAnalysisResult(result)
    } catch (err) {
      console.error('分析失败:', err)
      setError(err instanceof Error ? err.message : '分析失败，请重试')
      // 降级到 Mock 结果
      setAnalysisResult(generateMockAnalysis(project.tempo))
    } finally {
      setIsAnalyzing(false)
    }
  }

  /** 应用分析结果到项目 */
  const handleApply = () => {
    if (!analysisResult) return

    // 将检测到的 BPM 应用到项目
    updateTempo(analysisResult.bpm)
    setApplied(true)

    // 3 秒后重置应用状态
    setTimeout(() => setApplied(false), 3000)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-4 py-4">
        {/* 分析按钮 */}
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#58cc02] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#4caf00] hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>正在分析...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>分析当前项目</span>
            </>
          )}
        </button>

        {/* API 状态提示 */}
        <p className="mt-2 text-center text-xs text-gray-400">
          {useRealAPI ? '使用 Gemini API 分析' : '使用模拟数据（未配置 API Key）'}
        </p>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 分析结果展示 */}
      {analysisResult && (
        <div className="flex-1 space-y-4 px-4 pb-4">
          {/* 调性检测 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <Music className="h-4 w-4 text-[#58cc02]" />
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                调性检测
              </h4>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {analysisResult.key}
            </p>
          </div>

          {/* BPM 检测 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#58cc02]" />
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                速度检测
              </h4>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {analysisResult.bpm}{' '}
              <span className="text-sm font-normal text-gray-400">BPM</span>
            </p>
          </div>

          {/* 和弦进行分析 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#58cc02]" />
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                和弦进行
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysisResult.chordProgression.map((chord, index) => (
                <span
                  key={index}
                  className="rounded-lg bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400"
                >
                  {chord}
                </span>
              ))}
            </div>
          </div>

          {/* 风格分类标签 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-[#58cc02]" />
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                风格分类
              </h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysisResult.styleTags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 结构分析 */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#58cc02]" />
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                结构分析
              </h4>
            </div>
            <div className="space-y-2">
              {analysisResult.structure.map((segment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50"
                >
                  {/* 段落标签 */}
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${SEGMENT_COLORS[segment.type]}`}
                  >
                    {SEGMENT_LABELS[segment.type]}
                  </span>

                  {/* 段落描述 */}
                  <span className="flex-1 text-sm text-gray-600 dark:text-gray-300">
                    {segment.label}
                  </span>

                  {/* 小节范围 */}
                  <span className="text-xs text-gray-400">
                    第 {segment.startMeasure}-{segment.endMeasure} 小节
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 分析说明 */}
          {analysisResult.description && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h4 className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                分析说明
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {analysisResult.description}
              </p>
            </div>
          )}

          {/* 应用按钮 */}
          <button
            onClick={handleApply}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold transition-all active:scale-[0.98] ${
              applied
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'border-2 border-[#58cc02] bg-white text-[#58cc02] hover:bg-green-50 dark:border-[#58cc02] dark:bg-gray-800 dark:text-[#58cc02] dark:hover:bg-green-900/10'
            }`}
          >
            {applied ? (
              <>
                <Check className="h-4 w-4" />
                <span>已应用到项目</span>
              </>
            ) : (
              <span>一键应用到项目</span>
            )}
          </button>
        </div>
      )}

      {/* 未分析时的空状态 */}
      {!analysisResult && !isAnalyzing && (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/20">
            <BarChart3 className="h-8 w-8 text-[#58cc02]" />
          </div>
          <h3 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-200">
            音乐分析
          </h3>
          <p className="max-w-[220px] text-xs text-gray-400">
            点击上方按钮，AI 将分析当前项目的调性、节奏、和弦和结构
          </p>
        </div>
      )}
    </div>
  )
}
