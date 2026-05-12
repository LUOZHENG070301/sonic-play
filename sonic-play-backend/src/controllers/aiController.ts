import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  AuthRequest,
  SeparationTask,
  AnalysisResult,
  ChatResponse,
  CreateSeparationBody,
  CreateAnalysisBody,
  CreateChatBody,
  ApiResponse,
} from '../types/index.js';

// ============ Mock 数据 ============

/** Mock 分离任务数据 */
const mockSeparationTasks: SeparationTask[] = [];

/** Mock AI 分析结果数据 */
const mockAnalysisResults: AnalysisResult[] = [
  {
    id: 'analysis-001',
    projectId: 'proj-001',
    key: 'C Major',
    bpm: 120,
    timeSignature: '4/4',
    genre: 'Pop',
    mood: ['欢快', '明亮', '活力'],
    instruments: ['人声', '吉他', '贝斯', '鼓组', '钢琴'],
    suggestions: [
      '建议增加一些弦乐背景来丰富副歌部分',
      '第二段主歌可以尝试降低人声音量，突出伴奏',
      '结尾部分可以加入渐弱效果',
    ],
    createdAt: '2024-12-15T14:30:00Z',
  },
];

// ============ 控制器 ============

/**
 * 提交 AI 分离任务
 * POST /api/v1/ai/separate
 *
 * 将音频分离为不同的音轨（如人声、鼓组、贝斯等）
 */
export function createSeparation(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const body = req.body as CreateSeparationBody;

    const now = new Date().toISOString();
    const task: SeparationTask = {
      id: `sep-${uuidv4().slice(0, 8)}`,
      projectId: body.projectId,
      trackId: body.trackId,
      status: 'processing',
      stems: body.stems || ['vocals', 'drums', 'bass', 'other'],
      progress: 0,
      createdAt: now,
    };

    mockSeparationTasks.push(task);

    // 模拟异步处理：2秒后更新进度
    setTimeout(() => {
      task.progress = 50;
    }, 1000);

    // 模拟异步处理：5秒后完成
    setTimeout(() => {
      task.status = 'completed';
      task.progress = 100;
      task.resultUrl = `/results/${task.id}/archive.zip`;
      task.completedAt = new Date().toISOString();
    }, 3000);

    const response: ApiResponse<SeparationTask> = {
      success: true,
      data: task,
      message: '分离任务已提交',
    };

    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * AI 音乐分析
 * POST /api/v1/ai/analyze
 *
 * 分析音乐的调性、BPM、节拍、风格等
 */
export function analyzeMusic(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const body = req.body as CreateAnalysisBody;

    // 检查是否已有分析结果
    const existing = mockAnalysisResults.find((a) => a.projectId === body.projectId);

    if (existing) {
      const response: ApiResponse<AnalysisResult> = {
        success: true,
        data: existing,
        message: '已存在分析结果',
      };
      res.json(response);
      return;
    }

    // 创建新的分析结果
    const now = new Date().toISOString();
    const result: AnalysisResult = {
      id: `analysis-${uuidv4().slice(0, 8)}`,
      projectId: body.projectId,
      key: 'G Major',
      bpm: 110,
      timeSignature: '4/4',
      genre: 'Pop',
      mood: ['温暖', '抒情', '柔和'],
      instruments: ['人声', '钢琴', '弦乐', '鼓组'],
      suggestions: [
        '整体结构良好，建议在桥段增加动态变化',
        '人声部分可以尝试加入和声',
        '混响效果可以适当增强空间感',
      ],
      createdAt: now,
    };

    mockAnalysisResults.push(result);

    const response: ApiResponse<AnalysisResult> = {
      success: true,
      data: result,
      message: '分析完成',
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}

/**
 * AI 对话
 * POST /api/v1/ai/chat
 *
 * 与 AI 助手进行对话，获取音乐制作建议
 */
export function chat(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const body = req.body as CreateChatBody;
    const userMessage = body.message.toLowerCase();

    // 根据用户消息关键词返回不同的 Mock 回复
    let reply: string;
    let suggestions: string[] | undefined;

    if (userMessage.includes('混音') || userMessage.includes('mix')) {
      reply = '关于混音，我有以下建议：\n\n1. 首先做好频率分配，确保各音轨之间不会互相冲突\n2. 使用 EQ 切除不必要的低频（通常 80Hz 以下）\n3. 合理使用压缩器控制动态范围\n4. 注意立体声声场的宽度与深度\n\n你想要了解哪个方面的更多细节？';
      suggestions = ['EQ 技巧', '压缩器使用', '混响设置', '母带处理'];
    } else if (userMessage.includes('编曲') || userMessage.includes('arrange')) {
      reply = '编曲是音乐制作的核心环节。以下是一些通用的编曲原则：\n\n1. 建立清晰的歌曲结构（前奏-主歌-副歌-桥段-尾奏）\n2. 逐层添加乐器，保持每个段落有独特的音色变化\n3. 注意动态对比，让歌曲有呼吸感\n4. 副歌部分通常是最饱满的，可以加入更多音轨';
      suggestions = ['流行编曲技巧', '电子音乐编曲', '管弦乐编排'];
    } else if (userMessage.includes('分离') || userMessage.includes('separate') || userMessage.includes('stem')) {
      reply = '音轨分离（Stem Separation）可以将混合音频拆分为独立音轨。我们的 AI 引擎支持以下分离模式：\n\n- 人声/伴奏分离\n- 鼓组/贝斯/其他分离\n- 完整 4-stem 分离（人声、鼓组、贝斯、其他）\n\n分离质量取决于原始音频的质量，建议使用无损格式（WAV/FLAC）获得最佳效果。';
      suggestions = ['提交分离任务', '支持的音频格式', '分离质量优化'];
    } else {
      reply = `你好！我是 Sonic Play AI 助手，可以帮你解答音乐制作相关的问题。\n\n我可以协助你：\n- 混音与母带处理建议\n- 编曲与作曲技巧\n- 音轨分离与处理\n- 音乐理论问题\n- 设备与插件推荐\n\n请告诉我你需要什么帮助？`;
      suggestions = ['如何开始一个新项目', '混音技巧', '音轨分离', '编曲建议'];
    }

    const chatResponse: ChatResponse = {
      reply,
      suggestions,
    };

    const response: ApiResponse<ChatResponse> = {
      success: true,
      data: chatResponse,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
}
