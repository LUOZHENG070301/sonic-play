/**
 * Sonic Play - 单个音轨组件
 * 显示音轨名称、类型图标、音量/声像控制、静音/独奏按钮、颜色标识条
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Volume2 } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useEditorStore } from '@/stores/editorStore'
import type { Track, InstrumentType } from '@/types'

/** 乐器类型到图标的映射 */
const INSTRUMENT_ICONS: Record<InstrumentType, string> = {
  piano: '\uD83C\uDFB9',   // 🎹
  guitar: '\uD83C\uDFB8',  // 🎸
  bass: '\uD83C\uDFB8',    // 🎸
  drums: '\uD83E\uDD41',   // 🥁
  violin: '\uD83C\uDFBB',  // 🎻
  flute: '\uD83C\uDFB5',   // 🎵
  synth: '\uD83C\uDFB9',   // 🎛️
  custom: '\uD83C\uDFB5',  // 🎵
}

/** TrackItem 组件属性 */
interface TrackItemProps {
  /** 音轨数据 */
  track: Track
  /** 音轨高度（像素） */
  height: number
}

/** 单个音轨组件 */
export default function TrackItem({ track, height }: TrackItemProps) {
  const { updateTrack, toggleMute, toggleSolo } = useProjectStore()
  const { selectedTrackId, selectTrack } = useEditorStore()

  // 是否正在编辑音轨名称
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(track.name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // 选中状态
  const isSelected = selectedTrackId === track.id

  // 音量 UI 值（store 中 0-1，UI 显示 0-200）
  const uiVolume = Math.round(track.volume * 200)

  // 声像 UI 值（store 中 -1 到 1，UI 显示 -100 到 +100）
  const uiPan = Math.round(track.pan * 100)

  // 双击进入编辑模式
  const handleDoubleClickName = useCallback(() => {
    setIsEditingName(true)
    setEditName(track.name)
  }, [track.name])

  // 编辑名称时自动聚焦
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  // 确认名称编辑
  const confirmNameEdit = useCallback(() => {
    setIsEditingName(false)
    if (editName.trim()) {
      updateTrack(track.id, { name: editName.trim() })
    }
  }, [editName, track.id, updateTrack])

  // 处理音量变化
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value)
      // UI 值 0-200 映射到 store 值 0-1
      updateTrack(track.id, { volume: val / 200 })
    },
    [track.id, updateTrack]
  )

  // 处理声像变化
  const handlePanChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value)
      // UI 值 -100 到 +100 映射到 store 值 -1 到 1
      updateTrack(track.id, { pan: val / 100 })
    },
    [track.id, updateTrack]
  )

  // 处理键盘事件（回车确认、Esc 取消）
  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        confirmNameEdit()
      } else if (e.key === 'Escape') {
        setIsEditingName(false)
        setEditName(track.name)
      }
    },
    [confirmNameEdit, track.name]
  )

  return (
    <div
      className={`flex items-stretch border-b border-gray-700/50 transition-colors ${
        isSelected ? 'bg-[#1a1a2e]/90' : 'bg-[#1a1a2e]'
      }`}
      style={{ height }}
      onClick={() => selectTrack(track.id)}
    >
      {/* 左侧颜色标识条 */}
      <div
        className="w-1 shrink-0 rounded-l"
        style={{ backgroundColor: track.color }}
      />

      {/* 音轨信息区域 */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-1.5 pl-2 pr-1">
        {/* 上半部分：名称和图标 */}
        <div className="flex items-center gap-1.5">
          {/* 乐器图标 */}
          <span className="text-sm" title={track.instrument}>
            {INSTRUMENT_ICONS[track.instrument]}
          </span>

          {/* 音轨名称 */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={confirmNameEdit}
              onKeyDown={handleNameKeyDown}
              className="min-w-0 flex-1 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white outline-none ring-1 ring-indigo-500"
              maxLength={32}
            />
          ) : (
            <span
              className="min-w-0 flex-1 cursor-pointer truncate text-xs font-medium text-gray-200"
              onDoubleClick={handleDoubleClickName}
              title="双击编辑名称"
            >
              {track.name}
            </span>
          )}
        </div>

        {/* 下半部分：音量和声像控制 */}
        <div className="flex items-center gap-2">
          {/* 音量控制 */}
          <div className="flex items-center gap-1">
            <Volume2 className="h-3 w-3 shrink-0 text-gray-400" />
            <input
              type="range"
              min={0}
              max={200}
              value={uiVolume}
              onChange={handleVolumeChange}
              className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-gray-600 accent-indigo-500"
              title={`音量: ${uiVolume}%`}
            />
            <span className="w-7 text-right text-[10px] text-gray-500">
              {uiVolume}%
            </span>
          </div>

          {/* 声像控制 */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500">P</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={uiPan}
              onChange={handlePanChange}
              className="h-1 w-10 cursor-pointer appearance-none rounded-full bg-gray-600 accent-indigo-500"
              title={`声像: ${uiPan > 0 ? '+' : ''}${uiPan}`}
            />
            <span className="w-6 text-right text-[10px] text-gray-500">
              {uiPan > 0 ? '+' : ''}
              {uiPan}
            </span>
          </div>
        </div>
      </div>

      {/* 右侧：Mute / Solo 按钮 */}
      <div className="flex shrink-0 items-center gap-0.5 px-1.5">
        {/* Mute 按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleMute(track.id)
          }}
          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold transition-colors ${
            track.isMuted
              ? 'bg-gray-500 text-gray-900'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title={track.isMuted ? '取消静音' : '静音'}
        >
          M
        </button>

        {/* Solo 按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleSolo(track.id)
          }}
          className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold transition-colors ${
            track.isSolo
              ? 'bg-[#ffc800] text-gray-900'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
          title={track.isSolo ? '取消独奏' : '独奏'}
        >
          S
        </button>
      </div>
    </div>
  )
}
