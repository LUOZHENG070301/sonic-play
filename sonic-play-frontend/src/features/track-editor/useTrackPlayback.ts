/**
 * Sonic Play - 音轨播放 Hook
 * 使用 Tone.js Transport 管理多音轨同步播放、播放头位置追踪、循环播放等
 */
import { useRef, useCallback, useEffect } from 'react'
import * as Tone from 'tone'
import { useProjectStore } from '@/stores/projectStore'
import { audioEngine } from '@/lib/audio-engine'
import { DURATION_TO_TONE } from '@/lib/midi-utils'
import type { Track, NoteDuration } from '@/types'

/** 将音符时值转换为 Tone.js Transport 可用的时值字符串 */
function noteDurationToToneValue(duration: NoteDuration): string {
  return DURATION_TO_TONE[duration] ?? '4n'
}

/** 计算项目总时长（秒） */
function calculateTotalDuration(
  totalMeasures: number,
  numerator: number,
  denominator: number,
  bpm: number
): number {
  // 每小节的拍数 = numerator / denominator * 4（以四分音符为一拍）
  const beatsPerMeasure = (numerator / denominator) * 4
  const totalBeats = totalMeasures * beatsPerMeasure
  return (totalBeats * 60) / bpm
}

/** 音轨播放 Hook 返回值接口 */
export interface TrackPlaybackControls {
  /** 播放 */
  play: () => Promise<void>
  /** 暂停 */
  pause: () => void
  /** 停止 */
  stop: () => void
  /** 回到起点 */
  goToStart: () => void
  /** 设置循环播放 */
  setLoop: (enabled: boolean) => void
  /** 是否循环播放中 */
  isLooping: boolean
  /** 设置 BPM */
  setBPM: (bpm: number) => void
  /** 当前播放位置（秒） */
  currentPosition: number
  /** 总时长（秒） */
  totalDuration: number
}

