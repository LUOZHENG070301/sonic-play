/**
 * Sonic Play - 认证状态管理
 * 使用 Zustand 管理用户认证状态，集成 Supabase Auth
 */
import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase-types'

/** 认证状态类型 */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

/** 认证错误信息 */
export interface AuthErrorInfo {
  /** 错误消息 */
  message: string
  /** 错误代码 */
  code?: string
}

/** 认证 Store 状态接口 */
interface AuthState {
  /** 当前用户 */
  user: User | null
  /** 用户资料 */
  profile: Profile | null
  /** 当前会话 */
  session: Session | null
  /** 认证状态 */
  status: AuthStatus
  /** 是否正在加载 */
  isLoading: boolean
  /** 错误信息 */
  error: AuthErrorInfo | null

  // === 认证操作方法 ===
  /** 初始化认证状态 */
  initializeAuth: () => Promise<void>
  /** 使用邮箱和密码登录 */
  signInWithPassword: (email: string, password: string) => Promise<void>
  /** 使用邮箱和密码注册 */
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  /** 登出 */
  signOut: () => Promise<void>
  /** 清除错误 */
  clearError: () => void
  /** 更新用户资料 */
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  /** 刷新用户资料 */
  refreshProfile: () => Promise<void>
}

/**
 * 处理 Supabase 认证错误
 * 将错误转换为友好的中文提示
 */
function handleAuthError(error: AuthError): AuthErrorInfo {
  const errorMessages: Record<string, string> = {
    'auth/invalid-email': '邮箱格式不正确',
    'auth/weak-password': '密码太弱，请使用至少6位字符',
    'auth/email-already-in-use': '该邮箱已被注册',
    'auth/user-not-found': '用户不存在',
    'auth/wrong-password': '密码错误',
    'auth/invalid-credentials': '邮箱或密码错误',
    'auth/session-expired': '登录会话已过期，请重新登录',
    'auth/network-request-failed': '网络请求失败，请检查网络连接',
    'auth/too-many-requests': '请求过于频繁，请稍后再试',
    'auth/popup-closed-by-user': '登录窗口被关闭',
    'auth/cancelled-popup-request': '登录请求已取消',
    'auth/user-disabled': '该账户已被禁用',
  }

  const code = error.code || ''
  return {
    message: errorMessages[code] || error.message || '未知错误',
    code: code,
  }
}

/**
 * 获取用户资料
 * 从 profiles 表中查询用户资料信息
 */
async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[AuthStore] 获取用户资料失败:', error.message)
    return null
  }

  return data as Profile
}

/**
 * 创建用户资料
 * 新用户注册时自动创建对应的资料记录
 */
async function createProfile(
  userId: string,
  email: string,
  displayName?: string
): Promise<Profile | null> {
  const profileData = {
    id: userId,
    email,
    display_name: displayName || email.split('@')[0],
    account_type: 'free' as const,
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single()

  if (error) {
    console.error('[AuthStore] 创建用户资料失败:', error.message)
    return null
  }

  return data as Profile
}

/** 认证状态管理 Store */
export const useAuthStore = create<AuthState>((set, get) => ({
  // 初始状态
  user: null,
  profile: null,
  session: null,
  status: 'idle',
  isLoading: false,
  error: null,

  /**
   * 初始化认证状态
   * 在应用启动时调用，检查本地存储的会话
   */
  initializeAuth: async () => {
    set({ status: 'loading', isLoading: true })

    try {
      // 获取当前会话
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        throw error
      }

      if (session) {
        // 获取用户信息
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // 获取用户资料
          const profile = await fetchProfile(user.id)

          set({
            user,
            session,
            profile,
            status: 'authenticated',
            isLoading: false,
          })
        } else {
          set({
            user: null,
            session: null,
            profile: null,
            status: 'unauthenticated',
            isLoading: false,
          })
        }
      } else {
        set({
          user: null,
          session: null,
          profile: null,
          status: 'unauthenticated',
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('[AuthStore] 初始化认证失败:', error)
      set({
        user: null,
        session: null,
        profile: null,
        status: 'unauthenticated',
        isLoading: false,
        error: handleAuthError(error as AuthError),
      })
    }

    // 监听认证状态变化
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthStore] 认证状态变化:', event)

      if (event === 'SIGNED_IN' && session) {
        const { data: { user } } = await supabase.auth.getUser()
        const profile = user ? await fetchProfile(user.id) : null

        set({
          user,
          session,
          profile,
          status: 'authenticated',
          error: null,
        })
      } else if (event === 'SIGNED_OUT') {
        set({
          user: null,
          session: null,
          profile: null,
          status: 'unauthenticated',
        })
      } else if (event === 'USER_UPDATED' && session) {
        const { data: { user } } = await supabase.auth.getUser()
        set({ user, session })
      } else if (event === 'TOKEN_REFRESHED' && session) {
        set({ session })
      }
    })
  },

  /**
   * 使用邮箱和密码登录
   * @param email - 用户邮箱
   * @param password - 用户密码
   */
  signInWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user && data.session) {
        // 获取用户资料
        const profile = await fetchProfile(data.user.id)

        set({
          user: data.user,
          session: data.session,
          profile,
          status: 'authenticated',
          isLoading: false,
          error: null,
        })
      }
    } catch (error) {
      console.error('[AuthStore] 登录失败:', error)
      set({
        isLoading: false,
        error: handleAuthError(error as AuthError),
      })
    }
  },

  /**
   * 使用邮箱和密码注册
   * @param email - 用户邮箱
   * @param password - 用户密码
   * @param displayName - 显示名称（可选）
   */
  signUp: async (email: string, password: string, displayName?: string) => {
    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        // 创建用户资料
        const profile = await createProfile(data.user.id, email, displayName)

        set({
          user: data.user,
          session: data.session,
          profile,
          status: data.session ? 'authenticated' : 'unauthenticated',
          isLoading: false,
          error: null,
        })
      }
    } catch (error) {
      console.error('[AuthStore] 注册失败:', error)
      set({
        isLoading: false,
        error: handleAuthError(error as AuthError),
      })
    }
  },

  /**
   * 登出
   * 清除当前会话并返回未登录状态
   */
  signOut: async () => {
    set({ isLoading: true })

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      set({
        user: null,
        session: null,
        profile: null,
        status: 'unauthenticated',
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('[AuthStore] 登出失败:', error)
      set({
        isLoading: false,
        error: handleAuthError(error as AuthError),
      })
    }
  },

  /**
   * 清除错误信息
   */
  clearError: () => {
    set({ error: null })
  },

  /**
   * 更新用户资料
   * @param updates - 要更新的字段
   */
  updateProfile: async (updates: Partial<Profile>) => {
    const { user } = get()

    if (!user) {
      set({ error: { message: '用户未登录' } })
      return
    }

    set({ isLoading: true })

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      set({
        profile: data as Profile,
        isLoading: false,
      })
    } catch (error) {
      console.error('[AuthStore] 更新资料失败:', error)
      set({
        isLoading: false,
        error: { message: '更新资料失败，请重试' },
      })
    }
  },

  /**
   * 刷新用户资料
   * 从服务器重新获取最新的用户资料
   */
  refreshProfile: async () => {
    const { user } = get()

    if (!user) {
      return
    }

    try {
      const profile = await fetchProfile(user.id)
      set({ profile })
    } catch (error) {
      console.error('[AuthStore] 刷新资料失败:', error)
    }
  },
}))
