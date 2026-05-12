import { Request, Response, NextFunction } from 'express';

/**
 * 简单的内存限流器
 * 基于滑动窗口算法，限制每个 IP 在指定时间窗口内的请求数
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// 限流配置
const WINDOW_MS = 60 * 1000; // 时间窗口：1分钟
const MAX_REQUESTS = 100; // 每个窗口最大请求数

// 存储 IP 的请求记录
const requestCounts = new Map<string, RateLimitEntry>();

// 定期清理过期记录（每5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (entry.resetTime <= now) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * 限流中间件
 * 限制每个 IP 地址在指定时间窗口内的请求数量
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  // 开发环境不限流
  if (process.env.NODE_ENV === 'development') {
    next();
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = requestCounts.get(ip);

  if (!entry || entry.resetTime <= now) {
    // 创建新窗口
    entry = {
      count: 1,
      resetTime: now + WINDOW_MS,
    };
    requestCounts.set(ip, entry);
  } else {
    // 增加计数
    entry.count++;
  }

  // 设置限流响应头
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - entry.count));
  res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

  if (entry.count > MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  next();
}
