/**
 * Sonic Play - 音符属性面板组件
 * 显示和编辑选中音符的详细信息（音高、时值、力度、歌词等）
 */
import { useState, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown, Type, Music2 } from 'lucide-react'
import type { Note, NoteDuration, Accidental } from '@/types'
import { StaffRenderer } from './staffRenderer'

/** 音符属性面板属性 */
interface NotePropertiesProps {
  /** 选中的音符列表 */
  selectedNotes: Note[]
  /** 更新音符属性的回调 */
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void
}

/** 时值选项 */
const DURATION_OPTIONS: Array<{ value: NoteDuration; label: string }> = [
  { value: 'whole', label: '全音符' },
  { value: 'half', label: '二分音符' },
  { value: 'quarter', label: '四分音符' },
  { value: 'eighth', label: '八分音符' },
  { value: 'sixteenth', label: '十六分音符' },
]

/** 升降号选项 */
const ACCIDENTAL_OPTIONS: Array<{ value: Accidental | undefined; label: string }> = [
  { value: undefined, label: '无' },
  { value: 'sharp', label: '#' },
  { value: 'flat', label: 'b' },
  { value: 'natural', label: '\u{266E}' },
  { value: 'double-sharp', label: 'x' },
  { value: 'double-flat', label: 'bb' },
]

/** 渲染器实例（用于音高转换） */
const renderer = new StaffRenderer()

/**
 * 音符属性面板组件
 */
export default function NoteProperties({ selectedNotes, onUpdateNote }: NotePropertiesProps) {
  // 如果没有选中音符，显示提示
  if (selectedNotes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <Music2 className="h-10 w-10 text-gray-600" />
        <p className="text-sm text-gray-500">点击五线谱上的音符查看属性</p>
        <p className="text-xs text-gray-600">
          点击空白处添加新音符
        </p>
      </div>
    )
  }

  // 多选时显示简要信息
  if (selectedNotes.length > 1) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <Music2 className="h-10 w-10 text-[#58cc02]" />
        <p className="text-sm font-medium text-gray-300">
          已选中 {selectedNotes.length} 个音符
        </p>
        <p className="text-xs text-gray-500">
          使用方向键可批量修改音高和时值
        </p>
      </div>
    )
  }

  // 单选时显示详细属性编辑
  const note = selectedNotes[0]
  return <SingleNoteEditor note={note} onUpdateNote={onUpdateNote} />
}

/** 单个音符编辑器 */
function SingleNoteEditor({
  note,
  onUpdateNote,
}: {
  note: Note
  onUpdateNote: (noteId: string, updates: Partial<Note>) => void
}) {
  const [lyrics, setLyrics] = useState('')
  const [localVelocity, setLocalVelocity] = useState(note.velocity)

  // 同步外部音符变化
  useEffect(() => {
    setLocalVelocity(note.velocity)
  }, [note.velocity])

  /** 音高上移半音 */
  const pitchUp = useCallback(() => {
    const midi = renderer.pitchToMidi(note.pitch)
    const newMidi = Math.min(108, midi + 1)
    onUpdateNote(note.id, { pitch: renderer.midiToPitch(newMidi) })
  }, [note.id, note.pitch, onUpdateNote])

  /** 音高下移半音 */
  const pitchDown = useCallback(() => {
    const midi = renderer.pitchToMidi(note.pitch)
    const newMidi = Math.max(21, midi - 1)
    onUpdateNote(note.id, { pitch: renderer.midiToPitch(newMidi) })
  }, [note.id, note.pitch, onUpdateNote])

  /** 处理力度变化 */
  const handleVelocityChange = useCallback(
    (value: number) => {
      setLocalVelocity(value)
      onUpdateNote(note.id, { velocity: value })
    },
    [note.id, onUpdateNote]
  )

  /** 处理时值变化 */
  const handleDurationChange = useCallback(
    (duration: NoteDuration) => {
      onUpdateNote(note.id, { duration })
    },
    [note.id, onUpdateNote]
  )

  /** 处理升降号变化 */
  const handleAccidentalChange = useCallback(
    (accidental: Accidental | undefined) => {
      onUpdateNote(note.id, { accidental })
    },
    [note.id, onUpdateNote]
  )

  /** 处理歌词输入 */
  const handleLyricsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLyrics(e.target.value)
    },
    []
  )

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#58cc02]" />
        <h3 className="text-sm font-semibold text-gray-200">音符属性</h3>
      </div>

      {/* === 音高编辑 === */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400">音高</label>
        <div className="flex items-center gap-2">
          <button
            onClick={pitchDown}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-gray-300 transition-colors hover:bg-gray-600 active:scale-95"
            title="降低半音"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <div className="flex h-10 flex-1 items-center justify-center rounded-lg bg-gray-900 text-lg font-bold text-gray-100">
            {note.pitch}
          </div>
          <button
            onClick={pitchUp}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-gray-300 transition-colors hover:bg-gray-600 active:scale-95"
            title="升高半音"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-600">MIDI: {renderer.pitchToMidi(note.pitch)}</p>
      </div>

      {/* === 时值选择 === */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400">时值</label>
        <div className="grid grid-cols-2 gap-1.5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleDurationChange(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                note.duration === opt.value
                  ? 'bg-[#58cc02] text-white shadow-sm'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* === 力度编辑 === */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-gray-400">力度</label>
          <span className="text-xs font-mono text-gray-300">{localVelocity}</span>
        </div>
        <input
          type="range"
          min={0}
          max={127}
          value={localVelocity}
          onChange={(e) => handleVelocityChange(Number(e.target.value))}
          className="w-full accent-[#58cc02]"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>pp</span>
          <span>mp</span>
          <span>mf</span>
          <span>f</span>
          <span>ff</span>
        </div>
      </div>

      {/* === 升降号选择 === */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-400">升降号</label>
        <div className="flex gap-1.5">
          {ACCIDENTAL_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleAccidentalChange(opt.value)}
              className={`flex h-8 min-w-[36px] flex-1 items-center justify-center rounded-lg text-sm font-bold transition-all active:scale-95 ${
                note.accidental === opt.value
                  ? 'bg-[#58cc02] text-white shadow-sm'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* === 歌词文本 === */}
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
          <Type className="h-3 w-3" />
          歌词文本
        </label>
        <input
          type="text"
          value={lyrics}
          onChange={handleLyricsChange}
          placeholder="输入歌词..."
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none transition-colors focus:border-[#58cc02] focus:ring-1 focus:ring-[#58cc02]"
        />
      </div>

      {/* === 其他信息 === */}
      <div className="space-y-2 border-t border-gray-700 pt-3">
        <label className="text-xs font-medium text-gray-400">详细信息</label>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">起始拍</span>
            <span className="font-mono text-gray-300">{note.startBeat.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">休止符</span>
            <span className="text-gray-300">{note.isRest ? '是' : '否'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">颤音</span>
            <span className="text-gray-300">{note.vibrato ? '是' : '否'}</span>
          </div>
          {note.tiedTo && (
            <div className="flex justify-between">
              <span className="text-gray-500">连音线</span>
              <span className="font-mono text-gray-300">{note.tiedTo.slice(0, 8)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
