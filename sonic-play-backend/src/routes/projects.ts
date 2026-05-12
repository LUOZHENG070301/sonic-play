import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * 项目管理路由
 * /api/v1/projects
 */
const router = Router();

// 所有项目路由都需要认证
router.use(authMiddleware);

// 项目 CRUD
router.get('/', getProjects);           // 获取项目列表
router.post('/', createProject);         // 创建项目
router.get('/:id', getProjectById);      // 获取项目详情
router.put('/:id', updateProject);       // 更新项目
router.delete('/:id', deleteProject);    // 删除项目

export default router;
