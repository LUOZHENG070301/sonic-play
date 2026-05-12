/**
 * 核心类型定义
 * Sonic Play AI 音乐工作室后端 API 类型
 */

import type { Request } from 'express';

// ============ 通用类型 ============

/** API 统一响应格式 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** 分页参数 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ 项目类型 ============

/** 项目状态 */
export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'archived';

/** 项目数据 */
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  coverUrl?: string;
  bpm?: number;
  key?: string;
  genre?: string;
  duration?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/** 创建项目请求体 */
export interface CreateProjectBody {
  name: string;
  description?: string;
  bpm?: number;
  key?: string;
  genre?: string;
}

/** 更新项目请求体 */
export interface UpdateProjectBody {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  coverUrl?: string;
  bpm?: number;
  key?: string;
  genre?: string;
}

// ============ 音轨类型 ============

/** 音轨类型 */
export type TrackType = 'vocal' | 'drums' | 'bass' | 'guitar' | 'piano' | 'synth' | 'other';

/** 音轨状态 */
export type TrackStatus = 'pending' | 'processing' | 'completed' | 'error';

/** 音轨数据 */
export interface Track {
  id: string;
  projectId: string;
  name: string;
  type: TrackType;
  status: TrackStatus;
  fileUrl?: string;
  waveformUrl?: string;
  duration?: number;
  volume?: number;
  pan?: number;
  muted: boolean;
  solo: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** 创建音轨请求体 */
export interface CreateTrackBody {
  name: string;
  type: TrackType;
  fileUrl?: string;
  duration?: number;
}

// ============ AI 类型 ============

/** AI 分离任务状态 */
export type SeparationStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** AI 分离任务 */
export interface SeparationTask {
  id: string;
  projectId: string;
  trackId?: string;
  status: SeparationStatus;
  stems: string[];
  progress: number;
  resultUrl?: string;
  createdAt: string;
  completedAt?: string;
}

/** 提交分离任务请求体 */
export interface CreateSeparationBody {
  projectId: string;
  trackId?: string;
  stems: string[];
}

/** AI 分析结果 */
export interface AnalysisResult {
  id: string;
  projectId: string;
  key: string;
  bpm: number;
  timeSignature: string;
  genre: string;
  mood: string[];
  instruments: string[];
  suggestions: string[];
  createdAt: string;
}

/** AI 分析请求体 */
export interface CreateAnalysisBody {
  projectId: string;
}

/** AI 对话消息 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/** AI 对话请求体 */
export interface CreateChatBody {
  message: string;
  context?: {
    projectId?: string;
    trackId?: string;
    history?: ChatMessage[];
  };
}

/** AI 对话响应 */
export interface ChatResponse {
  reply: string;
  suggestions?: string[];
}

// ============ 认证类型 ============

/** JWT 载荷 */
export interface JwtPayload {
  userId: string;
  email: string;
}

/** 认证请求扩展 */
export interface AuthRequest extends Request {
  user?: JwtPayload;
}
