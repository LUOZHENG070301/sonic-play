/**
 * Sonic Play - 主布局组件
 * 包含顶部导航栏和主内容区域，集成用户信息显示
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  Music,
  Mic,
  Brain,
  Settings,
  Play,
  Pause,
  Square,
  FileMusic,
  LayoutDashboard,
  User,
  LogOut,
  Save,
  Cloud,
  CloudOff,
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import { useAuthStore } from '@/stores/authStore'
import AuthModal from './AuthModal'
import type { EditorView } from '@/stores/editorStore'

/** 布局组件属性 */
interface LayoutProps {
  children: ReactNode
}

/** 主布局组件 */
export default function Layout({ children }: LayoutProps) {
  const {
    project,
    playbackState,
    setPlaybackState,
    updateTempo,
    saveProjectToSupabase,
    syncStatus,
  } = useProjectStore()
  const {
    toggleAIPanel,
    toggleRecordingPanel,
    isAIPanelOpen,
    isRecordingPanelOpen,
    activeView,
    setActiveView,
  } = useEditorStore()
  const { user, profile, status, signOut } = useAuthStore()

  // 用户菜单状态
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  // 认证弹窗状态
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  /** 处理播放/暂停切换 */
  const handlePlayPause = () => {
    if (playbackState === 'playing') {
      setPlaybackState('paused')
    } else {
      setPlaybackState('playing')
    }
  }

  /** 处理停止 */
  const handleStop = () => {
    setPlaybackState('stopped')
  }

  /** 处理保存项目 */
  const handleSave = async () => {
    if (status === 'authenticated') {
      await saveProjectToSupabase()
    } else {
      setIsAuthModalOpen(true)
    }
  }

  /** 处理登出 */
  const handleSignOut = async () => {
    await signOut()
    setIsUserMenuOpen(false)
  }

  /** 获取同步状态图标 */
  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Cloud className="h-3.5 w-3.5 animate-pulse text-indigo-400" />
      case 'synced':
        return <Cloud className="h-3.5 w-3.5 text-green-400" />
      case 'error':
        return <CloudOff className="h-3.5 w-3.5 text-red-400" />
      default:
        return null
    }
  }

  /** 获取同步状态文本 */
  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing':
        return '保存中'
      case 'synced':
        return '已同步'
      case 'error':
        return '同步失败'
      default:
        return ''
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      {/* 顶部导航栏 */}
      <header className="flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4">
        {/* 左侧：品牌标识 + 视图切换 */}
        <div className="flex items-center gap-3">
          <Music className="h-6 w-6 text-indigo-400" />
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-indigo-400">Sonic</span> Play
          </h1>
          <span className="ml-2 rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            AI 音乐工作室
          </span>

          {/* 视图切换按钮 */}
          <div className="ml-4 flex items-center gap-1 rounded-lg bg-gray-800 p-0.5">
            <button
              onClick={() => setActiveView('staff' as EditorView)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeView === 'staff'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="五线谱编辑器"
            >
              <FileMusic className="h-3.5 w-3.5" />
              <span>五线谱</span>
            </button>
            <button
              onClick={() => setActiveView('waveform' as EditorView)}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeView === 'waveform'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="音轨编辑器"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>音轨编辑器</span>
            </button>
          </div>
        </div>

        {/* 中间：传输控制 */}
        <div className="flex items-center gap-2">
          {/* 项目名称显示 */}
          <div className="mr-2 flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5">
            <span className="max-w-[120px] truncate text-sm font-medium text-gray-200">
              {project.name}
            </span>
            {getSyncIcon() && (
              <div className="flex items-center gap-1" title={getSyncText()}>
                {getSyncIcon()}
              </div>
            )}
          </div>

          {/* 速度控制 */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5">
            <label className="text-xs text-gray-400">速度</label>
            <input
              type="number"
              min={20}
              max={300}
              value={project.tempo}
              onChange={(e) => updateTempo(Number(e.target.value))}
              className="w-14 bg-transparent text-center text-sm font-medium text-gray-100 outline-none"
            />
            <span className="text-xs text-gray-500">BPM</span>
          </div>

          {/* 播放控制按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePlayPause}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500"
              title={playbackState === 'playing' ? '暂停' : '播放'}
            >
              {playbackState === 'playing' ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleStop}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-700 text-gray-300 transition-colors hover:bg-gray-600"
              title="停止"
            >
              <Square className="h-4 w-4" />
            </button>
          </div>

          {/* 拍号显示 */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5">
            <span className="text-sm font-medium text-gray-100">
              {project.timeSignatureNumerator}/{project.timeSignatureDenominator}
            </span>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={handleSave}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700"
            title={status === 'authenticated' ? '保存项目' : '登录以保存'}
          >
            <Save className="h-4 w-4" />
          </button>
        </div>

        {/* 右侧：功能按钮 + 用户信息 */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAIPanel}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              isAIPanelOpen
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="AI 助手"
          >
            <Brain className="h-4 w-4" />
            <span>AI</span>
          </button>
          <button
            onClick={toggleRecordingPanel}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              isRecordingPanelOpen
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title="录音"
          >
            <Mic className="h-4 w-4" />
            <span>录音</span>
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-800 text-gray-300 transition-colors hover:bg-gray-700"
            title="设置"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* 用户菜单分隔线 */}
          <div className="mx-1 h-6 w-px bg-gray-700" />

          {/* 用户信息 / 登录按钮 */}
          {status === 'authenticated' && user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 rounded-lg bg-gray-800 px-2 py-1.5 transition-colors hover:bg-gray-700"
              >
                {/* 用户头像 */}
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.display_name || user.email || '用户'}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
                {/* 用户名称 */}
                <span className="max-w-[100px] truncate text-sm text-gray-200">
                  {profile?.display_name || user.email?.split('@')[0] || '用户'}
                </span>
              </button>

              {/* 用户下拉菜单 */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-700 bg-gray-800 py-2 shadow-xl">
                  {/* 用户信息 */}
                  <div className="border-b border-gray-700 px-4 py-3">
                    <p className="truncate text-sm font-medium text-gray-200">
                      {profile?.display_name || user.email?.split('@')[0]}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                    {profile?.account_type && (
                      <span
                        className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${
                          profile.account_type === 'pro'
                            ? 'bg-purple-500/20 text-purple-400'
                            : profile.account_type === 'enterprise'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {profile.account_type === 'pro'
                          ? 'Pro'
                          : profile.account_type === 'enterprise'
                            ? '企业版'
                            : '免费版'}
                      </span>
                    )}
                  </div>

                  {/* 菜单项 */}
                  <button
                    onClick={() => {
                      // TODO: 打开个人资料设置
                      setIsUserMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-gray-700"
                  >
                    <User className="h-4 w-4" />
                    个人资料
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-400 transition-colors hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              登录
            </button>
          )}
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex flex-1 overflow-hidden">{children}</main>

      {/* 点击外部关闭用户菜单 */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}

      {/* 认证弹窗 */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  )
}
