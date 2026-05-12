import { Router } from 'express';
import { getTracks, createTrack } from '../controllers/trackController.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * 音轨管理路由
 * /api/v1/projects/:id/tracks
 */
const router = Router();

// 所有音轨路由都需要认证
router.use(authMiddleware);

// 音轨操作
router.get('/:id/tracks', getTracks);     // 获取项目的音轨列表
router.post('/:id/tracks', createTrack);   // 创建音轨

export default router;
