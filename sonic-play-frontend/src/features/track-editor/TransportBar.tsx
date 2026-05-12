/**
 * Sonic Play - 传输控制栏
 * 提供播放/暂停/停止/回到起点/循环/BPM 调节/时间显示/录制等控制
 * 采用 Duolingo 风格的圆润按钮样式
 */
import { useCallback } from 'react'
import { Play, Pause, Square, SkipBack, Repeat, Mic } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import type { TrackPlaybackControls } from './useTrackPlayback'

/** TransportBar 组件属性 */
interface TransportBarProps {
  /** 播放控制方法 */
  playback: TrackPlaybackControls
}

/** 将秒数格式化为 mm:ss */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/** 传输控制栏组件 */
export default function TransportBar({ playback }: TransportBarProps) {
  const { project, playbackState, setPlaybackState } = useProjectStore()

  /** 处理播放/暂停切换 */
  const handlePlayPause = useCallback(async () => {
    if (playbackState === 'playing') {
      playback.pause()
      setPlaybackState('paused')
    } else {
      await playback.play()
    }
  }, [playback, playbackState, setPlaybackState])

  /** 处理停止 */
  const handleStop = useCallback(() => {
    playback.stop()
    setPlaybackState('stopped')
  }, [playback, setPlaybackState])

  /** 处理回到起点 */
  const handleGoToStart = useCallback(() => {
    playback.goToStart()
  }, [playback])

  /** 处理循环切换 */
  const handleToggleLoop = useCallback(() => {
    playback.setLoop(!playback.isLooping)
  }, [playback])

  /** BPM 增加 */
  const handleBpmUp = useCallback(() => {
    playback.setBPM(project.tempo + 1)
  }, [playback, project.tempo])

  /** BPM 减少 */
  const handleBpmDown = useCallback(() => {
    playback.setBPM(project.tempo - 1)
  }, [playback, project.tempo])

  /** 处理录制按钮 */
  const handleRecord = useCallback(() => {
    if (playbackState === 'recording') {
      setPlaybackState('stopped')
    } else {
      setPlaybackState('recording')
    }
  }, [playbackState, setPlaybackState])

  const isPlaying = playbackState === 'playing'
  const isRecording = playbackState === 'recording'

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-t border-gray-700/50 bg-[#0f0f23] px-4">
      {/* 左侧：传输控制按钮 */}
      <div className="flex items-center gap-2">
        {/* 回到起点按钮 */}
        <button
          onClick={handleGoToStart}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-all hover:bg-gray-700 hover:text-white active:scale-95"
          title="回到起点"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        {/* 播放/暂停按钮 */}
        <button
          onClick={handlePlayPause}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-all active:scale-95 ${
            isPlaying
              ? 'bg-indigo-500 hover:bg-indigo-400'
              : 'bg-green-500 hover:bg-green-400'
          }`}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-0.5" />
          )}
        </button>

        {/* 停止按钮 */}
        <button
          onClick={handleStop}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-gray-300 transition-all hover:bg-gray-700 hover:text-white active:scale-95"
          title="停止"
        >
          <Square className="h-4 w-4" />
        </button>

        {/* 循环按钮 */}
        <button
          onClick={handleToggleLoop}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 ${
            playback.isLooping
              ? 'bg-indigo-500 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
          title={playback.isLooping ? '关闭循环' : '开启循环'}
        >
          <Repeat className="h-4 w-4" />
        </button>

        {/* 录制按钮 */}
        <button
          onClick={handleRecord}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-95 ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-800 text-red-400 hover:bg-red-500/20 hover:text-red-300'
          }`}
          title={isRecording ? '停止录制' : '录制'}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>

      {/* 中间：时间显示 */}
      <div className="flex items-center gap-2 rounded-full bg-gray-800/80 px-4 py-1.5">
        <span className="font-mono text-sm font-medium text-white">
          {formatTime(playback.currentPosition)}
        </span>
        <span className="text-xs text-gray-500">/</span>
        <span className="font-mono text-sm text-gray-400">
          {formatTime(playback.totalDuration)}
        </span>
      </div>

      {/* 右侧：BPM 控制 */}
      <div className="flex items-center gap-1.5 rounded-full bg-gray-800/80 px-3 py-1.5">
        <span className="text-xs text-gray-400">BPM</span>
        <button
          onClick={handleBpmDown}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-gray-300 text-sm transition-colors hover:bg-gray-600 hover:text-white active:scale-95"
        >
          -
        </button>
        <span className="w-8 text-center font-mono text-sm font-medium text-white">
          {project.tempo}
        </span>
        <button
          onClick={handleBpmUp}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-gray-300 text-sm transition-colors hover:bg-gray-600 hover:text-white active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  )
}
