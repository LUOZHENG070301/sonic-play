/**
 * Sonic Play - 音轨编辑器主组件
 * 左侧音轨列表（固定宽度 280px）+ 右侧时间轴（flex-1）
 * 左右同步垂直滚动，顶部时间标尺，底部传输控制栏
 * 深色 DAW 风格主题
 */
import { useRef, useCallback, useEffect } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { useTrackPlayback } from './useTrackPlayback'
import TrackItem from './TrackItem'
import TrackTimeline from './TrackTimeline'
import TransportBar from './TransportBar'

/** 左侧音轨列表固定宽度 */
const TRACK_LIST_WIDTH = 280

/** 每个音轨行的高度（像素），与 TrackTimeline 保持一致 */
const TRACK_ROW_HEIGHT = 80

/** 顶部时间标尺占位高度（像素），与 TrackTimeline 保持一致 */
const RULER_HEIGHT = 28

/** 音轨编辑器主组件 */
export default function TrackEditor() {
  const { project } = useProjectStore()
  const { scrollY, setScrollPosition } = useEditorStore()

  // 使用音轨播放 Hook
  const playback = useTrackPlayback()

  // 左侧音轨列表滚动容器引用
  const trackListScrollRef = useRef<HTMLDivElement>(null)

  /** 处理左侧列表垂直滚动，同步到右侧时间轴 */
  const handleTrackListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = e.currentTarget.scrollTop
      setScrollPosition(0, scrollTop)
    },
    [setScrollPosition]
  )

  /** 同步外部 scrollY 到左侧列表 */
  useEffect(() => {
    if (trackListScrollRef.current) {
      trackListScrollRef.current.scrollTop = scrollY
    }
  }, [scrollY])

  return (
    <div className="flex h-full flex-col">
      {/* 顶部时间标尺占位区域（与左侧音轨列表对齐） */}
      <div className="flex shrink-0">
        {/* 左侧标题栏 */}
        <div
          className="shrink-0 border-b border-gray-700/50 bg-[#0f0f23]"
          style={{ width: TRACK_LIST_WIDTH, height: RULER_HEIGHT }}
        >
          <div className="flex h-full items-center px-3">
            <span className="text-xs font-medium text-gray-400">音轨</span>
            <span className="ml-auto text-[10px] text-gray-600">
              {project.tracks.length} 个音轨
            </span>
          </div>
        </div>
        {/* 右侧时间标尺由 TrackTimeline 内部渲染 */}
      </div>

      {/* 中间主区域：左侧音轨列表 + 右侧时间轴 */}
      <div className="flex min-h-0 flex-1">
        {/* 左侧音轨列表 */}
        <div
          className="shrink-0 overflow-hidden border-r border-gray-700/50 bg-[#1a1a2e]"
          style={{ width: TRACK_LIST_WIDTH }}
        >
          <div
            ref={trackListScrollRef}
            className="h-full overflow-y-auto overflow-x-hidden"
            onScroll={handleTrackListScroll}
            style={{ scrollbarWidth: 'none' }}
          >
            {project.tracks.map((track) => (
              <TrackItem
                key={track.id}
                track={track}
                height={TRACK_ROW_HEIGHT}
              />
            ))}
          </div>
        </div>

        {/* 右侧时间轴 */}
        <TrackTimeline
          currentPosition={playback.currentPosition}
        />
      </div>

      {/* 底部传输控制栏 */}
      <TransportBar playback={playback} />
    </div>
  )
}
