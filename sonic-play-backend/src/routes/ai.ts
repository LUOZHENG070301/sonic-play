import { Router } from 'express';
import {
  createSeparation,
  analyzeMusic,
  chat,
} from '../controllers/aiController.js';
import { authMiddleware } from '../middleware/auth.js';

/**
 * AI 处理路由
 * /api/v1/ai
 */
const router = Router();

// 所有 AI 路由都需要认证
router.use(authMiddleware);

// AI 功能
router.post('/separate', createSeparation);  // 提交分离任务
router.post('/analyze', analyzeMusic);       // AI 分析
router.post('/chat', chat);                  // AI 对话

export default router;
