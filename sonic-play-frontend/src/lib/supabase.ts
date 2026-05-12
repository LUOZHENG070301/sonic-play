/**
 * Sonic Play - Supabase 客户端配置
 * 初始化 Supabase 客户端并提供类型支持
 */
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase 项目 URL
 * 从环境变量获取，如果不存在则使用空字符串
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''

/**
 * Supabase 匿名密钥
 * 用于客户端身份验证，从环境变量获取
 */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * 验证 Supabase 配置是否完整
 * 如果配置缺失，在开发环境会输出警告
 */
if (!supabaseUrl || !supabaseAnonKey) {
  if (import.meta.env.DEV) {
    console.warn(
      '[Supabase] 配置缺失：请检查 .env 文件中的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量'
    )
  }
}

/**
 * Supabase 客户端实例
 * 
 * 使用示例：
 * ```typescript
 * import { supabase } from '@/lib/supabase'
 * 
 * // 查询项目列表
 * const { data, error } = await supabase
 *   .from('projects')
 *   .select('*')
 *   .eq('user_id', userId)
 * ```
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    /**
     * 自动刷新令牌
     * 确保用户会话在过期前自动刷新
     */
    autoRefreshToken: true,
    /**
     * 持久化会话
     * 将登录状态保存在 localStorage 中
     */
    persistSession: true,
    /**
     * 检测会话在 URL 中
     * 用于处理 OAuth 回调和邮件确认链接
     */
    detectSessionInUrl: true,
  },
  /**
   * 全局错误处理
   */
  global: {
    headers: {
      'X-Client-Info': 'sonic-play-frontend',
    },
  },
})

/**
 * 获取当前用户会话
 * 用于检查用户是否已登录
 */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('[Supabase] 获取会话失败:', error.message)
    return null
  }
  return data.session
}

/**
 * 获取当前用户信息
 * 返回当前登录用户的详细信息
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    console.error('[Supabase] 获取用户信息失败:', error.message)
    return null
  }
  return data.user
}

/**
 * 导出 supabase 辅助类型
 */
export type SupabaseClient = typeof supabase
