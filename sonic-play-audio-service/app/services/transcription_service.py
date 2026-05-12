"""
MIDI 转录服务模块
使用 Spotify Basic Pitch 进行音频到 MIDI 的转录。
支持多音高检测（复调音乐），输出标准 MIDI 文件和音符事件 JSON。
"""

import json
import time
import logging
from pathlib import Path
from typing import Optional, Callable

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)


class TranscriptionService:
    """
    MIDI 转录服务
    - 使用 Spotify Basic Pitch 进行音频转 MIDI
    - 支持复调音乐的多音高检测
    - 输出标准 MIDI 文件（.mid）
    - 可选输出音符事件 JSON（.json）
    """

    _instance = None
    _model_loaded = False

    def __new__(cls):
        """单例模式"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """初始化转录服务"""
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True
        logger.info("MIDI 转录服务初始化完成")

    def _ensure_basic_pitch(self):
        """确保 Basic Pitch 模块可用"""
        try:
            import basic_pitch
            logger.info(f"Basic Pitch 版本：{basic_pitch.__version__}")
        except ImportError as e:
            raise RuntimeError(
                f"Basic Pitch 未安装，请运行：pip install basic-pitch"
            ) from e

    def transcribe(
        self,
        input_path: str,
        output_dir: str,
        export_note_events: bool = True,
        progress_callback: Optional[Callable[[float, str], None]] = None,
    ) -> dict:
        """
        执行音频到 MIDI 的转录

        Args:
            input_path: 输入音频文件路径
            output_dir: 输出目录路径
            export_note_events: 是否输出音符事件 JSON
            progress_callback: 进度回调函数

        Returns:
            转录结果字典
            {
                "midi_file": "path/to/output.mid",
                "note_events_file": "path/to/output.json" or None,
                "note_count": 123,
                "duration": 45.67,
                "processing_time": 3.21
            }
        """
        start_time = time.time()

        # 确保 Basic Pitch 可用
        self._ensure_basic_pitch()

        # 创建输出目录
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # 报告进度
        if progress_callback:
            progress_callback(10, "正在初始化 Basic Pitch 模型...")

        try:
            from basic_pitch.inference import predict
            from basic_pitch import ICASSP_2022_MODEL_PATH

            logger.info(f"正在转录音频：{input_path}")

            # 报告进度
            if progress_callback:
                progress_callback(20, "正在进行音频分析...")

            # 生成输出文件名
            input_filename = Path(input_path).stem
            midi_output = str(output_path / f"{input_filename}.mid")

            # 执行转录预测
            # predict 返回三个数组：
            # - note_events: 音符事件列表
            # - note_likelihoods: 音符概率矩阵
            # - onset_events: 起音事件
            model_output, midi_data, note_events = predict(
                input_path,
                onset_threshold=0.5,      # 起音检测阈值
                frame_threshold=0.3,       # 帧级检测阈值
                min_note_length=settings.MIN_NOTE_LENGTH,
                min_frequency=settings.MIN_NOTE_FREQUENCY,
                max_frequency=settings.MAX_NOTE_FREQUENCY,
                melodia_trick=True,        # 使用 Melodia 旋律提取技巧
                midi_save_path=midi_output,
            )

            # 报告进度
            if progress_callback:
                progress_callback(80, "正在保存转录结果...")

            # 处理音符事件
            note_events_file = None
            note_count = 0

            if note_events is not None and len(note_events) > 0:
                note_count = len(note_events)
                logger.info(f"检测到 {note_count} 个音符事件")

                # 导出音符事件 JSON
                if export_note_events:
                    note_events_file = str(
                        output_path / f"{input_filename}_notes.json"
                    )
                    events_data = []
                    for event in note_events:
                        events_data.append({
                            "start_time_seconds": float(event[0]) if len(event) > 0 else 0,
                            "end_time_seconds": float(event[1]) if len(event) > 1 else 0,
                            "pitch_midi": int(event[2]) if len(event) > 2 else 0,
                            "velocity": float(event[3]) if len(event) > 3 else 0,
                            "pitch_bend": float(event[4]) if len(event) > 4 else 0,
                        })

                    with open(note_events_file, "w", encoding="utf-8") as f:
                        json.dump(events_data, f, ensure_ascii=False, indent=2)

                    logger.info(f"音符事件已保存至：{note_events_file}")

            # 计算处理时间
            elapsed = time.time() - start_time

            # 获取音频时长
            try:
                import torchaudio
                _, sr = torchaudio.load(input_path)
                duration = _[0].shape[-1] / sr
            except Exception:
                duration = 0.0

            # 报告进度
            if progress_callback:
                progress_callback(100, "MIDI 转录完成")

            result = {
                "midi_file": midi_output,
                "note_events_file": note_events_file,
                "note_count": note_count,
                "duration": round(duration, 2),
                "processing_time": round(elapsed, 2),
                "output_dir": str(output_path),
            }

            logger.info(
                f"转录任务完成 - 音频时长：{duration:.2f} 秒，"
                f"音符数：{note_count}，"
                f"处理时间：{elapsed:.2f} 秒"
            )

            return result

        except Exception as e:
            logger.error(f"MIDI 转录失败：{e}")
            raise RuntimeError(f"MIDI 转录处理失败：{e}") from e


# 全局服务单例
transcription_service = TranscriptionService()
