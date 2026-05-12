import { Request, Response, NextFunction } from 'express';

/**
 * 自定义错误类
 * 用于区分业务错误和系统错误
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // 保持正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误并返回统一格式的响应
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 设置默认状态码
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  // 构建错误响应
  const errorResponse = {
    success: false,
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  };

  // 记录错误日志
  if (statusCode >= 500) {
    console.error('[服务器错误]', err);
  } else {
    console.warn('[请求错误]', err.message);
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 未找到处理中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `接口不存在: ${req.method} ${req.originalUrl}`,
  });
}
