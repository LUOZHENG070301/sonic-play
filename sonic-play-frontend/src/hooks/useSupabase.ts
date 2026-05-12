/**
 * Sonic Play - Supabase 操作 Hook
 * 封装常用的 Supabase 数据库操作
 */
import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ProjectRow, TrackRow, MeasureRow, NoteRow } from '@/lib/supabase-types'

/**
 * Supabase 查询结果接口
 */
interface QueryResult<T> {
  /** 查询数据 */
  data: T | null
  /** 错误信息 */
  error: Error | null
  /** 是否正在加载 */
  isLoading: boolean
}

/**
 * 使用 Supabase 查询的 Hook
 * 提供类型化的数据库查询功能
 * 
 * @example
 * ```typescript
 * const { data, error, isLoading, execute } = useSupabaseQuery<ProjectRow[]>()
 * 
 * useEffect(() => {
 *   execute(async () => {
 *     const { data, error } = await supabase.from('projects').select('*')
 *     return { data, error }
 *   })
 * }, [])
 * ```
 */
export function useSupabaseQuery<T>() {
  const [result, setResult] = useState<QueryResult<T>>({
    data: null,
    error: null,
    isLoading: false,
  })

  /**
   * 执行查询
   * @param queryFn - 返回 Supabase 查询的函数
   */
  const execute = useCallback(async (
    queryFn: () => Promise<{ data: T | null; error: { message: string } | null }>
  ) => {
    setResult((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const { data, error } = await queryFn()

      if (error) {
        throw new Error(error.message)
      }

      setResult({ data, error: null, isLoading: false })
      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知错误')
      setResult({ data: null, error, isLoading: false })
      return null
    }
  }, [])

  /**
   * 重置查询状态
   */
  const reset = useCallback(() => {
    setResult({ data: null, error: null, isLoading: false })
  }, [])

  return { ...result, execute, reset }
}

/**
 * 使用用户项目列表的 Hook
 * 自动加载当前用户的所有项目
 */
export function useUserProjects() {
  const { user } = useAuthStore()
  const { data, error, isLoading, execute } = useSupabaseQuery<ProjectRow[]>()

  /**
   * 加载用户项目列表
   */
  const loadProjects = useCallback(async () => {
    if (!user) {
      return
    }

    await execute(async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      return { data, error }
    })
  }, [user, execute])

  return {
    projects: data || [],
    error,
    isLoading,
    loadProjects,
  }
}

/**
 * 使用项目详情的 Hook
 * 加载指定项目的完整信息，包括音轨、小节和音符
 */
export function useProjectDetails() {
  const { user } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * 加载项目详情
   * @param projectId - 项目 ID
   */
  const loadProjectDetails = useCallback(async (projectId: string) => {
    if (!user) {
      setError(new Error('用户未登录'))
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // 加载项目基本信息
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (projectError) {
        throw new Error(projectError.message)
      }

      // 加载音轨
      const { data: tracks, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_index', { ascending: true })

      if (tracksError) {
        throw new Error(tracksError.message)
      }

      // 加载小节
      const trackIds = (tracks as TrackRow[])?.map((t) => t.id) || []
      const { data: measures, error: measuresError } = await supabase
        .from('measures')
        .select('*')
        .in('track_id', trackIds)
        .order('index', { ascending: true })

      if (measuresError) {
        throw new Error(measuresError.message)
      }

      // 加载音符
      const measureIds = (measures as MeasureRow[])?.map((m) => m.id) || []
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('measure_id', measureIds)

      if (notesError) {
        throw new Error(notesError.message)
      }

      setIsLoading(false)

      return {
        project: project as ProjectRow,
        tracks: (tracks || []) as TrackRow[],
        measures: (measures || []) as MeasureRow[],
        notes: (notes || []) as NoteRow[],
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知错误')
      setError(error)
      setIsLoading(false)
      return null
    }
  }, [user])

  return { loadProjectDetails, isLoading, error }
}

/**
 * 使用项目保存的 Hook
 * 提供保存项目到 Supabase 的功能
 */
export function useSaveProject() {
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * 保存项目
   * @param project - 项目数据
   * @param tracks - 音轨数据
   * @param measures - 小节数据
   * @param notes - 音符数据
   */
  const saveProject = useCallback(async (
    project: ProjectRow,
    tracks: TrackRow[],
    measures: MeasureRow[],
    notes: NoteRow[]
  ) => {
    if (!user) {
      setError(new Error('用户未登录'))
      return false
    }

    setIsSaving(true)
    setError(null)

    try {
      // 保存项目
      const { error: projectError } = await supabase
        .from('projects')
        .upsert({ ...project, user_id: user.id })

      if (projectError) {
        throw new Error(projectError.message)
      }

      // 保存音轨
      for (const track of tracks) {
        const { error: trackError } = await supabase
          .from('tracks')
          .upsert({ ...track, project_id: project.id })

        if (trackError) {
          throw new Error(trackError.message)
        }
      }

      // 保存小节
      for (const measure of measures) {
        const { error: measureError } = await supabase
          .from('measures')
          .upsert(measure)

        if (measureError) {
          throw new Error(measureError.message)
        }
      }

      // 保存音符
      for (const note of notes) {
        const { error: noteError } = await supabase
          .from('notes')
          .upsert(note)

        if (noteError) {
          throw new Error(noteError.message)
        }
      }

      setIsSaving(false)
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知错误')
      setError(error)
      setIsSaving(false)
      return false
    }
  }, [user])

  return { saveProject, isSaving, error }
}

/**
 * 使用项目删除的 Hook
 * 提供删除项目的功能
 */
export function useDeleteProject() {
  const { user } = useAuthStore()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * 删除项目
   * @param projectId - 项目 ID
   */
  const deleteProject = useCallback(async (projectId: string) => {
    if (!user) {
      setError(new Error('用户未登录'))
      return false
    }

    setIsDeleting(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id)

      if (error) {
        throw new Error(error.message)
      }

      setIsDeleting(false)
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('未知错误')
      setError(error)
      setIsDeleting(false)
      return false
    }
  }, [user])

  return { deleteProject, isDeleting, error }
}

/**
 * 使用用户资料的 Hook
 * 获取和更新当前用户的资料信息
 */
export function useUserProfile() {
  const { user, profile, refreshProfile, updateProfile } = useAuthStore()

  return {
    user,
    profile,
    refreshProfile,
    updateProfile,
    isAuthenticated: !!user,
  }
}
