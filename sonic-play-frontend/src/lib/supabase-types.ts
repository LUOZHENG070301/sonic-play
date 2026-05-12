/**
 * Sonic Play - Supabase 数据库类型定义
 * 基于项目数据库表结构定义
 */

/** 用户资料表 */
export interface Profile {
  /** 用户 ID (主键，关联 auth.users) */
  id: string
  /** 用户邮箱 */
  email: string
  /** 显示名称 */
  display_name: string | null
  /** 头像 URL */
  avatar_url: string | null
  /** 账户类型 */
  account_type: 'free' | 'pro' | 'enterprise'
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/** 项目表 */
export interface ProjectRow {
  /** 项目 ID (主键) */
  id: string
  /** 项目所有者 ID */
  user_id: string
  /** 项目名称 */
  name: string
  /** 项目描述 */
  description: string | null
  /** 全局速度 (BPM) */
  tempo: number
  /** 拍号分子 */
  time_signature_numerator: number
  /** 拍号分母 */
  time_signature_denominator: number
  /** 总小节数 */
  total_measures: number
  /** 项目状态 */
  status: 'draft' | 'saved' | 'exporting'
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/** 音轨表 */
export interface TrackRow {
  /** 音轨 ID (主键) */
  id: string
  /** 所属项目 ID */
  project_id: string
  /** 音轨名称 */
  name: string
  /** 乐器类型 */
  instrument: string
  /** MIDI 音色编号 */
  program_number: number
  /** 音量 (0-1) */
  volume: number
  /** 声像 (-1 到 1) */
  pan: number
  /** 是否静音 */
  is_muted: boolean
  /** 是否独奏 */
  is_solo: boolean
  /** 音轨颜色 */
  color: string
  /** 是否锁定 */
  is_locked: boolean
  /** 排序索引 */
  sort_index: number
  /** 创建时间 */
  created_at: string
  /** 更新时间 */
  updated_at: string
}

/** 小节表 */
export interface MeasureRow {
  /** 小节 ID (主键) */
  id: string
  /** 所属音轨 ID */
  track_id: string
  /** 小节序号 */
  index: number
  /** 拍号分子 */
  numerator: number
  /** 拍号分母 */
  denominator: number
  /** 调号 */
  key_signature: number
  /** 速度标记 */
  tempo: number | null
  /** 创建时间 */
  created_at: string
}

/** 音符表 */
export interface NoteRow {
  /** 音符 ID (主键) */
  id: string
  /** 所属小节 ID */
  measure_id: string
  /** 音高 */
  pitch: string
  /** 时值 */
  duration: string
  /** 力度 (0-127) */
  velocity: number
  /** 开始时间（拍） */
  start_beat: number
  /** 是否为休止符 */
  is_rest: boolean
  /** 升降号 */
  accidental: string | null
  /** 颤音 */
  vibrato: boolean
  /** 连音线目标音符 ID */
  tied_to: string | null
  /** 创建时间 */
  created_at: string
}

/** 音频资源表 */
export interface AudioAssetRow {
  /** 资源 ID (主键) */
  id: string
  /** 所属项目 ID */
  project_id: string
  /** 资源名称 */
  name: string
  /** 存储桶中的文件路径 */
  storage_path: string
  /** 文件类型 */
  file_type: string
  /** 时长（秒） */
  duration: number | null
  /** 采样率 */
  sample_rate: number | null
  /** 创建时间 */
  created_at: string
}

/** 数据库表名枚举 */
export type DatabaseTable =
  | 'profiles'
  | 'projects'
  | 'tracks'
  | 'measures'
  | 'notes'
  | 'audio_assets'

/** 数据库类型定义 - 用于 Supabase 客户端 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Profile
        Update: Partial<Profile>
        Relationships: []
      }
      projects: {
        Row: ProjectRow
        Insert: ProjectRow
        Update: Partial<ProjectRow>
        Relationships: []
      }
      tracks: {
        Row: TrackRow
        Insert: TrackRow
        Update: Partial<TrackRow>
        Relationships: []
      }
      measures: {
        Row: MeasureRow
        Insert: MeasureRow
        Update: Partial<MeasureRow>
        Relationships: []
      }
      notes: {
        Row: NoteRow
        Insert: NoteRow
        Update: Partial<NoteRow>
        Relationships: []
      }
      audio_assets: {
        Row: AudioAssetRow
        Insert: AudioAssetRow
        Update: Partial<AudioAssetRow>
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
