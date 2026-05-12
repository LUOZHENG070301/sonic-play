/**
 * Sonic Play - VexFlow 五线谱渲染工具
 * 封装 VexFlow 的 Factory、Stave、Voice、Formatter
 * 将 Note[] 数据转换为 VexFlow.StaveNote 并渲染到 SVG 画布
 */
import {
  Factory,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
  BarlineType,
  VoiceMode,
  type Stave,
} from 'vexflow'
import type { Note, NoteDuration, Measure } from '@/types'

/** 五线谱渲染配置 */
export interface StaffRendererConfig {
  /** 渲染容器元素 ID */
  elementId: string
  /** 画布宽度 */
  width: number
  /** 画布高度 */
  height: number
  /** 每小节宽度（像素） */
  measureWidth: number
  /** 谱号类型：treble（高音）或 bass（低音） */
  clef: 'treble' | 'bass'
  /** 起始小节索引 */
  startMeasure: number
  /** 结束小节索引（包含） */
  endMeasure: number
  /** 拍号分子 */
  numerator: number
  /** 拍号分母 */
  denominator: number
  /** 调号（0=C大调, 1=G大调, -1=F大调...） */
  keySignature: number
}

/** 音符时值到 VexFlow 时值字符串的映射 */
const DURATION_TO_VEX: Record<NoteDuration, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  sixteenth: '16',
  'thirty-second': '32',
}

/** 调号数值到 VexFlow 调号字符串的映射 */
const KEY_TO_VEX: Record<number, string> = {
  '-7': 'Cb',
  '-6': 'Gb',
  '-5': 'Db',
  '-4': 'Ab',
  '-3': 'Eb',
  '-2': 'Bb',
  '-1': 'F',
  0: 'C',
  1: 'G',
  2: 'D',
  3: 'A',
  4: 'E',
  5: 'B',
  6: 'F#',
  7: 'C#',
}

/** 升降号到 VexFlow 升降号类型的映射 */
const ACCIDENTAL_TO_VEX: Record<string, string> = {
  sharp: '#',
  flat: 'b',
  natural: 'n',
  'double-sharp': '##',
  'double-flat': 'bb',
}

/** 渲染结果信息 */
export interface RenderResult {
  /** 各小节的 X 坐标范围 */
  measureBounds: Array<{ x: number; width: number; index: number }>
  /** 各音符的屏幕位置信息 */
  notePositions: Array<{
    noteId: string
    x: number
    y: number
    width: number
    height: number
    measureIndex: number
  }>
}

/** 五线谱渲染器类 */
export class StaffRenderer {
  private factory: Factory | null = null
  private config: StaffRendererConfig | null = null
  private lastRenderResult: RenderResult | null = null

  /**
   * 初始化渲染器
   * @param config 渲染配置
   */
  init(config: StaffRendererConfig): void {
    this.config = config
    this.factory = new Factory({
      renderer: {
        elementId: config.elementId,
        width: config.width,
        height: config.height,
      },
    })
  }

