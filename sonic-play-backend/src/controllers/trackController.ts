import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  AuthRequest,
  Track,
  CreateTrackBody,
  ApiResponse,
} from '../types/index.js';

// ============ Mock 数据 ============

/** Mock 音轨数据存储 */
const mockTracks: Track[] = [
  {
    id: 'track-001',
    projectId: 'proj-001',
    name: '主唱人声',
    type: 'vocal',
    status: 'completed',
    fileUrl: '/uploads/vocal-main.wav',
    waveformUrl: '/waveforms/vocal-main.json',
    duration: 215,
    volume: 80,
    pan: 0,
    muted: false,
    solo: false,
    order: 0,
    createdAt: '2024-12-01T10:30:00Z',
    updatedAt: '2024-12-15T14:30:00Z',
  },
  {
    id: 'track-002',
    projectId: 'proj-001',
    name: '鼓组',
    type: 'drums',
    status: 'completed',
    fileUrl: '/uploads/drums.wav',
    waveformUrl: '/waveforms/drums.json',
    duration: 215,
    volume: 75,
    pan: 0,
    muted: false,
    solo: false,
    order: 1,
    createdAt: '2024-12-01T10:35:00Z',
    updatedAt: '2024-12-15T14:30:00Z',
  },
  {
    id: 'track-003',
    projectId: 'proj-001',
    name: '贝斯',
    type: 'bass',
    status: 'completed',
    fileUrl: '/uploads/bass.wav',
    waveformUrl: '/waveforms/bass.json',
    duration: 215,
    volume: 70,
    pan: 0,
    muted: false,
    solo: false,
    order: 2,
    createdAt: '2024-12-01T10:40:00Z',
    updatedAt: '2024-12-15T14:30:00Z',
  },
  {
    id: 'track-004',
    projectId: 'proj-001',
    name: '吉他伴奏',
    type: 'guitar',
    status: 'processing',
    fileUrl: '/uploads/guitar.wav',
    waveformUrl: '/waveforms/guitar.json',
    duration: 215,
    volume: 65,
    pan: -20,
    muted: false,
    solo: false,
    order: 3,
    createdAt: '2024-12-01T10:45:00Z',
    updatedAt: '2024-12-15T14:30:00Z',
  },
  {
    id: 'track-005',
    projectId: 'proj-002',
    name: '萨克斯独奏',
    type: 'other',
    status: 'completed',
    fileUrl: '/uploads/saxophone.wav',
    waveformUrl: '/waveforms/saxophone.json',
    duration: 340,
    volume: 85,
    pan: 10,
    muted: false,
    solo: true,
    order: 0,
    createdAt: '2024-12-05T09:00:00Z',
    updatedAt: '2024-12-10T16:00:00Z',
  },
];

// ============ 控制器 ============

/**
 * 获取项目的音轨列表
 * GET /api/v1/projects/:id/tracks
 */
export function getTracks(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const projectId = req.params.id as string;

    // 筛选属于该项目的音轨，按 order 排序
    const tracks = mockTracks
      .filter((t) => t.projectId === projectId)
      .sort((a, b) => a.order - b.order);

    const response: ApiResponse<Track[]> = {
      success: true,
      data: tracks,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * 创建音轨
 * POST /api/v1/projects/:id/tracks
 */
export function createTrack(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const projectId = req.params.id as string;
    const body = req.body as CreateTrackBody;

    // 获取当前项目下的音轨数量，用于设置 order
    const existingTracks = mockTracks.filter((t) => t.projectId === projectId);

    const now = new Date().toISOString();
    const newTrack: Track = {
      id: `track-${uuidv4().slice(0, 8)}`,
      projectId,
      name: body.name,
      type: body.type,
      status: 'pending',
      fileUrl: body.fileUrl,
      duration: body.duration,
      volume: 80,
      pan: 0,
      muted: false,
      solo: false,
      order: existingTracks.length,
      createdAt: now,
      updatedAt: now,
    };

    mockTracks.push(newTrack);

    const response: ApiResponse<Track> = {
      success: true,
      data: newTrack,
      message: '音轨创建成功',
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}
