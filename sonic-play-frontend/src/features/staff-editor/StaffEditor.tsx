/**
 * Sonic Play - 五线谱编辑器主组件
 * 整合工具栏、五线谱画布和音符属性面板
 * 使用 VexFlow 的 SVG 渲染器在 Canvas 上绘制五线谱
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { useStaffEditor } from './useStaffEditor'
import StaffToolbar from './StaffToolbar'
import NoteProperties from './NoteProperties'

/** 五线谱画布容器 ID 前缀 */
const CANVAS_ID = 'staff-editor-canvas'

/**
 * 五线谱编辑器主组件
 */
export default function StaffEditor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 200 })

  // 从 store 获取数据
  const project = useProjectStore((s) => s.project)
  const selectedTrackId = useEditorStore((s) => s.selectedTrackId)
  const selectTrack = useEditorStore((s) => s.selectTrack)

  // 自动选中第一个音轨
  useEffect(() => {
    if (!selectedTrackId && project.tracks.length > 0) {
      selectTrack(project.tracks[0].id)
    }
  }, [selectedTrackId, project.tracks, selectTrack])

  // 使用编辑器 Hook
  const editor = useStaffEditor()

  /** 监听容器尺寸变化，调整画布大小 */
  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setCanvasSize({
        width: Math.max(800, rect.width),
        height: 200,
      })
    }
  }, [])

  /** 初始化和尺寸监听 */
  useEffect(() => {
    updateCanvasSize()

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [updateCanvasSize])

  /** 渲染五线谱 */
  useEffect(() => {
    const container = document.getElementById(CANVAS_ID)
    if (!container) return

    // 确保 VexFlow 容器存在
    if (!container.querySelector('svg') && !container.querySelector('canvas')) {
      container.innerHTML = ''
    }

    editor.renderStaff(CANVAS_ID, canvasSize.width, canvasSize.height)
  }, [
    editor,
    canvasSize.width,
    canvasSize.height,
    project.tracks,
    editor.selectedNoteIds,
    editor.playheadBeat,
  ])

  /** 处理键盘事件（全局） */
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 仅在编辑器聚焦时处理
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      // 转换为 React 键盘事件格式
      const syntheticEvent = {
        key: e.key,
        ctrlKey: e.ctrlKey || e.metaKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        preventDefault: () => e.preventDefault(),
      } as unknown as React.KeyboardEvent

      editor.handleKeyDown(syntheticEvent)
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [editor])

  /** 处理画布鼠标事件 */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      editor.handleMouseDown(e)
    },
    [editor]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      editor.handleMouseMove(e)
    },
    [editor]
  )

  const handleMouseUp = useCallback(() => {
    editor.handleMouseUp()
  }, [editor])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      editor.handleCanvasClick(e)
    },
    [editor]
  )

  return (
    <div className="flex h-full flex-col">
      {/* 工具栏 */}
      <StaffToolbar
        inputDuration={editor.inputDuration}
        inputAccidental={editor.inputAccidental}
        isPlaying={editor.isPlaying}
        snapToGrid={editor.snapToGrid}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onSetDuration={editor.setInputDuration}
        onSetAccidental={editor.setInputAccidental}
        onTogglePlay={editor.togglePlay}
        onStop={editor.stopPlayback}
        onUndo={editor.undo}
        onRedo={editor.redo}
        onToggleSnap={editor.toggleSnapToGrid}
      />

      {/* 主体区域：五线谱 + 属性面板 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 五线谱画布区域 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* 音轨选择栏 */}
          <div className="flex items-center gap-2 border-b border-gray-700 bg-gray-800/50 px-4 py-1.5">
            <span className="text-xs text-gray-400">音轨：</span>
            <div className="flex gap-1.5">
              {project.tracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => selectTrack(track.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-all active:scale-95 ${
                    track.id === selectedTrackId
                      ? 'text-white shadow-sm'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
                  }`}
                  style={
                    track.id === selectedTrackId
                      ? { backgroundColor: track.color }
                      : undefined
                  }
                >
                  {track.name}
                </button>
              ))}
            </div>
          </div>

          {/* 五线谱滚动区域 */}
          <div
            ref={containerRef}
            className="flex-1 overflow-x-auto overflow-y-hidden bg-gray-100"
          >
            {/* 五线谱画布 */}
            <div
              id={CANVAS_ID}
              className="min-h-full"
              style={{ minWidth: canvasSize.width }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleClick}
            />

            {/* 如果没有内容，显示提示 */}
            {project.tracks.every(
              (t) => t.measures.every((m) => m.notes.length === 0)
            ) && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    点击五线谱空白处添加音符
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    或使用键盘 A-G 快速输入
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右侧属性面板 */}
        <div className="w-64 shrink-0 overflow-y-auto border-l border-gray-700 bg-gray-800">
          <NoteProperties
            selectedNotes={editor.getSelectedNotes()}
            onUpdateNote={editor.updateNoteProperty}
          />
        </div>
      </div>
    </div>
  )
}