  /**
   * 将音高字符串转换为 VexFlow 的 keys 格式
   * VexFlow 使用 "c/4" 格式表示 C4
   * @param pitch 音高字符串，如 "C4", "D#5"
   * @returns VexFlow key 格式，如 "c/4", "d#/5"
   */
  pitchToVexKey(pitch: string): string {
    const match = pitch.match(/^([A-G])(#|b)?(\d)$/)
    if (!match) return 'c/4'

    const noteName = match[1].toLowerCase()
    const accidental = match[2] || ''
    const octave = match[3]

    return `${noteName}${accidental}/${octave}`
  }

  /**
   * 将应用层 Note 数据转换为 VexFlow StaveNote
   * @param note 应用层音符
   * @returns VexFlow StaveNote 实例
   */
  noteToStaveNote(note: Note): StaveNote {
    if (note.isRest) {
      // 创建休止符
      const restNote = new StaveNote({
        keys: ['b/4'],
        duration: DURATION_TO_VEX[note.duration],
      })
      return restNote
    }

    // 构建音符 key
    const key = this.pitchToVexKey(note.pitch)

    // 创建音符
    const staveNote = new StaveNote({
      keys: [key],
      duration: DURATION_TO_VEX[note.duration],
    })

    // 添加升降号修饰符
    if (note.accidental && note.accidental !== 'natural') {
      const accType = ACCIDENTAL_TO_VEX[note.accidental]
      if (accType) {
        staveNote.addModifier(new Accidental(accType))
      }
    }

    return staveNote
  }

  /**
   * 渲染五线谱
   * @param measures 小节数据
   * @param selectedNoteIds 选中的音符 ID 列表
   * @param playheadBeat 播放头位置（拍），-1 表示不显示
   * @returns 渲染结果信息
   */
  render(
    measures: Measure[],
    selectedNoteIds: string[] = [],
    playheadBeat: number = -1
  ): RenderResult | null {
    if (!this.factory || !this.config) return null

    const {
      width,
      height,
      measureWidth,
      clef,
      startMeasure,
      endMeasure,
      numerator,
      denominator,
      keySignature,
    } = this.config

    // 重新初始化工厂以清除旧内容
    this.factory.reset()
    this.factory.setOptions({
      renderer: {
        elementId: null,
        width,
        height,
      },
    })

    const ctx = this.factory.getContext()
    const staveSpacing = 10 // 五线谱间距
    const staveY = 60 // 五线谱起始 Y 坐标
    const measureCount = endMeasure - startMeasure + 1
    const totalWidth = Math.max(width, measureCount * measureWidth + 40)

    // 设置画布尺寸
    ctx.resize(totalWidth, height)

    // 调号字符串
    const keyStr = KEY_TO_VEX[keySignature] || 'C'
    const timeStr = `${numerator}/${denominator}`

    const measureBounds: RenderResult['measureBounds'] = []
    const notePositions: RenderResult['notePositions'] = []
    const allStaves: Stave[] = []

    for (let i = 0; i < measureCount; i++) {
      const measureIndex = startMeasure + i
      const measure = measures[measureIndex]
      const x = 20 + i * measureWidth

      // 创建五线谱
      const stave = this.factory.Stave({
        x,
        y: staveY,
        width: measureWidth,
      })

      // 第一个小节添加谱号、调号、拍号
      if (i === 0) {
        stave.addClef(clef)
        stave.addKeySignature(keyStr)
        stave.addTimeSignature(timeStr)
      }

      // 设置小节线
      stave.setBegBarType(BarlineType.NONE)
      if (i === measureCount - 1) {
        stave.setEndBarType(BarlineType.DOUBLE)
      } else {
        stave.setEndBarType(BarlineType.SINGLE)
      }

      stave.setMeasure(measureIndex + 1)
      allStaves.push(stave)

      // 记录小节边界
      measureBounds.push({
        x,
        width: measureWidth,
        index: measureIndex,
      })

      // 创建音符
      const notes = measure?.notes || []
      const staveNotes: StaveNote[] = []

      for (const note of notes) {
        const staveNote = this.noteToStaveNote(note)
        staveNotes.push(staveNote)
      }

      // 如果没有音符，添加全小节休止符
      if (staveNotes.length === 0) {
        const restNote = new StaveNote({
          keys: ['b/4'],
          duration: 'q',
        })
        staveNotes.push(restNote)
      }

      // 创建声部
      const voice = new Voice(timeStr)
      voice.setMode(VoiceMode.SOFT)
      voice.addTickables(staveNotes)

      // 格式化并绘制
      const formatter = new Formatter()
      formatter.joinVoices([voice]).formatToStave([voice], stave)

      // 绘制五线谱
      stave.draw()

      // 绘制声部
      voice.draw(ctx, stave)

      // 收集音符位置信息（用于交互）
      const noteStartX = stave.getNoteStartX()
      const noteEndX = stave.getNoteEndX()
      const availableWidth = noteEndX - noteStartX

      notes.forEach((note, idx) => {
        const noteWidth = availableWidth / Math.max(notes.length, 1)
        const noteX = noteStartX + idx * noteWidth
        const line = this.pitchToLine(note.pitch, clef)
        const noteY = stave.getYForLine(line)

        notePositions.push({
          noteId: note.id,
          x: noteX,
          y: noteY,
          width: noteWidth,
          height: staveSpacing,
          measureIndex,
        })
      })

      // 绘制选中音符高亮
      if (selectedNoteIds.length > 0) {
        notes.forEach((note, idx) => {
          if (selectedNoteIds.includes(note.id)) {
            const noteWidth = availableWidth / Math.max(notes.length, 1)
            const noteX = noteStartX + idx * noteWidth
            const line = this.pitchToLine(note.pitch, clef)
            const noteY = stave.getYForLine(line)

            // 绘制绿色高亮背景（使用半透明颜色）
            ctx.save()
            ctx.setFillStyle('rgba(88, 204, 2, 0.3)')
            ctx.fillRect(
              noteX - 4,
              noteY - staveSpacing / 2,
              noteWidth + 8,
              staveSpacing
            )
            ctx.restore()
          }
        })
      }
    }

    // 绘制播放头
    if (playheadBeat >= 0) {
      const beatsPerMeasure = numerator
      const playheadMeasure = Math.floor(playheadBeat / beatsPerMeasure)
      const beatInMeasure = playheadBeat % beatsPerMeasure
      const measureLocalIndex = playheadMeasure - startMeasure

      if (measureLocalIndex >= 0 && measureLocalIndex < measureCount) {
        const bound = measureBounds[measureLocalIndex]
        if (bound) {
          const stave = allStaves[measureLocalIndex]
          const noteStartX = stave.getNoteStartX()
          const noteEndX = stave.getNoteEndX()
          const availableWidth = noteEndX - noteStartX
          const fraction = beatInMeasure / beatsPerMeasure
          const playheadX = noteStartX + fraction * availableWidth

          ctx.save()
          ctx.setStrokeStyle('#ff4444')
          ctx.setLineWidth(2)
          ctx.beginPath()
          ctx.moveTo(playheadX, staveY - 10)
          ctx.lineTo(playheadX, staveY + 4 * staveSpacing + 10)
          ctx.stroke()
          ctx.restore()

          // 绘制播放头顶部三角标记
          ctx.save()
          ctx.setFillStyle('#ff4444')
          ctx.beginPath()
          ctx.moveTo(playheadX - 5, staveY - 10)
          ctx.lineTo(playheadX + 5, staveY - 10)
          ctx.lineTo(playheadX, staveY - 3)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
        }
      }
    }

    this.lastRenderResult = { measureBounds, notePositions }
    return this.lastRenderResult
  }

  /**
   * 将音高转换为五线谱线号
   * 高音谱号：E4=0(第一线), G4=1, B4=2, D5=3, F5=4(第五线)
   * 低音谱号：G2=0(第一线), B2=1, D3=2, F3=3, A3=4(第五线)
   * @param pitch 音高字符串
   * @param clef 谱号类型
   * @returns 线号（0-4 为线，0.5, 1.5... 为间）
   */
  pitchToLine(pitch: string, clef: 'treble' | 'bass'): number {
    const midiNumber = this.pitchToMidi(pitch)

    if (clef === 'treble') {
      // 高音谱号：第一线 E4 = MIDI 64
      // 每个半音 = 0.5 线间距
      return (midiNumber - 64) / 2
    } else {
      // 低音谱号：第一线 G2 = MIDI 43
      return (midiNumber - 43) / 2
    }
  }

  /**
   * 将五线谱线号转换为音高
   * @param line 线号
   * @param clef 谱号类型
   * @returns 音高字符串
   */
  lineToPitch(line: number, clef: 'treble' | 'bass'): string {
    let midiNumber: number

    if (clef === 'treble') {
      midiNumber = Math.round(line * 2 + 64)
    } else {
      midiNumber = Math.round(line * 2 + 43)
    }

    // 限制范围
    midiNumber = Math.max(21, Math.min(108, midiNumber))

    return this.midiToPitch(midiNumber)
  }

  /**
   * 将音高字符串转换为 MIDI 编号
   */
  pitchToMidi(pitch: string): number {
    const match = pitch.match(/^([A-G])(#|b)?(\d)$/)
    if (!match) return 60

    const noteMap: Record<string, number> = {
      C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
    }
    const base = noteMap[match[1]] || 0
    const accidental = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0
    const octave = parseInt(match[3])

    return base + accidental + (octave + 1) * 12
  }

  /**
   * 将 MIDI 编号转换为音高字符串
   */
  midiToPitch(midi: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(midi / 12) - 1
    const noteName = noteNames[midi % 12]
    return `${noteName}${octave}`
  }

  /**
   * 获取上一次渲染的结果
   */
  getLastRenderResult(): RenderResult | null {
    return this.lastRenderResult
  }

  /**
   * 销毁渲染器，释放资源
   */
  destroy(): void {
    this.factory = null
    this.config = null
    this.lastRenderResult = null
  }
}

/** 创建渲染器实例 */
export function createStaffRenderer(): StaffRenderer {
  return new StaffRenderer()
}
