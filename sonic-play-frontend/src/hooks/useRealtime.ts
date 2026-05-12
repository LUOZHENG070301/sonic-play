/**
 * Sonic Play - 实时订阅 Hook
 * 使用 Supabase Realtime 订阅数据库变化
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { DatabaseTable } from '@/lib/supabase-types'

/**
 * 实时变化回调函数类型
 */
type ChangeCallback<T extends Record<string, unknown> = Record<string, unknown>> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
}) => void

/**
 * 使用实时订阅的 Hook
 * 订阅指定表的实时变化
 * 
 * @example
 * ```typescript
 * useRealtime('projects', (payload) => {
 *   console.log('项目变化:', payload)
 * })
 * ```
 */
export function useRealtime<T extends Record<string, unknown> = Record<string, unknown>>(
  table: DatabaseTable,
  callback: ChangeCallback<T>,
  options?: {
    /** 事件类型过滤 */
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
    /** 是否启用订阅 */
    enabled?: boolean
  }
) {
  const { user } = useAuthStore()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const event = options?.event || '*'
  const enabled = options?.enabled !== false && !!user

  useEffect(() => {
    if (!enabled) {
      return
    }

    // 创建实时频道
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes' as const,
        {
          event,
          schema: 'public',
          table,
        },
        callback as ChangeCallback<Record<string, unknown>>
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} 订阅状态:`, status)
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    // 清理函数
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setIsSubscribed(false)
      }
    }
  }, [table, event, enabled, callback])

  return { isSubscribed }
}

/**
 * 使用项目实时同步的 Hook
 * 订阅当前项目的实时变化
 */
export function useProjectRealtime(
  projectId: string | null,
  callbacks?: {
    onProjectChange?: (payload: { eventType: string; new: unknown; old: unknown }) => void
    onTrackChange?: (payload: { eventType: string; new: unknown; old: unknown }) => void
    onMeasureChange?: (payload: { eventType: string; new: unknown; old: unknown }) => void
    onNoteChange?: (payload: { eventType: string; new: unknown; old: unknown }) => void
  }
) {
  const { user } = useAuthStore()
  const channelsRef = useRef<RealtimeChannel[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!projectId || !user) {
      return
    }

    // 清理之前的频道
    channelsRef.current.forEach((channel) => {
      supabase.removeChannel(channel)
    })
    channelsRef.current = []

    // 订阅项目变化
    if (callbacks?.onProjectChange) {
      const projectChannel = supabase
        .channel(`project:${projectId}`)
        .on(
          'postgres_changes' as const,
          {
            event: '*',
            schema: 'public',
            table: 'projects',
            filter: `id=eq.${projectId}`,
          },
          callbacks.onProjectChange as (payload: { eventType: string; new: unknown; old: unknown }) => void
        )
        .subscribe()

      channelsRef.current.push(projectChannel)
    }

    // 订阅音轨变化
    if (callbacks?.onTrackChange) {
      const trackChannel = supabase
        .channel(`tracks:${projectId}`)
        .on(
          'postgres_changes' as const,
          {
            event: '*',
            schema: 'public',
            table: 'tracks',
            filter: `project_id=eq.${projectId}`,
          },
          callbacks.onTrackChange as (payload: { eventType: string; new: unknown; old: unknown }) => void
        )
        .subscribe()

      channelsRef.current.push(trackChannel)
    }

    // 设置连接状态
    setIsConnected(true)

    // 清理函数
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
      setIsConnected(false)
    }
  }, [projectId, user, callbacks])

  return { isConnected }
}

/**
 * 使用用户项目列表实时更新的 Hook
 * 当用户的项目发生变化时自动刷新
 */
export function useUserProjectsRealtime(
  onChange?: () => void,
  options?: { enabled?: boolean }
) {
  const { user } = useAuthStore()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const enabled = options?.enabled !== false && !!user

  useEffect(() => {
    if (!enabled || !user) {
      return
    }

    const channel = supabase
      .channel(`user_projects:${user.id}`)
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { eventType: string; new: unknown; old: unknown }) => {
          console.log('[Realtime] 项目列表变化:', payload)
          onChange?.()
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        setIsSubscribed(false)
      }
    }
  }, [user, enabled, onChange])

  return { isSubscribed }
}

/**
 * 使用实时协作的 Hook
 * 用于多人协作编辑时的光标和选择同步
 */
export function useRealtimeCollaboration(
  projectId: string | null,
  userId: string,
  callbacks?: {
    onCursorMove?: (userId: string, position: { x: number; y: number }) => void
    onSelectionChange?: (userId: string, selection: unknown) => void
    onUserJoin?: (userId: string) => void
    onUserLeave?: (userId: string) => void
  }
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [presenceState, setPresenceState] = useState<Record<string, unknown>>({})

  /**
   * 广播光标位置
   */
  const broadcastCursor = useCallback((position: { x: number; y: number }) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: { userId, position },
      })
    }
  }, [userId])

  /**
   * 广播选择变化
   */
  const broadcastSelection = useCallback((selection: unknown) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'selection_change',
        payload: { userId, selection },
      })
    }
  }, [userId])

  useEffect(() => {
    if (!projectId) {
      return
    }

    const channel = supabase.channel(`collaboration:${projectId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    // 监听广播消息
    channel
      .on('broadcast', { event: 'cursor_move' }, ({ payload }: { payload: { userId: string; position: { x: number; y: number } } }) => {
        if (payload.userId !== userId) {
          callbacks?.onCursorMove?.(payload.userId, payload.position)
        }
      })
      .on('broadcast', { event: 'selection_change' }, ({ payload }: { payload: { userId: string; selection: unknown } }) => {
        if (payload.userId !== userId) {
          callbacks?.onSelectionChange?.(payload.userId, payload.selection)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setPresenceState(state)
      })
      .on('presence', { event: 'join' }, ({ key }: { key: string }) => {
        if (key !== userId) {
          callbacks?.onUserJoin?.(key)
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: { key: string }) => {
        if (key !== userId) {
          callbacks?.onUserLeave?.(key)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, online_at: new Date().toISOString() })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [projectId, userId, callbacks])

  return {
    broadcastCursor,
    broadcastSelection,
    presenceState,
    onlineUsers: Object.keys(presenceState),
  }
}

/**
 * 使用自动保存的 Hook
 * 在项目发生变化时自动保存到 Supabase
 */
export function useAutoSave(
  saveFn: () => Promise<void>,
  options?: {
    /** 延迟时间（毫秒） */
    delay?: number
    /** 是否启用自动保存 */
    enabled?: boolean
    /** 依赖项数组，变化时触发保存 */
    deps?: unknown[]
  }
) {
  const { user } = useAuthStore()
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const delay = options?.delay || 3000
  const enabled = options?.enabled !== false && !!user
  const deps = options?.deps || []

  useEffect(() => {
    if (!enabled) {
      return
    }

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 设置新的定时器
    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await saveFn()
        setLastSavedAt(new Date())
      } catch (error) {
        console.error('[AutoSave] 自动保存失败:', error)
      } finally {
        setIsSaving(false)
      }
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, delay, saveFn, ...deps])

  return { lastSavedAt, isSaving }
}
