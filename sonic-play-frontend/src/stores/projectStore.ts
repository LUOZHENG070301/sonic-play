/**
 * Sonic Play - 项目状态管理
 * 使用 Zustand 管理全局项目状态，集成 Supabase 数据同步
 */
import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Project, Track, Measure, Note, PlaybackState } from '@/types'
import type { ProjectRow, TrackRow, MeasureRow, NoteRow } from '@/lib/supabase-types'

/** 同步状态类型 */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

/** 项目 Store 状态接口 */
interface ProjectState {
  /** 当前项目 */
  project: Project
  /** 当前播放状态 */
  playbackState: PlaybackState
  /** 当前播放位置（小节索引） */
  currentMeasure: number
  /** 当前播放位置（拍） */
  currentBeat: number
  /** 同步状态 */
  syncStatus: SyncStatus
  /** 同步错误信息 */
  syncError: string | null
  /** 是否正在加载项目 */
  isLoading: boolean
  /** 用户项目列表 */
  userProjects: Project[]

  // === 项目操作 ===
  /** 创建新项目 */
  createProject: (name: string) => void
  /** 更新项目名称 */
  updateProjectName: (name: string) => void
  /** 更新项目速度 */
  updateTempo: (tempo: number) => void
  /** 更新拍号 */
  updateTimeSignature: (numerator: number, denominator: number) => void
  /** 增加小节数 */
  addMeasures: (count: number) => void
  /** 删除末尾小节 */
  removeMeasure: () => void

  // === 音轨操作 ===
  /** 添加音轨 */
  addTrack: (name: string, instrument: Track['instrument']) => void
  /** 删除音轨 */
  removeTrack: (trackId: string) => void
  /** 更新音轨 */
  updateTrack: (trackId: string, updates: Partial<Track>) => void
  /** 切换音轨静音 */
  toggleMute: (trackId: string) => void
  /** 切换音轨独奏 */
  toggleSolo: (trackId: string) => void

  // === 音符操作 ===
  /** 添加音符 */
  addNote: (trackId: string, measureId: string, note: Omit<Note, 'id'>) => void
  /** 删除音符 */
  removeNote: (trackId: string, measureId: string, noteId: string) => void
  /** 更新音符 */
  updateNote: (trackId: string, measureId: string, noteId: string, updates: Partial<Note>) => void

  // === 播放控制 ===
  /** 设置播放状态 */
  setPlaybackState: (state: PlaybackState) => void
  /** 设置当前播放位置 */
  setCurrentPosition: (measure: number, beat: number) => void

  // === Supabase 同步操作 ===
  /** 从 Supabase 加载项目 */
  loadProjectFromSupabase: (projectId: string) => Promise<void>
  /** 保存项目到 Supabase */
  saveProjectToSupabase: () => Promise<void>
  /** 加载用户项目列表 */
  loadUserProjects: () => Promise<void>
  /** 删除项目 */
  deleteProject: (projectId: string) => Promise<void>
  /** 设置当前项目 */
  setProject: (project: Project) => void
}

/** 创建默认小节 */
const createDefaultMeasure = (index: number): Measure => ({
  id: uuidv4(),
  index,
  numerator: 4,
  denominator: 4,
  keySignature: 0,
  notes: [],
})

/** 创建默认项目 */
const createDefaultProject = (name: string): Project => ({
  id: uuidv4(),
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  tempo: 120,
  timeSignatureNumerator: 4,
  timeSignatureDenominator: 4,
  totalMeasures: 16,
  tracks: [
    {
      id: uuidv4(),
      name: '钢琴',
      instrument: 'piano',
      programNumber: 0,
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSolo: false,
      measures: Array.from({ length: 16 }, (_, i) => createDefaultMeasure(i)),
      color: '#6366f1',
      isLocked: false,
    },
  ],
  status: 'draft',
})

/** 预定义音轨颜色 */
const TRACK_COLORS = [
  '#6366f1', // 靛蓝
  '#f43f5e', // 玫红
  '#10b981', // 翠绿
  '#f59e0b', // 琥珀
  '#8b5cf6', // 紫罗兰
  '#06b6d4', // 青色
  '#ec4899', // 粉红
  '#84cc16', // 青柠
]

/**
 * 将应用项目转换为 Supabase 项目行
 */
function projectToRow(project: Project, userId: string): Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: userId,
    name: project.name,
    description: project.description || null,
    tempo: project.tempo,
    time_signature_numerator: project.timeSignatureNumerator,
    time_signature_denominator: project.timeSignatureDenominator,
    total_measures: project.totalMeasures,
    status: project.status,
  }
}

/**
 * 将 Supabase 项目行转换为应用项目
 */
