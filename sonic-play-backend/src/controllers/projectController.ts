import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  AuthRequest,
  Project,
  CreateProjectBody,
  UpdateProjectBody,
  ApiResponse,
  PaginatedResponse,
} from '../types/index.js';

// ============ Mock 数据 ============

/** Mock 项目数据存储 */
const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: '夏日旋律',
    description: '一首轻快的夏日流行歌曲',
    status: 'completed',
    coverUrl: 'https://picsum.photos/seed/project1/400/400',
    bpm: 120,
    key: 'C Major',
    genre: 'Pop',
    duration: 215,
    userId: 'mock-user-001',
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-15T14:30:00Z',
  },
  {
    id: 'proj-002',
    name: '午夜爵士',
    description: '深夜爵士即兴录音',
    status: 'processing',
    coverUrl: 'https://picsum.photos/seed/project2/400/400',
    bpm: 95,
    key: 'Bb Minor',
    genre: 'Jazz',
    duration: 340,
    userId: 'mock-user-001',
    createdAt: '2024-12-05T08:00:00Z',
    updatedAt: '2024-12-10T16:00:00Z',
  },
  {
    id: 'proj-003',
    name: '电子脉冲',
    description: '电子舞曲制作项目',
    status: 'draft',
    bpm: 128,
    key: 'A Minor',
    genre: 'EDM',
    duration: 0,
    userId: 'mock-user-001',
    createdAt: '2024-12-10T12:00:00Z',
    updatedAt: '2024-12-10T12:00:00Z',
  },
];

// ============ 控制器 ============

/**
 * 获取项目列表
 * GET /api/v1/projects
 */
export function getProjects(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;

    // 按状态筛选
    let filtered = [...mockProjects];
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    // 按更新时间倒序排列
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // 分页
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);

    const response: ApiResponse<PaginatedResponse<Project>> = {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalPages,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * 获取项目详情
 * GET /api/v1/projects/:id
 */
export function getProjectById(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const project = mockProjects.find((p) => p.id === id);

    if (!project) {
      res.status(404).json({
        success: false,
        error: '项目不存在',
      });
      return;
    }

    const response: ApiResponse<Project> = {
      success: true,
      data: project,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * 创建项目
 * POST /api/v1/projects
 */
export function createProject(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const body = req.body as CreateProjectBody;
    const userId = req.user?.userId || 'mock-user-001';

    const now = new Date().toISOString();
    const newProject: Project = {
      id: `proj-${uuidv4().slice(0, 8)}`,
      name: body.name,
      description: body.description || '',
      status: 'draft',
      bpm: body.bpm,
      key: body.key,
      genre: body.genre,
      duration: 0,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    mockProjects.push(newProject);

    const response: ApiResponse<Project> = {
      success: true,
      data: newProject,
      message: '项目创建成功',
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * 更新项目
 * PUT /api/v1/projects/:id
 */
export function updateProject(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const body = req.body as UpdateProjectBody;

    const projectIndex = mockProjects.findIndex((p) => p.id === id);
    if (projectIndex === -1) {
      res.status(404).json({
        success: false,
        error: '项目不存在',
      });
      return;
    }

    // 合并更新
    const updatedProject: Project = {
      ...mockProjects[projectIndex],
      ...body,
      id: mockProjects[projectIndex].id, // 防止 ID 被覆盖
      userId: mockProjects[projectIndex].userId, // 防止 userId 被覆盖
      createdAt: mockProjects[projectIndex].createdAt, // 防止创建时间被覆盖
      updatedAt: new Date().toISOString(),
    };

    mockProjects[projectIndex] = updatedProject;

    const response: ApiResponse<Project> = {
      success: true,
      data: updatedProject,
      message: '项目更新成功',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * 删除项目
 * DELETE /api/v1/projects/:id
 */
export function deleteProject(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const projectIndex = mockProjects.findIndex((p) => p.id === id);

    if (projectIndex === -1) {
      res.status(404).json({
        success: false,
        error: '项目不存在',
      });
      return;
    }

    mockProjects.splice(projectIndex, 1);

    const response: ApiResponse<null> = {
      success: true,
      message: '项目删除成功',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}
