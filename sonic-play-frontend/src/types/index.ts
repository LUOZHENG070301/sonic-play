/**
 * Sonic Play - 核心类型定义
 * 包含音符、音轨、项目、小节等基础类型
 */

/** 音符时值类型 */
export type NoteDuration =
  | 'whole'      // 全音符
  | 'half'       // 二分音符
  | 'quarter'    // 四分音符
  | 'eighth'     // 八分音符
  | 'sixteenth'  // 十六分音符
  | 'thirty-second' // 三十二分音符

/** 音符时值对应的拍数映射 */
export const DURATION_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
  'thirty-second': 0.125,
}

/** 升降号类型 */
export type Accidental = 'sharp' | 'flat' | 'natural' | 'double-sharp' | 'double-flat'

/** 音符名称（音高） */
export type PitchName = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'

/** 八度范围 */
export type Octave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

/** 音符接口 */
export interface Note {
  /** 唯一标识 */
  id: string
  /** 音高名称，如 C4, D#5 */
  pitch: string
  /** 时值 */
  duration: NoteDuration
  /** 力度 (0-127) */
  velocity: number
  /** 开始时间（以拍为单位） */
  startBeat: number
  /** 是否为休止符 */
  isRest: boolean
  /** 升降号 */
  accidental?: Accidental
  /** 颤音 */
  vibrato?: boolean
  /** 连音线连接的目标音符 ID */
  tiedTo?: string
}

/** 小节接口 */
export interface Measure {
  /** 唯一标识 */
  id: string
  /** 小节序号（从 1 开始） */
  index: number
  /** 拍号分子 */
  numerator: number
  /** 拍号分母 */
  denominator: number
  /** 调号 (0 = C大调, 1 = G大调, -1 = F大调, ...) */
  keySignature: number
  /** 该小节中的音符列表 */
  notes: Note[]
  /** 速度标记 (BPM) */
  tempo?: number
}

/** 乐器类型 */
export type InstrumentType =
  | 'piano'
  | 'guitar'
  | 'bass'
  | 'drums'
  | 'violin'
  | 'flute'
  | 'synth'
  | 'custom'

/** 音轨接口 */
export interface Track {
  /** 唯一标识 */
  id: string
  /** 音轨名称 */
  name: string
  /** 乐器类型 */
  instrument: InstrumentType
  /** 乐器音色 (MIDI 音色编号) */
  programNumber: number
  /** 音量 (0-1) */
  volume: number
  /** 声像 (-1 到 1) */
  pan: number
  /** 是否静音 */
  isMuted: boolean
  /** 是否独奏 */
  isSolo: boolean
  /** 小节列表 */
  measures: Measure[]
  /** 音轨颜色 */
  color: string
  /** 是否锁定编辑 */
  isLocked: boolean
}

/** 项目状态 */
export type ProjectStatus = 'draft' | 'saved' | 'exporting'

/** 项目接口 */
export interface Project {
  /** 唯一标识 */
  id: string
  /** 项目名称 */
  name: string
  /** 创建时间 */
  createdAt: string
  /** 最后修改时间 */
  updatedAt: string
  /** 项目描述 */
  description?: string
  /** 全局速度 (BPM) */
  tempo: number
  /** 全局拍号分子 */
  timeSignatureNumerator: number
  /** 全局拍号分母 */
  timeSignatureDenominator: number
  /** 总小节数 */
  totalMeasures: number
  /** 音轨列表 */
  tracks: Track[]
  /** 项目状态 */
  status: ProjectStatus
}

/** 编辑器工具类型 */
export type EditorTool =
  | 'select'     // 选择工具
  | 'pencil'     // 画笔工具（添加音符）
  | 'eraser'     // 橡皮擦工具（删除音符）
  | 'duration'   // 时值工具
  | 'rest'       // 休止符工具

/** 编辑器模式 */
export type EditorMode =
  | 'note-input'  // 音符输入模式
  | 'select'      // 选择模式
  | 'edit'        // 编辑模式

/** 播放状态 */
export type PlaybackState = 'stopped' | 'playing' | 'paused' | 'recording'

/** 选区信息 */
export interface Selection {
  /** 起始小节索引 */
  startMeasure: number
  /** 起始拍位置 */
  startBeat: number
  /** 结束小节索引 */
  endMeasure: number
  /** 结束拍位置 */
  endBeat: number
}

/** AI 生成请求 */
export interface AIGenerationRequest {
  /** 提示文本 */
  prompt: string
  /** 目标音轨 ID */
  trackId: string
  /** 起始小节索引 */
  startMeasure: number
  /** 结束小节索引 */
  endMeasure: number
  /** 风格标签 */
  style?: string[]
  /** 温度参数 (0-1) */
  temperature?: number
}

/** AI 生成结果 */
export interface AIGenerationResult {
  /** 生成的音符列表 */
  notes: Note[]
  /** 是否成功 */
  success: boolean
  /** 错误信息 */
  error?: string
}

/** 录音配置 */
export interface RecordingConfig {
  /** 采样率 */
  sampleRate: number
  /** 声道数 */
  channels: number
  /** 编码格式 */
  encoding: 'wav' | 'mp3' | 'ogg'
  /** 是否启用降噪 */
  noiseReduction: boolean
}

/** 波形数据 */
export interface WaveformData {
  /** 采样数据 */
  samples: Float32Array
  /** 采样率 */
  sampleRate: number
  /** 时长（秒） */
  duration: number
}

/** MIDI 事件类型 */
export interface MidiEvent {
  /** 事件类型 */
  type: 'note-on' | 'note-off' | 'control-change' | 'program-change'
  /** MIDI 通道 (0-15) */
  channel: number
  /** 音高编号 (0-127) */
  noteNumber?: number
  /** 力度 (0-127) */
  velocity?: number
  /** 控制器编号 */
  controllerNumber?: number
  /** 控制器值 */
  controllerValue?: number
  /** 时间戳（毫秒） */
  timestamp: number
}