function rowToProject(row: ProjectRow, tracks: Track[] = []): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tempo: row.tempo,
    timeSignatureNumerator: row.time_signature_numerator,
    timeSignatureDenominator: row.time_signature_denominator,
    totalMeasures: row.total_measures,
    tracks: tracks.length > 0 ? tracks : [],
    status: row.status,
  }
}

/**
 * 将应用音轨转换为 Supabase 音轨行
 */
function trackToRow(track: Track, projectId: string, sortIndex: number): Omit<TrackRow, 'id' | 'created_at' | 'updated_at'> {
  return {
    project_id: projectId,
    name: track.name,
    instrument: track.instrument,
    program_number: track.programNumber,
    volume: track.volume,
    pan: track.pan,
    is_muted: track.isMuted,
    is_solo: track.isSolo,
    color: track.color,
    is_locked: track.isLocked,
    sort_index: sortIndex,
  }
}

/**
 * 将 Supabase 音轨行转换为应用音轨
 */
function rowToTrack(row: TrackRow, measures: Measure[] = []): Track {
  return {
    id: row.id,
    name: row.name,
    instrument: row.instrument as Track['instrument'],
    programNumber: row.program_number,
    volume: row.volume,
    pan: row.pan,
    isMuted: row.is_muted,
    isSolo: row.is_solo,
    measures: measures.length > 0 ? measures : [],
    color: row.color,
    isLocked: row.is_locked,
  }
}

/**
 * 将应用小节转换为 Supabase 小节行
 */
function measureToRow(measure: Measure, trackId: string): Omit<MeasureRow, 'id' | 'created_at'> {
  return {
    track_id: trackId,
    index: measure.index,
    numerator: measure.numerator,
    denominator: measure.denominator,
    key_signature: measure.keySignature,
    tempo: measure.tempo || null,
  }
}

/**
 * 将 Supabase 小节行转换为应用小节
 */
function rowToMeasure(row: MeasureRow, notes: Note[] = []): Measure {
  return {
    id: row.id,
    index: row.index,
    numerator: row.numerator,
    denominator: row.denominator,
    keySignature: row.key_signature,
    notes,
    tempo: row.tempo || undefined,
  }
}

/**
 * 将应用音符转换为 Supabase 音符行
 */
function noteToRow(note: Note, measureId: string): Omit<NoteRow, 'id' | 'created_at'> {
  return {
    measure_id: measureId,
    pitch: note.pitch,
    duration: note.duration,
    velocity: note.velocity,
    start_beat: note.startBeat,
    is_rest: note.isRest,
    accidental: note.accidental || null,
    vibrato: note.vibrato || false,
    tied_to: note.tiedTo || null,
  }
}

/**
 * 将 Supabase 音符行转换为应用音符
 */
function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    pitch: row.pitch,
    duration: row.duration as Note['duration'],
    velocity: row.velocity,
    startBeat: row.start_beat,
    isRest: row.is_rest,
    accidental: (row.accidental as Note['accidental']) || undefined,
    vibrato: row.vibrato,
    tiedTo: row.tied_to || undefined,
  }
}

