/**
 * Sonic Play - 五线谱编辑器核心 Hook
 * 管理 VexFlow 渲染生命周期、鼠标/触摸事件、坐标映射、
 * 音符选中/多选、撤销/重做、键盘快捷键
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { StaffRenderer, type RenderResult } from './staffRenderer'
import type { Note, NoteDuration, Accidental } from '@/types'

/** 撤销/重做操作类型 */
interface EditorAction {
  /** 操作描述 */
  description: string
  /** 执行操作前的快照 */
  before: Note[]
  /** 执行操作后的快照 */
  after: Note[]
  /** 操作类型 */
  type: 'add' | 'remove' | 'update'
}

/** 拖拽状态 */
interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean
  /** 拖拽类型 */
  type: 'pitch' | 'duration' | null
  /** 起始 Y 坐标 */
  startY: number
  /** 起始 X 坐标 */
  startX: number
  /** 被拖拽的音符 */
  noteId: string | null
  /** 原始音高 */
  originalPitch: string
  /** 原始时值 */
  originalDuration: NoteDuration
}

/** Hook 返回值 */
interface UseStaffEditorReturn {
  /** 渲染器实例 */
  renderer: StaffRenderer
  /** 当前选中的音符 ID 列表 */
  selectedNoteIds: string[]
  /** 当前播放头位置（拍） */
  playheadBeat: number
  /** 是否正在播放 */
  isPlaying: boolean
  /** 当前输入的音符时值 */
  inputDuration: NoteDuration
  /** 当前输入的升降号 */
  inputAccidental: Accidental | null
  /** 是否启用网格吸附 */
  snapToGrid: boolean
  /** 撤销栈大小 */
  canUndo: boolean
  /** 重做栈大小 */
  canRedo: boolean
  /** 播放/暂停 */
  togglePlay: () => void
  /** 停止播放 */
  stopPlayback: () => void
  /** 设置输入时值 */
  setInputDuration: (duration: NoteDuration) => void
  /** 设置输入升降号 */
  setInputAccidental: (accidental: Accidental | null) => void
  /** 切换网格吸附 */
  toggleSnapToGrid: () => void
  /** 撤销 */
  undo: () => void
  /** 重做 */
  redo: () => void
  /** 处理画布点击 */
  handleCanvasClick: (e: React.MouseEvent<HTMLDivElement>) => void
  /** 处理鼠标按下 */
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
  /** 处理鼠标移动 */
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  /** 处理鼠标释放 */
  handleMouseUp: () => void
  /** 处理键盘事件 */
  handleKeyDown: (e: React.KeyboardEvent) => void
  /** 删除选中音符 */
  deleteSelectedNotes: () => void
  /** 更新音符属性 */
  updateNoteProperty: (noteId: string, updates: Partial<Note>) => void
  /** 获取选中音符的详细信息 */
  getSelectedNotes: () => Note[]
  /** 渲染五线谱 */
  renderStaff: (containerId: string, width: number, height: number) => RenderResult | null
}

/** 音符名称到音高的映射（用于键盘快捷键） */
const KEY_TO_PITCH: Record<string, string> = {
  a: 'C',
  b: 'D',
  c: 'E',
  d: 'F',
  e: 'G',
  f: 'A',
  g: 'B',
}

/** 时值列表（用于循环切换） */
const DURATIONS: NoteDuration[] = ['whole', 'half', 'quarter', 'eighth', 'sixteenth']

/**
 * 五线谱编辑器核心 Hook
 */
