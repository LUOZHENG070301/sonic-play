/**
 * Sonic Play - 五线谱编辑器工具栏组件
 * 提供音符时值选择、升降号选择、播放控制、撤销/重做、网格吸附等功能
 */
import {
  Play,
  Pause,
  Square,
  Undo2,
  Redo2,
  Grid3X3,
  Music,
} from 'lucide-react'
import type { NoteDuration, Accidental } from '@/types'

/** 工具栏组件属性 */
interface StaffToolbarProps {
  /** 当前输入的音符时值 */
  inputDuration: NoteDuration
  /** 当前输入的升降号 */
  inputAccidental: Accidental | null
  /** 是否正在播放 */
  isPlaying: boolean
  /** 是否启用网格吸附 */
  snapToGrid: boolean
  /** 是否可以撤销 */
  canUndo: boolean
  /** 是否可以重做 */
  canRedo: boolean
  /** 设置输入时值 */
  onSetDuration: (duration: NoteDuration) => void
  /** 设置输入升降号 */
  onSetAccidental: (accidental: Accidental | null) => void
  /** 播放/暂停 */
  onTogglePlay: () => void
  /** 停止播放 */
  onStop: () => void
  /** 撤销 */
  onUndo: () => void
  /** 重做 */
  onRedo: () => void
  /** 切换网格吸附 */
  onToggleSnap: () => void
}

/** 音符时值配置 */
const DURATION_OPTIONS: Array<{
  value: NoteDuration
  label: string
  icon: string
  shortcut: string
}> = [
  { value: 'whole', label: '全音符', icon: '\u{1D15D}', shortcut: '1' },
  { value: 'half', label: '二分音符', icon: '\u{1D15E}', shortcut: '2' },
  { value: 'quarter', label: '四分音符', icon: '\u{1D15F}', shortcut: '3' },
  { value: 'eighth', label: '八分音符', icon: '\u{1D160}', shortcut: '4' },
  { value: 'sixteenth', label: '十六分音符', icon: '\u{1D161}', shortcut: '5' },
]

/** 升降号配置 */
const ACCIDENTAL_OPTIONS: Array<{
  value: Accidental | null
  label: string
  icon: string
}> = [
  { value: null, label: '无升降号', icon: '' },
  { value: 'sharp', label: '升号 #', icon: '#' },
  { value: 'flat', label: '降号 b', icon: 'b' },
  { value: 'natural', label: '还原号', icon: '\u{266E}' },
]

/** Duolingo 风格按钮基础样式 */
const btnBase =
  'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150 select-none active:scale-95'

/** 默认按钮样式 */
const btnDefault = `${btnBase} bg-gray-700 text-gray-200 hover:bg-gray-600 shadow-sm hover:shadow-md`

/** 激活按钮样式 */
const btnActive = `${btnBase} bg-[#58cc02] text-white shadow-md hover:bg-[#4caf00]`

/** 禁用按钮样式 */
const btnDisabled = `${btnBase} bg-gray-800 text-gray-500 cursor-not-allowed opacity-50`

/**
 * 五线谱编辑器工具栏组件
 */
export default function StaffToolbar({
  inputDuration,
  inputAccidental,
  isPlaying,
  snapToGrid,
  canUndo,
  canRedo,
  onSetDuration,
  onSetAccidental,
  onTogglePlay,
  onStop,
  onUndo,
  onRedo,
  onToggleSnap,
}: StaffToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-800/80 px-4 py-2 backdrop-blur-sm">
      {/* === 音符时值选择 === */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs text-gray-400">时值</span>
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSetDuration(opt.value)}
            className={`h-9 min-w-[36px] px-2 text-lg ${inputDuration === opt.value ? btnActive : btnDefault}`}
            title={`${opt.label} (${opt.shortcut})`}
          >
            {opt.icon}
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="mx-1 h-6 w-px bg-gray-600" />

      {/* === 升降号选择 === */}
      <div className="flex items-center gap-1">
        <span className="mr-1 text-xs text-gray-400">变音</span>
        {ACCIDENTAL_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => onSetAccidental(opt.value)}
            className={`h-9 min-w-[36px] px-2 text-sm font-bold ${
              inputAccidental === opt.value ? btnActive : btnDefault
            }`}
            title={opt.label}
          >
            {opt.icon || <Music className="h-4 w-4" />}
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="mx-1 h-6 w-px bg-gray-600" />

      {/* === 播放控制 === */}
      <div className="flex items-center gap-1">
        <button
          onClick={onTogglePlay}
          className={`h-9 w-9 ${isPlaying ? 'bg-[#ff4b4b] text-white shadow-md hover:bg-[#e04343]' : 'bg-[#58cc02] text-white shadow-md hover:bg-[#4caf00]'}`}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={onStop}
          className={`h-9 w-9 ${btnDefault}`}
          title="停止"
        >
          <Square className="h-4 w-4" />
        </button>
      </div>

      {/* 分隔线 */}
      <div className="mx-1 h-6 w-px bg-gray-600" />

      {/* === 撤销/重做 === */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`h-9 w-9 ${canUndo ? btnDefault : btnDisabled}`}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`h-9 w-9 ${canRedo ? btnDefault : btnDisabled}`}
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      {/* 分隔线 */}
      <div className="mx-1 h-6 w-px bg-gray-600" />

      {/* === 网格吸附开关 === */}
      <button
        onClick={onToggleSnap}
        className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-all duration-150 active:scale-95 ${
          snapToGrid
            ? 'bg-[#58cc02] text-white shadow-md'
            : 'bg-gray-700 text-gray-200 shadow-sm hover:bg-gray-600'
        }`}
        title="网格吸附"
      >
        <Grid3X3 className="h-4 w-4" />
        <span>吸附</span>
      </button>

      {/* 右侧：当前状态显示 */}
      <div className="ml-auto flex items-center gap-3">
        {/* 当前时值显示 */}
        <div className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5">
          <span className="text-xs text-gray-400">当前工具：</span>
          <span className="text-sm font-medium text-gray-200">
            {DURATION_OPTIONS.find((d) => d.value === inputDuration)?.label || '四分音符'}
            {inputAccidental ? ` + ${ACCIDENTAL_OPTIONS.find((a) => a.value === inputAccidental)?.label}` : ''}
          </span>
        </div>

        {/* 快捷键提示 */}
        <div className="hidden items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 lg:flex">
          <span className="text-xs text-gray-500">A-G 输入 | Del 删除 | Space 播放</span>
        </div>
      </div>
    </div>
  )
}