/** 项目状态管理 Store */
export const useProjectStore = create<ProjectState>((set, get) => ({
  // 初始状态：创建一个默认项目
  project: createDefaultProject('未命名项目'),
  playbackState: 'stopped',
  currentMeasure: 0,
  currentBeat: 0,
  syncStatus: 'idle',
  syncError: null,
  isLoading: false,
  userProjects: [],

  // === 项目操作 ===
  createProject: (name) =>
    set({
      project: createDefaultProject(name),
      playbackState: 'stopped',
      currentMeasure: 0,
      currentBeat: 0,
      syncStatus: 'idle',
    }),

  updateProjectName: (name) =>
    set((state) => ({
      project: {
        ...state.project,
        name,
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  updateTempo: (tempo) =>
    set((state) => ({
      project: {
        ...state.project,
        tempo: Math.max(20, Math.min(300, tempo)),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  updateTimeSignature: (numerator, denominator) =>
    set((state) => ({
      project: {
        ...state.project,
        timeSignatureNumerator: numerator,
        timeSignatureDenominator: denominator,
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  addMeasures: (count) =>
    set((state) => {
      const startIndex = state.project.totalMeasures
      const newMeasures = Array.from({ length: count }, (_, i) =>
        createDefaultMeasure(startIndex + i)
      )
      const updatedTracks = state.project.tracks.map((track) => ({
        ...track,
        measures: [...track.measures, ...newMeasures],
      }))
      return {
        project: {
          ...state.project,
          totalMeasures: startIndex + count,
          tracks: updatedTracks,
          updatedAt: new Date().toISOString(),
        },
        syncStatus: 'idle',
      }
    }),

  removeMeasure: () =>
    set((state) => {
      if (state.project.totalMeasures <= 1) return state
      const newTotal = state.project.totalMeasures - 1
      const updatedTracks = state.project.tracks.map((track) => ({
        ...track,
        measures: track.measures.slice(0, newTotal),
      }))
      return {
        project: {
          ...state.project,
          totalMeasures: newTotal,
          tracks: updatedTracks,
          updatedAt: new Date().toISOString(),
        },
        syncStatus: 'idle',
      }
    }),

  // === 音轨操作 ===
  addTrack: (name, instrument) =>
    set((state) => {
      const colorIndex = state.project.tracks.length % TRACK_COLORS.length
      const newTrack: Track = {
        id: uuidv4(),
        name,
        instrument,
        programNumber: 0,
        volume: 0.8,
        pan: 0,
        isMuted: false,
        isSolo: false,
        measures: Array.from({ length: state.project.totalMeasures }, (_, i) =>
          createDefaultMeasure(i)
        ),
        color: TRACK_COLORS[colorIndex],
        isLocked: false,
      }
      return {
        project: {
          ...state.project,
          tracks: [...state.project.tracks, newTrack],
          updatedAt: new Date().toISOString(),
        },
        syncStatus: 'idle',
      }
    }),

  removeTrack: (trackId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.filter((t) => t.id !== trackId),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  updateTrack: (trackId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, ...updates } : t
        ),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  toggleMute: (trackId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, isMuted: !t.isMuted } : t
        ),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  toggleSolo: (trackId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId ? { ...t, isSolo: !t.isSolo } : t
        ),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  // === 音符操作 ===
  addNote: (trackId, measureId, note) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                measures: t.measures.map((m) =>
                  m.id === measureId
                    ? { ...m, notes: [...m.notes, { ...note, id: uuidv4() }] }
                    : m
                ),
              }
            : t
        ),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  removeNote: (trackId, measureId, noteId) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                measures: t.measures.map((m) =>
                  m.id === measureId
                    ? { ...m, notes: m.notes.filter((n) => n.id !== noteId) }
                    : m
                ),
              }
            : t
        ),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  updateNote: (trackId, measureId, noteId, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        tracks: state.project.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                measures: t.measures.map((m) =>
                  m.id === measureId
                    ? {
                        ...m,
                        notes: m.notes.map((n) =>
                          n.id === noteId ? { ...n, ...updates } : n
                        ),
                      }
                    : m
                ),
              }
            : t
        ),
        updatedAt: new Date().toISOString(),
      },
      syncStatus: 'idle',
    })),

  // === 播放控制 ===
  setPlaybackState: (playbackState) => set({ playbackState }),

  setCurrentPosition: (measure, beat) => set({ currentMeasure: measure, currentBeat: beat }),

  // === Supabase 同步操作 ===
  /**
   * 从 Supabase 加载项目
   * 包括项目基本信息、音轨、小节和音符
   */
  loadProjectFromSupabase: async (projectId: string) => {
    const { user } = useAuthStore.getState()
    if (!user) {
      set({ syncError: '用户未登录，无法加载项目' })
      return
    }

    set({ isLoading: true, syncStatus: 'syncing', syncError: null })

    try {
      // 1. 加载项目基本信息
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (projectError) {
        throw new Error(`加载项目失败: ${projectError.message}`)
      }

      if (!projectData) {
        throw new Error('项目不存在或无权访问')
      }

      // 2. 加载音轨
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_index', { ascending: true })

      if (tracksError) {
        throw new Error(`加载音轨失败: ${tracksError.message}`)
      }

      // 3. 加载所有小节
      const trackIds = (tracksData as TrackRow[])?.map((t) => t.id) || []
      const { data: measuresData, error: measuresError } = await supabase
        .from('measures')
        .select('*')
        .in('track_id', trackIds)
        .order('index', { ascending: true })

      if (measuresError) {
        throw new Error(`加载小节失败: ${measuresError.message}`)
      }

      // 4. 加载所有音符
      const measureIds = (measuresData as MeasureRow[])?.map((m) => m.id) || []
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('measure_id', measureIds)

      if (notesError) {
        throw new Error(`加载音符失败: ${notesError.message}`)
      }

      // 5. 组装数据
      const notesByMeasure = new Map<string, Note[]>()
      ;(notesData as NoteRow[])?.forEach((noteRow) => {
        const note = rowToNote(noteRow)
        const measureNotes = notesByMeasure.get(noteRow.measure_id) || []
        measureNotes.push(note)
        notesByMeasure.set(noteRow.measure_id, measureNotes)
      })

      const measuresByTrack = new Map<string, Measure[]>()
      ;(measuresData as MeasureRow[])?.forEach((measureRow) => {
        const notes = notesByMeasure.get(measureRow.id) || []
        const measure = rowToMeasure(measureRow, notes)
        const trackMeasures = measuresByTrack.get(measureRow.track_id) || []
        trackMeasures.push(measure)
        measuresByTrack.set(measureRow.track_id, trackMeasures)
      })

      const tracks: Track[] = []
      ;(tracksData as TrackRow[])?.forEach((trackRow) => {
        const measures = measuresByTrack.get(trackRow.id) || []
        const track = rowToTrack(trackRow, measures)
        tracks.push(track)
      })

      const project = rowToProject(projectData as ProjectRow, tracks)

      set({
        project,
        isLoading: false,
        syncStatus: 'synced',
        syncError: null,
      })
    } catch (error) {
      console.error('[ProjectStore] 加载项目失败:', error)
      set({
        isLoading: false,
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : '未知错误',
      })
    }
  },

  /**
   * 保存项目到 Supabase
   * 包括项目基本信息、音轨、小节和音符
   */
  saveProjectToSupabase: async () => {
    const { user } = useAuthStore.getState()
    if (!user) {
      set({ syncError: '用户未登录，无法保存项目' })
      return
    }

    const { project } = get()
    set({ syncStatus: 'syncing', syncError: null })

    try {
      // 1. 保存项目基本信息
      const projectRow = projectToRow(project, user.id)
      const projectUpsertData = {
        id: project.id,
        ...projectRow,
        updated_at: new Date().toISOString(),
      }
      
      const { error: projectError } = await supabase
        .from('projects')
        .upsert(projectUpsertData)

      if (projectError) {
        throw new Error(`保存项目失败: ${projectError.message}`)
      }

      // 2. 保存音轨
      for (let i = 0; i < project.tracks.length; i++) {
        const track = project.tracks[i]
        const trackRow = trackToRow(track, project.id, i)
        const trackUpsertData = {
          id: track.id,
          ...trackRow,
        }

        const { error: trackError } = await supabase
          .from('tracks')
          .upsert(trackUpsertData)

        if (trackError) {
          throw new Error(`保存音轨失败: ${trackError.message}`)
        }

        // 3. 保存小节
        for (const measure of track.measures) {
          const measureRow = measureToRow(measure, track.id)
          const measureUpsertData = {
            id: measure.id,
            ...measureRow,
          }

          const { error: measureError } = await supabase
            .from('measures')
            .upsert(measureUpsertData)

          if (measureError) {
            throw new Error(`保存小节失败: ${measureError.message}`)
          }

          // 4. 保存音符
          for (const note of measure.notes) {
            const noteRow = noteToRow(note, measure.id)
            const noteUpsertData = {
              id: note.id,
              ...noteRow,
            }

            const { error: noteError } = await supabase
              .from('notes')
              .upsert(noteUpsertData)

            if (noteError) {
              throw new Error(`保存音符失败: ${noteError.message}`)
            }
          }
        }
      }

      set({
        syncStatus: 'synced',
        syncError: null,
      })
    } catch (error) {
      console.error('[ProjectStore] 保存项目失败:', error)
      set({
        syncStatus: 'error',
        syncError: error instanceof Error ? error.message : '未知错误',
      })
    }
  },

  /**
   * 加载用户项目列表
   * 仅加载项目基本信息，不包含详细内容
   */
  loadUserProjects: async () => {
    const { user } = useAuthStore.getState()
    if (!user) {
      set({ syncError: '用户未登录' })
      return
    }

    set({ isLoading: true })

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        throw new Error(`加载项目列表失败: ${error.message}`)
      }

      const projects = ((data || []) as ProjectRow[]).map((row) => rowToProject(row))
      set({ userProjects: projects, isLoading: false })
    } catch (error) {
      console.error('[ProjectStore] 加载项目列表失败:', error)
      set({ isLoading: false })
    }
  },

  /**
   * 删除项目
   * 从 Supabase 删除指定项目及其所有相关内容
   */
  deleteProject: async (projectId: string) => {
    const { user } = useAuthStore.getState()
    if (!user) {
      set({ syncError: '用户未登录' })
      return
    }

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(`删除项目失败: ${error.message}`)
      }

      // 更新本地项目列表
      set((state) => ({
        userProjects: state.userProjects.filter((p) => p.id !== projectId),
      }))
    } catch (error) {
      console.error('[ProjectStore] 删除项目失败:', error)
      set({
        syncError: error instanceof Error ? error.message : '删除失败',
      })
    }
  },

  /**
   * 设置当前项目
   * 用于从项目列表中选择项目
   */
  setProject: (project: Project) => {
    set({
      project,
      syncStatus: 'idle',
    })
  },
}))