export function useStaffEditor(): UseStaffEditorReturn {
  const rendererRef = useRef<StaffRenderer>(new StaffRenderer())
  const renderResultRef = useRef<RenderResult | null>(null)
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    type: null,
    startY: 0,
    startX: 0,
    noteId: null,
    originalPitch: '',
    originalDuration: 'quarter',
  })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playIntervalRef = useRef<number | null>(null)

  // 从 store 获取状态
  const project = useProjectStore((s) => s.project)
  const playbackState = useProjectStore((s) => s.playbackState)
  const currentMeasure = useProjectStore((s) => s.currentMeasure)
  const currentBeat = useProjectStore((s) => s.currentBeat)
  const setPlaybackState = useProjectStore((s) => s.setPlaybackState)
  const setCurrentPosition = useProjectStore((s) => s.setCurrentPosition)
  const addNote = useProjectStore((s) => s.addNote)
  const removeNote = useProjectStore((s) => s.removeNote)
  const updateNote = useProjectStore((s) => s.updateNote)

  const selectedTrackId = useEditorStore((s) => s.selectedTrackId)
  const selectNote = useEditorStore((s) => s.selectNote)
  const inputDurationFromStore = useEditorStore((s) => s.inputDuration)
  const setInputDurationFromStore = useEditorStore((s) => s.setInputDuration)

  // 本地状态
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [inputDuration, setInputDurationState] = useState<NoteDuration>('quarter')
  const [inputAccidental, setInputAccidental] = useState<Accidental | null>(null)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [undoStack, setUndoStack] = useState<EditorAction[]>([])
  const [redoStack, setRedoStack] = useState<EditorAction[]>([])
  const [playheadBeat, setPlayheadBeat] = useState(-1)

  // 获取当前选中的音轨
  const currentTrack = project.tracks.find((t) => t.id === selectedTrackId) || project.tracks[0]

  /** 同步 store 的时值到本地状态 */
  useEffect(() => {
    setInputDurationState(inputDurationFromStore)
  }, [inputDurationFromStore])

  /** 计算播放头位置（拍） */
  useEffect(() => {
    if (playbackState === 'playing') {
      const beatsPerMeasure = project.timeSignatureNumerator
      setPlayheadBeat(currentMeasure * beatsPerMeasure + currentBeat)
    } else if (playbackState === 'stopped') {
      setPlayheadBeat(-1)
    }
  }, [playbackState, currentMeasure, currentBeat, project.timeSignatureNumerator])

  /** 播放定时器 */
  useEffect(() => {
    if (playbackState === 'playing') {
      const bpm = project.tempo
      const beatDuration = 60000 / bpm // 每拍毫秒数

      playIntervalRef.current = window.setInterval(() => {
        const beatsPerMeasure = project.timeSignatureNumerator
        const totalBeats = project.totalMeasures * beatsPerMeasure

        setPlayheadBeat((prev) => {
          const next = (prev + 0.1) % totalBeats
          const measure = Math.floor(next / beatsPerMeasure)
          const beat = next % beatsPerMeasure
          setCurrentPosition(measure, beat)
          return next
        })
      }, beatDuration / 4) // 每 1/4 拍更新一次
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
        playIntervalRef.current = null
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current)
      }
    }
  }, [playbackState, project.tempo, project.timeSignatureNumerator, project.totalMeasures, setCurrentPosition])

  /** 将操作记录到撤销栈 */
  const pushUndo = useCallback(
    (action: EditorAction) => {
      setUndoStack((prev) => [...prev.slice(-49), action])
      setRedoStack([]) // 新操作清空重做栈
    },
    []
  )

  /** 获取指定小节的所有音符 */
  const getMeasureNotes = useCallback(
    (measureIndex: number): Note[] => {
      if (!currentTrack) return []
      const measure = currentTrack.measures[measureIndex]
      return measure?.notes || []
    },
    [currentTrack]
  )

  /** 根据屏幕坐标查找点击的音符 */
  const findNoteAtPosition = useCallback(
    (clientX: number, clientY: number): { noteId: string; measureIndex: number } | null => {
      const result = renderResultRef.current
      if (!result || !containerRef.current) return null

      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      // 遍历所有音符位置，找到命中的
      for (const pos of result.notePositions) {
        const hitPadding = 8
        if (
          x >= pos.x - hitPadding &&
          x <= pos.x + pos.width + hitPadding &&
          y >= pos.y - pos.height / 2 - hitPadding &&
          y <= pos.y + pos.height / 2 + hitPadding
        ) {
          return { noteId: pos.noteId, measureIndex: pos.measureIndex }
        }
      }

      return null
    },
    []
  )

  /** 根据屏幕坐标确定所在的小节和拍位置 */
  const getMeasureAndBeatFromPosition = useCallback(
    (clientX: number): { measureIndex: number; beat: number } | null => {
      const result = renderResultRef.current
      if (!result || !containerRef.current) return null

      const rect = containerRef.current.getBoundingClientRect()
      const x = clientX - rect.left

      for (const bound of result.measureBounds) {
        if (x >= bound.x && x < bound.x + bound.width) {
          const fraction = (x - bound.x) / bound.width
          const beatsPerMeasure = project.timeSignatureNumerator
          const beat = snapToGrid
            ? Math.round(fraction * beatsPerMeasure)
            : fraction * beatsPerMeasure
          return { measureIndex: bound.index, beat: Math.min(beat, beatsPerMeasure - 0.25) }
        }
      }

      return null
    },
    [project.timeSignatureNumerator, snapToGrid]
  )

  /** 根据屏幕 Y 坐标确定音高 */
  const getPitchFromY = useCallback(
    (clientY: number): string => {
      const result = renderResultRef.current
      if (!result || !containerRef.current) return 'C4'

      const rect = containerRef.current.getBoundingClientRect()
      const y = clientY - rect.top
      const staveY = 60
      const staveSpacing = 10

      // 计算线号（从 Y 坐标反推）
      const line = (staveY + 2 * staveSpacing - y) / (staveSpacing / 2)

      // 使用渲染器的转换方法
      const renderer = rendererRef.current
      // 默认使用高音谱号
      const pitch = renderer.lineToPitch(Math.round(line * 2) / 2, 'treble')
      return pitch
    },
    []
  )

  /** 添加音符 */
  const addNoteAtPosition = useCallback(
    (measureIndex: number, beat: number, pitch: string) => {
      if (!currentTrack) return

      const measure = currentTrack.measures[measureIndex]
      if (!measure) return

      // 保存操作前快照
      const beforeNotes = [...measure.notes]

      const newNote: Omit<Note, 'id'> = {
        pitch,
        duration: inputDuration,
        velocity: 80,
        startBeat: beat,
        isRest: false,
        accidental: inputAccidental || undefined,
      }

      addNote(currentTrack.id, measure.id, newNote)

      // 保存操作后快照
      const afterNotes = [...measure.notes, { ...newNote, id: '' }]

      pushUndo({
        description: `添加音符 ${pitch}`,
        before: beforeNotes,
        after: afterNotes,
        type: 'add',
      })
    },
    [currentTrack, inputDuration, inputAccidental, addNote, pushUndo]
  )

  /** 处理画布点击 */
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 如果正在拖拽，不处理点击
      if (dragStateRef.current.isDragging) return

      const hit = findNoteAtPosition(e.clientX, e.clientY)

      if (hit) {
        // 点击了已有音符，选中它
        if (e.shiftKey) {
          // Shift 多选
          setSelectedNoteIds((prev) =>
            prev.includes(hit.noteId)
              ? prev.filter((id) => id !== hit.noteId)
              : [...prev, hit.noteId]
          )
        } else {
          setSelectedNoteIds([hit.noteId])
        }
        selectNote(hit.noteId)
      } else {
        // 点击空白处，添加新音符
        const pos = getMeasureAndBeatFromPosition(e.clientX)
        if (pos) {
          const pitch = getPitchFromY(e.clientY)
          addNoteAtPosition(pos.measureIndex, pos.beat, pitch)
          setSelectedNoteIds([])
          selectNote(null)
        }
      }
    },
    [findNoteAtPosition, getMeasureAndBeatFromPosition, getPitchFromY, addNoteAtPosition, selectNote]
  )

  /** 处理鼠标按下 */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const hit = findNoteAtPosition(e.clientX, e.clientY)

      if (hit) {
        // 选中被点击的音符
        if (!e.shiftKey) {
          setSelectedNoteIds([hit.noteId])
          selectNote(hit.noteId)
        }

        // 查找音符数据
        const notes = getMeasureNotes(hit.measureIndex)
        const note = notes.find((n) => n.id === hit.noteId)

        if (note) {
          // 判断拖拽方向
          const result = renderResultRef.current
          if (result && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const notePos = result.notePositions.find((p) => p.noteId === hit.noteId)

            if (notePos) {
              const isOnRightEdge = x > notePos.x + notePos.width * 0.7
              dragStateRef.current = {
                isDragging: false, // 等移动一定距离后才算拖拽
                type: isOnRightEdge ? 'duration' : 'pitch',
                startY: e.clientY,
                startX: e.clientX,
                noteId: hit.noteId,
                originalPitch: note.pitch,
                originalDuration: note.duration,
              }
            }
          }
        }
      }
    },
    [findNoteAtPosition, getMeasureNotes, selectNote]
  )

  /** 处理鼠标移动 */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const drag = dragStateRef.current
      if (!drag.noteId) return

      const dx = Math.abs(e.clientX - drag.startX)
      const dy = Math.abs(e.clientY - drag.startY)

      // 移动超过 3px 才算拖拽
      if (!drag.isDragging && (dx > 3 || dy > 3)) {
        drag.isDragging = true
      }

      if (!drag.isDragging) return

      // 查找音符所在的小节
      if (!currentTrack) return
      let targetNote: Note | null = null
      let targetMeasureId = ''

      for (const measure of currentTrack.measures) {
        const found = measure.notes.find((n) => n.id === drag.noteId)
        if (found) {
          targetNote = found
          targetMeasureId = measure.id
          break
        }
      }

      if (!targetNote) return

      if (drag.type === 'pitch') {
        // 拖拽改变音高
        const pitch = getPitchFromY(e.clientY)
        updateNote(currentTrack.id, targetMeasureId, drag.noteId, { pitch })
      } else if (drag.type === 'duration') {
        // 拖拽改变时值
        const result = renderResultRef.current
        if (result && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left
          const notePos = result.notePositions.find((p) => p.noteId === drag.noteId)

          if (notePos) {
            const dxFromStart = x - notePos.x
            // 根据拖拽距离决定时值
            let newDuration: NoteDuration = 'quarter'
            if (dxFromStart > 60) newDuration = 'whole'
            else if (dxFromStart > 40) newDuration = 'half'
            else if (dxFromStart > 20) newDuration = 'quarter'
            else if (dxFromStart > 10) newDuration = 'eighth'
            else newDuration = 'sixteenth'

            updateNote(currentTrack.id, targetMeasureId, drag.noteId, { duration: newDuration })
          }
        }
      }
    },
    [currentTrack, getPitchFromY, updateNote]
  )

  /** 处理鼠标释放 */
  const handleMouseUp = useCallback(() => {
    const drag = dragStateRef.current
    if (drag.isDragging && drag.noteId && currentTrack) {
      // 拖拽结束，记录撤销操作
      for (const measure of currentTrack.measures) {
        const found = measure.notes.find((n) => n.id === drag.noteId)
        if (found) {
          if (found.pitch !== drag.originalPitch || found.duration !== drag.originalDuration) {
            pushUndo({
              description: `修改音符 ${drag.originalPitch} -> ${found.pitch}`,
              before: [{ ...found, pitch: drag.originalPitch, duration: drag.originalDuration } as Note],
              after: [found],
              type: 'update',
            })
          }
          break
        }
      }
    }

    // 重置拖拽状态
    dragStateRef.current = {
      isDragging: false,
      type: null,
      startY: 0,
      startX: 0,
      noteId: null,
      originalPitch: '',
      originalDuration: 'quarter',
    }
  }, [currentTrack, pushUndo])

  /** 删除选中音符 */
  const deleteSelectedNotes = useCallback(() => {
    if (selectedNoteIds.length === 0 || !currentTrack) return

    for (const noteId of selectedNoteIds) {
      for (const measure of currentTrack.measures) {
        const noteIndex = measure.notes.findIndex((n) => n.id === noteId)
        if (noteIndex !== -1) {
          const beforeNotes = [...measure.notes]
          removeNote(currentTrack.id, measure.id, noteId)
          pushUndo({
            description: `删除音符`,
            before: beforeNotes,
            after: measure.notes.filter((n) => n.id !== noteId),
            type: 'remove',
          })
          break
        }
      }
    }

    setSelectedNoteIds([])
    selectNote(null)
  }, [selectedNoteIds, currentTrack, removeNote, pushUndo, selectNote])

  /** 更新音符属性 */
  const updateNoteProperty = useCallback(
    (noteId: string, updates: Partial<Note>) => {
      if (!currentTrack) return

      for (const measure of currentTrack.measures) {
        const note = measure.notes.find((n) => n.id === noteId)
        if (note) {
          const beforeNotes = [...measure.notes]
          updateNote(currentTrack.id, measure.id, noteId, updates)
          pushUndo({
            description: `更新音符属性`,
            before: beforeNotes,
            after: measure.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
            type: 'update',
          })
          break
        }
      }
    },
    [currentTrack, updateNote, pushUndo]
  )

  /** 获取选中音符 */
  const getSelectedNotes = useCallback((): Note[] => {
    if (!currentTrack || selectedNoteIds.length === 0) return []

    const result: Note[] = []
    for (const noteId of selectedNoteIds) {
      for (const measure of currentTrack.measures) {
        const note = measure.notes.find((n) => n.id === noteId)
        if (note) {
          result.push(note)
          break
        }
      }
    }
    return result
  }, [currentTrack, selectedNoteIds])

  /** 撤销 */
  const undo = useCallback(() => {
    if (undoStack.length === 0 || !currentTrack) return

    const action = undoStack[undoStack.length - 1]
    // 简化的撤销实现：在实际应用中需要更完善的快照机制
    setUndoStack((prev) => prev.slice(0, -1))
    setRedoStack((prev) => [...prev, action])
    console.log('[编辑器] 撤销:', action.description)
  }, [undoStack, currentTrack])

  /** 重做 */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return

    const action = redoStack[redoStack.length - 1]
    setRedoStack((prev) => prev.slice(0, -1))
    setUndoStack((prev) => [...prev, action])
    console.log('[编辑器] 重做:', action.description)
  }, [redoStack])

  /** 播放/暂停 */
  const togglePlay = useCallback(() => {
    if (playbackState === 'playing') {
      setPlaybackState('paused')
    } else {
      setPlaybackState('playing')
    }
  }, [playbackState, setPlaybackState])

  /** 停止播放 */
  const stopPlayback = useCallback(() => {
    setPlaybackState('stopped')
    setCurrentPosition(0, 0)
    setPlayheadBeat(-1)
  }, [setPlaybackState, setCurrentPosition])

  /** 设置输入时值 */
  const setInputDuration = useCallback(
    (duration: NoteDuration) => {
      setInputDurationState(duration)
      // store 的 inputDuration 不支持 thirty-second，做安全转换
      const safeDuration = duration === 'thirty-second' ? 'sixteenth' : duration
      setInputDurationFromStore(safeDuration)
    },
    [setInputDurationFromStore]
  )

  /** 设置输入升降号 */
  const handleSetInputAccidental = useCallback((accidental: Accidental | null) => {
    setInputAccidental(accidental)
  }, [])

  /** 切换网格吸附 */
  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid((prev) => !prev)
  }, [])

  /** 处理键盘事件 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      // Ctrl+Shift+Z 或 Ctrl+Y 重做
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault()
        redo()
        return
      }

      // Delete / Backspace 删除选中音符
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelectedNotes()
        return
      }

      // 空格 播放/暂停
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
        return
      }

      // A-G 键快速输入音符
      const key = e.key.toLowerCase()
      if (KEY_TO_PITCH[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        const pitchName = KEY_TO_PITCH[key]
        // 使用当前播放头位置或第一个小节
        const measureIndex = currentMeasure
        const beat = currentBeat
        const pitch = `${pitchName}4` // 默认第四八度

        if (currentTrack) {
          const measure = currentTrack.measures[measureIndex]
          if (measure) {
            const beforeNotes = [...measure.notes]
            addNote(currentTrack.id, measure.id, {
              pitch,
              duration: inputDuration,
              velocity: 80,
              startBeat: beat,
              isRest: false,
              accidental: inputAccidental || undefined,
            })

            pushUndo({
              description: `键盘输入音符 ${pitch}`,
              before: beforeNotes,
              after: [...measure.notes],
              type: 'add',
            })

            // 移动播放头
            const beatsPerMeasure = project.timeSignatureNumerator
            const nextBeat = beat + (inputDuration === 'whole' ? 4 : inputDuration === 'half' ? 2 : inputDuration === 'quarter' ? 1 : inputDuration === 'eighth' ? 0.5 : 0.25)
            if (nextBeat >= beatsPerMeasure) {
              setCurrentPosition(Math.min(measureIndex + 1, project.totalMeasures - 1), 0)
            } else {
              setCurrentPosition(measureIndex, nextBeat)
            }
          }
        }
        return
      }

      // 上下箭头移动选中音符音高
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const notes = getSelectedNotes()
        if (notes.length > 0) {
          const direction = e.key === 'ArrowUp' ? 1 : -1
          for (const note of notes) {
            const renderer = rendererRef.current
            const midi = renderer.pitchToMidi(note.pitch)
            const newMidi = Math.max(21, Math.min(108, midi + direction))
            const newPitch = renderer.midiToPitch(newMidi)
            updateNoteProperty(note.id, { pitch: newPitch })
          }
        }
        return
      }

      // 左右箭头移动选中音符时值
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const notes = getSelectedNotes()
        if (notes.length > 0) {
          const direction = e.key === 'ArrowRight' ? 1 : -1
          for (const note of notes) {
            const currentIdx = DURATIONS.indexOf(note.duration)
            const newIdx = Math.max(0, Math.min(DURATIONS.length - 1, currentIdx + direction))
            updateNoteProperty(note.id, { duration: DURATIONS[newIdx] })
          }
        }
        return
      }
    },
    [
      undo,
      redo,
      deleteSelectedNotes,
      togglePlay,
      currentMeasure,
      currentBeat,
      currentTrack,
      inputDuration,
      inputAccidental,
      project.timeSignatureNumerator,
      project.totalMeasures,
      addNote,
      pushUndo,
      setCurrentPosition,
      getSelectedNotes,
      updateNoteProperty,
    ]
  )

  /** 渲染五线谱 */
  const renderStaff = useCallback(
    (containerId: string, width: number, height: number): RenderResult | null => {
      const renderer = rendererRef.current
      const measures = currentTrack?.measures || []

      renderer.init({
        elementId: containerId,
        width,
        height,
        measureWidth: 280,
        clef: 'treble',
        startMeasure: 0,
        endMeasure: Math.min(measures.length - 1, 15),
        numerator: project.timeSignatureNumerator,
        denominator: project.timeSignatureDenominator,
        keySignature: 0,
      })

      const result = renderer.render(measures, selectedNoteIds, playheadBeat)
      renderResultRef.current = result
      return result
    },
    [currentTrack, project.timeSignatureNumerator, project.timeSignatureDenominator, selectedNoteIds, playheadBeat]
  )

  return {
    renderer: rendererRef.current,
    selectedNoteIds,
    playheadBeat,
    isPlaying: playbackState === 'playing',
    inputDuration,
    inputAccidental,
    snapToGrid,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    togglePlay,
    stopPlayback,
    setInputDuration,
    setInputAccidental: handleSetInputAccidental,
    toggleSnapToGrid,
    undo,
    redo,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleKeyDown,
    deleteSelectedNotes,
    updateNoteProperty,
    getSelectedNotes,
    renderStaff,
  }
}
