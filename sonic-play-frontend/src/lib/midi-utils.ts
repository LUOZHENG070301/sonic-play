/**
 * Sonic Play - MIDI 工具函数
 * 提供 MIDI 编号与音符名称之间的转换功能
 */
import Midi from '@tonaljs/midi'
import type { NoteDuration } from '@/types'

/** 音符时值对应的 MIDI tick 数（基于 960 PPQ） */
export const DURATION_TICKS: Record<NoteDuration, number> = {
  whole: 960 * 4,
  half: 960 * 2,
  quarter: 960,
  eighth: 960 / 2,
  sixteenth: 960 / 4,
  'thirty-second': 960 / 8,
}

/** 音符时值对应的 Tone.js 时值字符串 */
export const DURATION_TO_TONE: Record<NoteDuration, string> = {
  whole: '1n',
  half: '2n',
  quarter: '4n',
  eighth: '8n',
  sixteenth: '16n',
  'thirty-second': '32n',
}

/** 所有音符名称 */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * 将 MIDI 编号转换为音符名称
 * @param midiNumber MIDI 编号 (0-127)
 * @returns 音符名称，如 "C4", "A#3"
 */
export function midiToNoteName(midiNumber: number): string {
  const midiInfo = Midi.midiToNoteName(midiNumber)
  return midiInfo
}

/**
 * 将音符名称转换为 MIDI 编号
 * @param noteName 音符名称，如 "C4", "A#3"
 * @returns MIDI 编号 (0-127)
 */
export function noteNameToMidi(noteName: string): number {
  const midiInfo = Midi.toMidi(noteName)
  if (midiInfo === null) {
    throw new Error(`无效的音符名称: ${noteName}`)
  }
  return midiInfo
}

/**
 * 获取音符的频率（Hz）
 * @param midiNumber MIDI 编号
 * @returns 频率值
 */
export function midiToFrequency(midiNumber: number): number {
  return 440 * Math.pow(2, (midiNumber - 69) / 12)
}

/**
 * 将频率转换为 MIDI 编号
 * @param frequency 频率值（Hz）
 * @returns MIDI 编号
 */
export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440)
}

/**
 * 获取 MIDI 编号对应的音名（不含八度）
 * @param midiNumber MIDI 编号
 * @returns 音名，如 "C", "A#"
 */
export function getNoteName(midiNumber: number): string {
  return NOTE_NAMES[midiNumber % 12]
}

/**
 * 获取 MIDI 编号对应的八度
 * @param midiNumber MIDI 编号
 * @returns 八度数
 */
export function getOctave(midiNumber: number): number {
  return Math.floor(midiNumber / 12) - 1
}

/**
 * 判断 MIDI 编号是否为升号音符
 * @param midiNumber MIDI 编号
 * @returns 是否为升号
 */
export function isSharp(midiNumber: number): boolean {
  const noteName = getNoteName(midiNumber)
  return noteName.includes('#')
}

/**
 * 将拍数转换为秒数
 * @param beats 拍数
 * @param bpm 速度（BPM）
 * @returns 秒数
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm
}

/**
 * 将秒数转换为拍数
 * @param seconds 秒数
 * @param bpm 速度（BPM）
 * @returns 拍数
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60
}

/**
 * 将音符时值转换为秒数
 * @param duration 音符时值
 * @param bpm 速度（BPM）
 * @returns 秒数
 */
export function durationToSeconds(duration: NoteDuration, bpm: number): number {
  const beatsMap: Record<NoteDuration, number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 0.5,
    sixteenth: 0.25,
    'thirty-second': 0.125,
  }
  return beatsToSeconds(beatsMap[duration], bpm)
}

/**
 * 量化音符到最近的网格位置
 * @param beat 原始拍位置
 * @param gridSize 网格大小（拍为单位）
 * @returns 量化后的拍位置
 */
export function quantizeBeat(beat: number, gridSize: number): number {
  return Math.round(beat / gridSize) * gridSize
}

/**
 * 生成指定范围内的所有 MIDI 编号
 * @param startMidi 起始 MIDI 编号
 * @param endMidi 结束 MIDI 编号
 * @returns MIDI 编号数组
 */
export function getMidiRange(startMidi: number, endMidi: number): number[] {
  const start = Math.max(0, Math.min(startMidi, endMidi))
  const end = Math.min(127, Math.max(startMidi, endMidi))
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}
