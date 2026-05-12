import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import type { AuthRequest, JwtPayload } from '../types/index.js';

/**
 * JWT 认证中间件
 * 当前为 Mock 模式，后续将接入 Supabase 认证
 *
 * Mock 模式下：
 * - 如果请求头包含 Authorization 且 token 格式正确，则验证并解析
 * - 如果没有 token，则自动分配一个 Mock 用户
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 有 token，尝试验证
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        req.user = decoded;
      } catch {
        // token 无效，使用 Mock 用户
        req.user = getMockUser();
      }
    } else {
      // 没有 token，使用 Mock 用户
      req.user = getMockUser();
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 严格认证中间件（需要有效 token）
 * 用于需要真实认证的接口
 */
export function strictAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: '未提供认证令牌',
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({
        success: false,
        error: '认证令牌无效或已过期',
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * 获取 Mock 用户信息
 */
function getMockUser(): JwtPayload {
  return {
    userId: 'mock-user-001',
    email: 'demo@sonicplay.ai',
  };
}
