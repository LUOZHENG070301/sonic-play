/**
 * Sonic Play - 音轨时间轴
 * 渲染每条音轨的波形或 MIDI 音符块可视化、播放头、时间标尺、缩放控制
 */
import { useRef, useEffect, useMemo, useCallback } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import type { Track, Note } from '@/types'

/** 每个音轨行的高度（像素） */
const TRACK_ROW_HEIGHT = 80

/** 时间标尺高度（像素） */
const RULER_HEIGHT = 28

/** 每小节基础宽度（像素），会乘以 zoomLevel */
const BASE_MEASURE_WIDTH = 120

/** TrackTimeline 组件属性 */
interface TrackTimelineProps {
  /** 当前播放位置（秒） */
  currentPosition: number
}

/** 将音符名称转换为 MIDI 编号（简化版，仅用于垂直位置计算） */
function pitchToMidiNumber(pitch: string): number {
  const noteMap: Record<string, number> = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3,
    E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8,
    Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
  }
  const match = pitch.match(/^([A-G][#b]?)(\d+)$/)
  if (!match) return 60
  const noteName = match[1]
  const octave = parseInt(match[2], 10)
  return (noteMap[noteName] ?? 0) + (octave + 1) * 12
}

/** 音轨时间轴组件 */
export default function TrackTimeline({ currentPosition }: TrackTimelineProps) {
  const { project } = useProjectStore()
  const { zoomLevel, scrollX, scrollY, setScrollPosition, zoomIn, zoomOut } = useEditorStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // 每小节宽度（受缩放影响）
  const measureWidth = BASE_MEASURE_WIDTH * zoomLevel

  // 总宽度
  const totalWidth = project.totalMeasures * measureWidth

  // 总高度（所有音轨 + 标尺）
  const totalHeight = RULER_HEIGHT + project.tracks.length * TRACK_ROW_HEIGHT

  // 每小节的拍数
  const beatsPerMeasure = (project.timeSignatureNumerator / project.timeSignatureDenominator) * 4

  // 每拍宽度
  const beatWidth = measureWidth / beatsPerMeasure

  /** 生成时间标尺刻度 */
  const rulerMarks = useMemo(() => {
    const marks: Array<{ position: number; label: string; isMajor: boolean }> = []
    for (let i = 0; i < project.totalMeasures; i++) {
      // 小节号标记（主刻度）
      marks.push({
        position: i * measureWidth,
        label: `${i + 1}`,
        isMajor: true,
      })
      // 拍号标记（次刻度）
      for (let b = 1; b < beatsPerMeasure; b++) {
        marks.push({
          position: i * measureWidth + b * beatWidth,
          label: '',
          isMajor: false,
        })
      }
    }
    return marks
  }, [project.totalMeasures, measureWidth, beatsPerMeasure, beatWidth])

  /** 计算播放头位置（像素） */
  const playheadX = useMemo(() => {
    const beatsPerSecond = project.tempo / 60
    const currentBeats = currentPosition * beatsPerSecond
    const currentMeasure = currentBeats / beatsPerMeasure
    return currentMeasure * measureWidth
  }, [currentPosition, project.tempo, beatsPerMeasure, measureWidth])

  /** 渲染 MIDI 音符块 */
  const renderMidiNotes = useCallback(
    (track: Track, _trackIndex: number) => {
      const notes: Note[] = []
      for (const measure of track.measures) {
        for (const note of measure.notes) {
          if (!note.isRest) {
            notes.push({ ...note, startBeat: measure.index * beatsPerMeasure + note.startBeat })
          }
        }
      }

      if (notes.length === 0) return null

      // 获取音高范围用于垂直映射
      const midiNumbers = notes.map((n) => pitchToMidiNumber(n.pitch))
      const minMidi = Math.min(...midiNumbers)
      const maxMidi = Math.max(...midiNumbers)
      const midiRange = Math.max(maxMidi - minMidi, 1)

      return notes.map((note) => {
        const x = (note.startBeat / beatsPerMeasure) * measureWidth
        const durationBeats = getNoteDurationBeats(note.duration)
        const width = Math.max((durationBeats / beatsPerMeasure) * measureWidth, 4)

        // 垂直位置：基于音高在范围内的比例
        const normalizedPitch = (pitchToMidiNumber(note.pitch) - minMidi) / midiRange
        const noteHeight = Math.max(TRACK_ROW_HEIGHT * 0.15, 8)
        const y = TRACK_ROW_HEIGHT * 0.1 + normalizedPitch * (TRACK_ROW_HEIGHT * 0.7 - noteHeight)

        return (
          <div
            key={note.id}
            className="absolute rounded-sm opacity-80 hover:opacity-100 transition-opacity"
            style={{
              left: x,
              top: y,
              width,
              height: noteHeight,
              backgroundColor: track.color,
            }}
            title={`${note.pitch} (力度: ${note.velocity})`}
          />
        )
      })
    },
    [beatsPerMeasure, measureWidth]
  )

  /** 处理水平滚动同步 */
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget
      setScrollPosition(target.scrollLeft, target.scrollTop)
    },
    [setScrollPosition]
  )

  /** 同步外部滚动状态到容器 */
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollX
      scrollContainerRef.current.scrollTop = scrollY
    }
  }, [scrollX, scrollY])

  /** 鼠标滚轮缩放 */
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        if (e.deltaY < 0) {
          zoomIn()
        } else {
          zoomOut()
        }
      }
    },
    [zoomIn, zoomOut]
  )

  return (
    <div className="relative flex-1 overflow-hidden bg-[#16213e]">
      {/* 缩放控制 */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-[#0f0f23]/80 px-2 py-1">
        <button
          onClick={zoomOut}
          className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-gray-300 text-xs transition-colors hover:bg-gray-600"
          title="缩小"
        >
          -
        </button>
        <span className="w-10 text-center text-[10px] text-gray-400">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="flex h-6 w-6 items-center justify-center rounded bg-gray-700 text-gray-300 text-xs transition-colors hover:bg-gray-600"
          title="放大"
        >
          +
        </button>
      </div>

      {/* 滚动容器 */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-auto"
        onScroll={handleScroll}
        onWheel={handleWheel}
      >
        <div
          ref={containerRef}
          className="relative"
          style={{ width: totalWidth, minHeight: totalHeight }}
        >
          {/* 时间标尺 */}
          <div
            className="sticky top-0 z-10 flex border-b border-gray-700/50 bg-[#0f0f23]"
            style={{ height: RULER_HEIGHT }}
          >
            {rulerMarks.map((mark, i) => (
              <div
                key={i}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: mark.position }}
              >
                {/* 刻度线 */}
                <div
                  className={`w-px ${
                    mark.isMajor ? 'h-3 bg-gray-500' : 'h-1.5 bg-gray-700'
                  }`}
                />
                {/* 小节号标签 */}
                {mark.isMajor && (
                  <span className="mt-0.5 text-[10px] text-gray-400">
                    {mark.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 音轨行 */}
          {project.tracks.map((track, trackIndex) => (
            <div
              key={track.id}
              className="relative border-b border-gray-700/30"
              style={{ height: TRACK_ROW_HEIGHT }}
            >
              {/* 小节分隔线 */}
              {Array.from({ length: project.totalMeasures + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full w-px bg-gray-700/30"
                  style={{ left: i * measureWidth }}
                />
              ))}

              {/* MIDI 音符块可视化 */}
              {renderMidiNotes(track, trackIndex)}

              {/* 空音轨提示 */}
              {track.measures.every((m) => m.notes.length === 0) && (
                <div className="flex h-full items-center justify-center">
                  <span className="text-xs text-gray-600">空音轨</span>
                </div>
              )}
            </div>
          ))}

          {/* 播放头 */}
          <div
            className="pointer-events-none absolute top-0 z-20 h-full w-0.5"
            style={{
              left: playheadX,
              backgroundColor: '#ff4b4b',
            }}
          >
            {/* 播放头顶部三角标记 */}
            <div
              className="absolute -top-0 -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: '6px solid #ff4b4b',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/** 获取音符时值对应的拍数 */
function getNoteDurationBeats(duration: Note['duration']): number {
  const map: Record<Note['duration'], number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    sixteenth: 0.25,
    'thirty-second': 0.125,
  }
  return map[duration] ?? 1
}
