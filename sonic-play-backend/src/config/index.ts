import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 应用配置对象
 * 从环境变量中读取配置，提供默认值
 */
export const config = {
  // 服务配置
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV === 'development',

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // CORS 配置
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Supabase 配置（后续接入）
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // AI 服务配置（后续接入）
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  },
} as const;

export default config;
