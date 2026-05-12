/**
 * Sonic Play - Tone.js 音频引擎封装
 * 提供音频播放、合成器管理、效果器链等功能
 */
import * as Tone from 'tone'

/** 合成器配置接口 */
export interface SynthConfig {
  /** 音色类型 */
  oscillatorType: string
  /** 包络 - 攻击时间 */
  attack: number
  /** 包络 - 衰减时间 */
  decay: number
  /** 包络 - 持续音量 */
  sustain: number
  /** 包络 - 释放时间 */
  release: number
}

/** 默认钢琴音色配置 */
const DEFAULT_SYNTH_CONFIG: SynthConfig = {
  oscillatorType: 'triangle',
  attack: 0.005,
  decay: 0.3,
  sustain: 0.2,
  release: 1.5,
}

/** 音频引擎类 */
export class AudioEngine {
  private static instance: AudioEngine | null = null
  private synths: Map<string, Tone.PolySynth> = new Map()
  private isInitialized = false
  private _isPlaying = false

  /** 获取单例实例 */
  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  /** 私有构造函数 */
  private constructor() {}

  /** 是否已初始化 */
  get initialized(): boolean {
    return this.isInitialized
  }

  /** 是否正在播放 */
  get isPlaying(): boolean {
    return this._isPlaying
  }

  /**
   * 初始化音频上下文
   * 需要在用户交互后调用
   */
  async init(): Promise<void> {
    if (this.isInitialized) return

    await Tone.start()
    this.isInitialized = true
    console.log('[音频引擎] 初始化完成')
  }

  /**
   * 为指定音轨创建合成器
   * @param trackId 音轨 ID
   * @param config 合成器配置
   */
  createSynth(trackId: string, config: Partial<SynthConfig> = {}): void {
    // 如果已存在则先释放
    this.disposeSynth(trackId)

    const mergedConfig = { ...DEFAULT_SYNTH_CONFIG, ...config }
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: mergedConfig.oscillatorType as 'triangle' },
      envelope: {
        attack: mergedConfig.attack,
        decay: mergedConfig.decay,
        sustain: mergedConfig.sustain,
        release: mergedConfig.release,
      },
    })

    // 连接到主输出
    synth.toDestination()
    this.synths.set(trackId, synth)
    console.log(`[音频引擎] 创建合成器: ${trackId}`)
  }

  /**
   * 释放指定音轨的合成器
   * @param trackId 音轨 ID
   */
  disposeSynth(trackId: string): void {
    const synth = this.synths.get(trackId)
    if (synth) {
      synth.releaseAll()
      synth.dispose()
      this.synths.delete(trackId)
      console.log(`[音频引擎] 释放合成器: ${trackId}`)
    }
  }

  /**
   * 播放单个音符
   * @param trackId 音轨 ID
   * @param note 音符名称，如 "C4", "D#5"
   * @param duration 时值，如 "4n" (四分音符), "8n" (八分音符)
   * @param time 开始时间（秒）
   * @param velocity 力度 (0-1)
   */
  playNote(
    trackId: string,
    note: string,
    duration: string = '4n',
    time?: number,
    velocity: number = 0.8
  ): void {
    const synth = this.synths.get(trackId)
    if (!synth) {
      console.warn(`[音频引擎] 未找到合成器: ${trackId}`)
      return
    }

    if (time !== undefined) {
      synth.triggerAttackRelease(note, duration, time, velocity)
    } else {
      synth.triggerAttackRelease(note, duration, Tone.now(), velocity)
    }
  }

  /**
   * 播放一系列音符（序列）
   * @param trackId 音轨 ID
   * @param notes 音符序列，每个元素包含音高、时值和持续时间
   */
  playSequence(
    trackId: string,
    notes: Array<{
      pitch: string
      duration: string
      time: number
      velocity: number
    }>
  ): void {
    const synth = this.synths.get(trackId)
    if (!synth) {
      console.warn(`[音频引擎] 未找到合成器: ${trackId}`)
      return
    }

    const now = Tone.now()
    notes.forEach(({ pitch, duration, time, velocity }) => {
      synth.triggerAttackRelease(pitch, duration, now + time, velocity)
    })

    this._isPlaying = true
  }

  /**
   * 设置音轨音量
   * @param trackId 音轨 ID
   * @param volume 音量 (0-1)
   */
  setVolume(trackId: string, volume: number): void {
    const synth = this.synths.get(trackId)
    if (synth) {
      const db = volume === 0 ? -Infinity : 20 * Math.log10(volume)
      synth.volume.value = db
    }
  }

  /**
   * 设置音轨声像
   * @param trackId 音轨 ID
   * @param pan 声像 (-1 到 1)
   */
  setPan(trackId: string, pan: number): void {
    const synth = this.synths.get(trackId)
    if (synth) {
      // PolySynth 不直接支持 pan，使用 Tone.Pan 创建声像节点
      const panner = new Tone.Panner(pan).toDestination()
      synth.connect(panner)
    }
  }

  /**
   * 停止所有音轨的播放
   */
  stopAll(): void {
    this.synths.forEach((synth) => {
      synth.releaseAll()
    })
    this._isPlaying = false
    console.log('[音频引擎] 已停止所有播放')
  }

  /**
   * 设置主音量
   * @param volume 音量 (0-1)
   */
  setMasterVolume(volume: number): void {
    const db = volume === 0 ? -Infinity : 20 * Math.log10(volume)
    Tone.Destination.volume.value = db
  }

  /**
   * 获取当前 BPM
   */
  getBPM(): number {
    return Tone.getTransport().bpm.value
  }

  /**
   * 设置 BPM
   * @param bpm 速度值
   */
  setBPM(bpm: number): void {
    Tone.getTransport().bpm.value = bpm
  }

  /**
   * 释放所有资源
   */
  dispose(): void {
    this.synths.forEach((synth) => {
      synth.dispose()
    })
    this.synths.clear()
    this.isInitialized = false
    this._isPlaying = false
    AudioEngine.instance = null
    console.log('[音频引擎] 已释放所有资源')
  }
}

/** 导出单例实例 */
export const audioEngine = AudioEngine.getInstance()
