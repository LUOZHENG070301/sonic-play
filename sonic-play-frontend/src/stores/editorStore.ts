/**
 * Sonic Play - 编辑器状态管理
 * 管理编辑器的 UI 状态、工具选择、选区等
 */
import { create } from 'zustand'
import type { EditorTool, EditorMode, Selection } from '@/types'

/** 编辑器视图类型 */
export type EditorView = 'staff' | 'piano-roll' | 'waveform'

/** 编辑器 Store 状态接口 */
interface EditorState {
  /** 当前编辑工具 */
  activeTool: EditorTool
  /** 当前编辑模式 */
  editorMode: EditorMode
  /** 当前编辑器视图 */
  activeView: EditorView
  /** 当前选中的音轨 ID */
  selectedTrackId: string | null
  /** 当前选中的音符 ID */
  selectedNoteId: string | null
  /** 当前选区 */
  selection: Selection | null
  /** 是否显示网格 */
  showGrid: boolean
  /** 是否显示播放头 */
  showPlayhead: boolean
  /** 缩放级别 (0.25 - 4) */
  zoomLevel: number
  /** 水平滚动位置 */
  scrollX: number
  /** 垂直滚动位置 */
  scrollY: number
  /** 是否显示 AI 面板 */
  isAIPanelOpen: boolean
  /** 是否显示录音面板 */
  isRecordingPanelOpen: boolean
  /** 当前输入的音符时值 */
  inputDuration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth'

  // === 操作方法 ===
  /** 设置编辑工具 */
  setActiveTool: (tool: EditorTool) => void
  /** 设置编辑模式 */
  setEditorMode: (mode: EditorMode) => void
  /** 设置编辑器视图 */
  setActiveView: (view: EditorView) => void
  /** 选中音轨 */
  selectTrack: (trackId: string | null) => void
  /** 选中音符 */
  selectNote: (noteId: string | null) => void
  /** 设置选区 */
  setSelection: (selection: Selection | null) => void
  /** 切换网格显示 */
  toggleGrid: () => void
  /** 切换播放头显示 */
  togglePlayhead: () => void
  /** 设置缩放级别 */
  setZoomLevel: (level: number) => void
  /** 放大 */
  zoomIn: () => void
  /** 缩小 */
  zoomOut: () => void
  /** 设置滚动位置 */
  setScrollPosition: (x: number, y: number) => void
  /** 切换 AI 面板 */
  toggleAIPanel: () => void
  /** 切换录音面板 */
  toggleRecordingPanel: () => void
  /** 设置输入音符时值 */
  setInputDuration: (duration: EditorState['inputDuration']) => void
}

/** 编辑器状态管理 Store */
export const useEditorStore = create<EditorState>((set) => ({
  // 初始状态
  activeTool: 'select',
  editorMode: 'select',
  activeView: 'staff',
  selectedTrackId: null,
  selectedNoteId: null,
  selection: null,
  showGrid: true,
  showPlayhead: true,
  zoomLevel: 1,
  scrollX: 0,
  scrollY: 0,
  isAIPanelOpen: false,
  isRecordingPanelOpen: false,
  inputDuration: 'quarter',

  // === 操作方法 ===
  setActiveTool: (activeTool) => set({ activeTool }),

  setEditorMode: (editorMode) => set({ editorMode }),

  setActiveView: (activeView) => set({ activeView }),

  selectTrack: (selectedTrackId) => set({ selectedTrackId }),

  selectNote: (selectedNoteId) => set({ selectedNoteId }),

  setSelection: (selection) => set({ selection }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  togglePlayhead: () => set((state) => ({ showPlayhead: !state.showPlayhead })),

  setZoomLevel: (zoomLevel) =>
    set({ zoomLevel: Math.max(0.25, Math.min(4, zoomLevel)) }),

  zoomIn: () =>
    set((state) => ({
      zoomLevel: Math.min(4, state.zoomLevel * 1.25),
    })),

  zoomOut: () =>
    set((state) => ({
      zoomLevel: Math.max(0.25, state.zoomLevel / 1.25),
    })),

  setScrollPosition: (scrollX, scrollY) => set({ scrollX, scrollY }),

  toggleAIPanel: () =>
    set((state) => ({ isAIPanelOpen: !state.isAIPanelOpen })),

  toggleRecordingPanel: () =>
    set((state) => ({ isRecordingPanelOpen: !state.isRecordingPanelOpen })),

  setInputDuration: (inputDuration) => set({ inputDuration }),
}))