/** 音轨播放 Hook */
export function useTrackPlayback(): TrackPlaybackControls {
  const {
    project,
    playbackState,
    setPlaybackState,
    setCurrentPosition,
    updateTempo,
  } = useProjectStore()

  const isLoopingRef = useRef(false)
  const animationFrameRef = useRef<number>(0)
  const scheduledEventsRef = useRef<number[]>([])
  const synthCreatedRef = useRef<Set<string>>(new Set())

  // 当前播放位置（秒）
  const currentPositionRef = useRef(0)

  /** 获取总时长 */
  const totalDuration = calculateTotalDuration(
    project.totalMeasures,
    project.timeSignatureNumerator,
    project.timeSignatureDenominator,
    project.tempo
  )

  /** 判断音轨是否应该发声（考虑静音和独奏） */
  const isTrackAudible = useCallback(
    (track: Track): boolean => {
      const hasSolo = project.tracks.some((t) => t.isSolo)
      if (hasSolo) {
        return track.isSolo && !track.isMuted
      }
      return !track.isMuted
    },
    [project.tracks]
  )

  /** 为音轨创建合成器（如果尚未创建） */
  const ensureSynth = useCallback((track: Track) => {
    if (!synthCreatedRef.current.has(track.id)) {
      audioEngine.createSynth(track.id)
      audioEngine.setVolume(track.id, track.volume)
      synthCreatedRef.current.add(track.id)
    }
  }, [])

  /** 将音轨的音符调度到 Tone.js Transport */
  const scheduleTrack = useCallback(
    (track: Track) => {
      const beatsPerMeasure =
        (project.timeSignatureNumerator / project.timeSignatureDenominator) * 4

      // 遍历每个小节的每个音符
      for (const measure of track.measures) {
        const measureStartBeat = measure.index * beatsPerMeasure

        for (const note of measure.notes) {
          if (note.isRest) continue

          const startBeat = measureStartBeat + note.startBeat
          const durationStr = noteDurationToToneValue(note.duration)
          const velocity = note.velocity / 127

          // 使用 Transport 调度音符播放
          const event = Tone.getTransport().schedule((time) => {
            if (!isTrackAudible(track)) return
            audioEngine.playNote(track.id, note.pitch, durationStr, time, velocity)
          }, `${startBeat}m`)

          scheduledEventsRef.current.push(event)
        }
      }
    },
    [project.timeSignatureNumerator, project.timeSignatureDenominator, isTrackAudible]
  )

  /** 清除所有已调度的事件 */
  const clearScheduledEvents = useCallback(() => {
    for (const event of scheduledEventsRef.current) {
      Tone.getTransport().clear(event)
    }
    scheduledEventsRef.current = []
  }, [])

  /** 播放 */
  const play = useCallback(async () => {
    // 确保 Tone.js 音频上下文已启动
    await audioEngine.init()

    // 设置 BPM
    Tone.getTransport().bpm.value = project.tempo

    // 清除之前的调度
    clearScheduledEvents()

    // 为每个音轨创建合成器并调度音符
    for (const track of project.tracks) {
      ensureSynth(track)
      scheduleTrack(track)
    }

    // 启动 Transport
    Tone.getTransport().start()
    setPlaybackState('playing')
  }, [project, clearScheduledEvents, ensureSynth, scheduleTrack, setPlaybackState])

  /** 暂停 */
  const pause = useCallback(() => {
    Tone.getTransport().pause()
    setPlaybackState('paused')
  }, [setPlaybackState])

  /** 停止 */
  const stop = useCallback(() => {
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
    audioEngine.stopAll()
    clearScheduledEvents()
    currentPositionRef.current = 0
    setCurrentPosition(0, 0)
    setPlaybackState('stopped')
  }, [clearScheduledEvents, setCurrentPosition, setPlaybackState])

  /** 回到起点 */
  const goToStart = useCallback(() => {
    const wasPlaying = playbackState === 'playing'
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
    audioEngine.stopAll()
    clearScheduledEvents()
    currentPositionRef.current = 0
    setCurrentPosition(0, 0)

    if (wasPlaying) {
      // 重新开始播放
      play()
    }
  }, [playbackState, clearScheduledEvents, setCurrentPosition, play])

  /** 设置循环播放 */
  const setLoop = useCallback(
    (enabled: boolean) => {
      isLoopingRef.current = enabled
      if (enabled) {
        Tone.getTransport().loop = true
        Tone.getTransport().loopStart = 0
        Tone.getTransport().loopEnd = `${project.totalMeasures}m`
      } else {
        Tone.getTransport().loop = false
      }
    },
    [project.totalMeasures]
  )

  /** 设置 BPM */
  const setBPM = useCallback(
    (bpm: number) => {
      const clampedBpm = Math.max(20, Math.min(300, bpm))
      Tone.getTransport().bpm.value = clampedBpm
      updateTempo(clampedBpm)
    },
    [updateTempo]
  )

  /** 使用 requestAnimationFrame 追踪播放头位置 */
  useEffect(() => {
    if (playbackState !== 'playing') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = 0
      }
      return
    }

    const updatePosition = () => {
      const seconds = Tone.getTransport().seconds
      currentPositionRef.current = seconds

      // 将秒数转换为小节和拍
      const beatsPerMeasure =
        (project.timeSignatureNumerator / project.timeSignatureDenominator) * 4
      const beatsPerSecond = project.tempo / 60
      const totalBeats = seconds * beatsPerSecond
      const measure = Math.floor(totalBeats / beatsPerMeasure)
      const beat = totalBeats % beatsPerMeasure

      setCurrentPosition(
        Math.min(measure, project.totalMeasures - 1),
        beat
      )

      animationFrameRef.current = requestAnimationFrame(updatePosition)
    }

    animationFrameRef.current = requestAnimationFrame(updatePosition)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = 0
      }
    }
  }, [playbackState, project.tempo, project.timeSignatureNumerator, project.timeSignatureDenominator, project.totalMeasures, setCurrentPosition])

  /** 同步音轨音量变化 */
  useEffect(() => {
    for (const track of project.tracks) {
      if (synthCreatedRef.current.has(track.id)) {
        audioEngine.setVolume(track.id, track.volume)
      }
    }
  }, [project.tracks])

  /** 组件卸载时清理资源 */
  useEffect(() => {
    return () => {
      clearScheduledEvents()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [clearScheduledEvents])

  return {
    play,
    pause,
    stop,
    goToStart,
    setLoop,
    isLooping: isLoopingRef.current,
    setBPM,
    currentPosition: currentPositionRef.current,
    totalDuration,
  }
}
