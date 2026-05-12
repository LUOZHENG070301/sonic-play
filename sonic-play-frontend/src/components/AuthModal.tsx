/**
 * Sonic Play - 认证弹窗组件
 * 支持邮箱/密码登录和注册，采用 Duolingo 风格设计
 */
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Music, Eye, EyeOff, X, Loader2 } from 'lucide-react'

/** 认证模式类型 */
type AuthMode = 'login' | 'register'

/** AuthModal 组件属性 */
interface AuthModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean
  /** 关闭弹窗回调 */
  onClose: () => void
  /** 初始模式 */
  initialMode?: AuthMode
}

/**
 * 认证弹窗组件
 * 提供登录和注册功能，使用 Duolingo 风格的按钮设计
 */
export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
}: AuthModalProps) {
  // 当前模式（登录/注册）
  const [mode, setMode] = useState<AuthMode>(initialMode)
  // 表单数据
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  // 密码可见性
  const [showPassword, setShowPassword] = useState(false)
  // 表单验证错误
  const [validationError, setValidationError] = useState<string | null>(null)

  // 从认证 Store 获取状态和操作
  const { signInWithPassword, signUp, isLoading, error, clearError, status } = useAuthStore()

  // 当弹窗打开时，重置表单
  useEffect(() => {
    if (isOpen) {
      setEmail('')
      setPassword('')
      setDisplayName('')
      setValidationError(null)
      clearError()
    }
  }, [isOpen, mode, clearError])

  // 如果未打开，不渲染
  if (!isOpen) return null

  /**
   * 验证表单数据
   * 返回验证错误信息，如果验证通过返回 null
   */
  const validateForm = (): string | null => {
    // 验证邮箱
    if (!email.trim()) {
      return '请输入邮箱地址'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return '请输入有效的邮箱地址'
    }

    // 验证密码
    if (!password) {
      return '请输入密码'
    }
    if (password.length < 6) {
      return '密码至少需要6位字符'
    }

    // 注册模式额外验证
    if (mode === 'register') {
      if (!displayName.trim()) {
        return '请输入显示名称'
      }
      if (displayName.length < 2) {
        return '显示名称至少需要2个字符'
      }
    }

    return null
  }

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 清除之前的错误
    setValidationError(null)
    clearError()

    // 验证表单
    const validation = validateForm()
    if (validation) {
      setValidationError(validation)
      return
    }

    // 执行登录或注册
    if (mode === 'login') {
      await signInWithPassword(email, password)
    } else {
      await signUp(email, password, displayName)
    }

    // 如果认证成功，关闭弹窗
    if (status === 'authenticated') {
      onClose()
    }
  }

  /**
   * 切换模式
   */
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setValidationError(null)
    clearError()
  }

  /**
   * 获取 Duolingo 风格按钮的样式类名
   * 根据按钮类型返回不同的渐变和阴影效果
   */
  const getDuolingoButtonClass = (variant: 'primary' | 'secondary' = 'primary') => {
    const baseClasses = 'relative w-full rounded-xl font-bold text-center transition-all duration-150 active:scale-[0.98]'

    if (variant === 'primary') {
      return `${baseClasses} bg-gradient-to-b from-[#58cc02] to-[#58a700] text-white shadow-[0_4px_0_#58a700] hover:brightness-110 active:shadow-none active:translate-y-[4px] h-12 text-base`
    }

    return `${baseClasses} bg-gradient-to-b from-[#1cb0f6] to-[#1899d6] text-white shadow-[0_4px_0_#1899d6] hover:brightness-110 active:shadow-none active:translate-y-[4px] h-12 text-base`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-2xl">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
          aria-label="关闭"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo 和标题 */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
            <Music className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            {mode === 'login' ? '欢迎回来' : '创建账户'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {mode === 'login'
              ? '登录您的 Sonic Play 账户继续创作'
              : '注册新账户，开启您的音乐创作之旅'}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 显示名称（仅注册模式） */}
          {mode === 'register' && (
            <div>
              <label
                htmlFor="displayName"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                显示名称
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="您的音乐创作者名称"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isLoading}
              />
            </div>
          )}

          {/* 邮箱输入 */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              disabled={isLoading}
            />
          </div>

          {/* 密码输入 */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-gray-300"
            >
              密码
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 pr-12 text-white placeholder-gray-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {(validationError || error) && (
            <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {validationError || error?.message}
            </div>
          )}

          {/* 提交按钮 - Duolingo 风格 */}
          <button
            type="submit"
            disabled={isLoading}
            className={getDuolingoButtonClass('primary')}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {mode === 'login' ? '登录中...' : '注册中...'}
              </span>
            ) : mode === 'login' ? (
              '登录'
            ) : (
              '创建账户'
            )}
          </button>
        </form>

        {/* 切换模式 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {mode === 'login' ? '还没有账户？' : '已有账户？'}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-1 font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              disabled={isLoading}
            >
              {mode === 'login' ? '立即注册' : '立即登录'}
            </button>
          </p>
        </div>

        {/* 分隔线 */}
        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-800" />
          <span className="text-xs text-gray-500">或使用以下方式</span>
          <div className="h-px flex-1 bg-gray-800" />
        </div>

        {/* 游客模式按钮 */}
        <button
          type="button"
          onClick={onClose}
          className={getDuolingoButtonClass('secondary')}
          disabled={isLoading}
        >
          继续以游客身份使用
        </button>
      </div>
    </div>
  )
}
