import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import projectRoutes from './routes/projects.js';
import trackRoutes from './routes/tracks.js';
import aiRoutes from './routes/ai.js';

/**
 * Sonic Play AI 音乐工作室 - 后端服务入口
 *
 * 功能模块：
 * - 项目管理（CRUD）
 * - 音轨管理
 * - AI 音频处理（分离、分析、对话）
 */

// 创建 Express 应用
const app = express();

// ============ 中间件配置 ============

// 安全头部
app.use(helmet());

// CORS 跨域配置
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// 限流
app.use(rateLimiter);

// ============ 健康检查 ============

app.get('/api/v1/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'Sonic Play AI Backend',
      version: '1.0.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// ============ 路由挂载 ============

// 项目路由（包含音轨子路由）
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/projects', trackRoutes);

// AI 路由
app.use('/api/v1/ai', aiRoutes);

// ============ 错误处理 ============

// 404 处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

// ============ 启动服务 ============

app.listen(config.port, () => {
  console.log('='.repeat(50));
  console.log(`  Sonic Play AI 后端服务已启动`);
  console.log(`  环境: ${config.nodeEnv}`);
  console.log(`  地址: http://localhost:${config.port}`);
  console.log(`  API:  http://localhost:${config.port}/api/v1`);
  console.log(`  健康: http://localhost:${config.port}/api/v1/health`);
  console.log('='.repeat(50));
});

export default app;
