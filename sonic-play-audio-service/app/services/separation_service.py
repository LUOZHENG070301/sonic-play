"""
音频分离服务模块
使用 Demucs 模型进行音轨分离，支持 4-stem 和 6-stem 分离。
针对 RTX 5070 GPU 进行优化。
"""

import os
import gc
import time
import logging
from pathlib import Path
from typing import Optional, Callable

import torch
import torchaudio

from app.config import settings

logger = logging.getLogger(__name__)


class SeparationService:
    """
    音频分离服务
    - 单例模式管理 Demucs 模型
    - 支持 htdemucs（4-stem）和 htdemucs_6s（6-stem）模型
    - 自动 GPU 内存管理
    """

    _instance = None
    _models: dict = {}       # 已加载的模型缓存
    _device: torch.device = None

    def __new__(cls):
        """单例模式：确保只创建一个服务实例"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """初始化分离服务"""
        # 避免重复初始化
        if hasattr(self, "_initialized") and self._initialized:
            return

        self._device = torch.device(
            f"cuda:{settings.GPU_ID}" if self._check_cuda() else "cpu"
        )
        self._initialized = True
        logger.info(f"音频分离服务初始化完成，使用设备：{self._device}")

    def _check_cuda(self) -> bool:
        """检查 CUDA 是否可用"""
        if settings.DEVICE == "cpu":
            return False
        if not torch.cuda.is_available():
            logger.warning("CUDA 不可用，将使用 CPU 模式运行（速度较慢）")
            return False
        return True

    def _get_device_name(self) -> str:
        """获取当前设备名称"""
        if self._device.type == "cuda":
            return torch.cuda.get_device_name(self._device)
        return "CPU"

    def get_gpu_info(self) -> dict:
        """
        获取 GPU 信息
        返回包含 GPU 型号、显存、CUDA 版本等信息的字典。
        """
        info = {
            "gpu_available": self._device.type == "cuda",
            "device_name": str(self._device),
        }

        if self._device.type == "cuda":
            try:
                info["gpu_name"] = torch.cuda.get_device_name(self._device)
                info["cuda_version"] = torch.version.cuda or "未知"
                total_mem = torch.cuda.get_device_properties(
                    self._device
                ).total_mem / (1024 ** 3)
                allocated = torch.cuda.memory_allocated(self._device) / (1024 ** 3)
                cached = torch.cuda.memory_reserved(self._device) / (1024 ** 3)
                info["vram_total"] = round(total_mem, 2)
                info["vram_used"] = round(allocated, 2)
                info["vram_free"] = round(total_mem - cached, 2)
            except Exception as e:
                logger.error(f"获取 GPU 信息失败：{e}")
                info["error"] = str(e)

        return info

    def load_model(self, model_name: str = "htdemucs"):
        """
        加载 Demucs 模型到 GPU

        Args:
            model_name: 模型名称，支持 "htdemucs"（4-stem）或 "htdemucs_6s"（6-stem）

        Returns:
            加载好的模型实例
        """
        # 如果模型已加载，直接返回
        if model_name in self._models:
            logger.info(f"模型 {model_name} 已在内存中，直接使用")
            return self._models[model_name]

        logger.info(f"正在加载 Demucs 模型：{model_name} ...")
        start_time = time.time()

        try:
            # 动态导入 demucs 模块
            from demucs import pretrained
            from demucs.apply import apply_model

            # 加载预训练模型
            model = pretrained.get_model(model_name)
            model.to(self._device)
            model.eval()

            # 设置使用半精度浮点数以节省显存（RTX 5070 优化）
            if self._device.type == "cuda":
                model = model.half()

            self._models[model_name] = model

            elapsed = time.time() - start_time
            logger.info(
                f"模型 {model_name} 加载完成，耗时 {elapsed:.2f} 秒，"
                f"设备：{self._device}"
            )

            # 记录 GPU 显存使用情况
            if self._device.type == "cuda":
                allocated = torch.cuda.memory_allocated(self._device) / (1024 ** 3)
                logger.info(f"模型加载后 GPU 显存占用：{allocated:.2f} GB")

            return model

        except Exception as e:
            logger.error(f"加载模型 {model_name} 失败：{e}")
            raise RuntimeError(f"模型加载失败：{e}") from e

    def _load_audio(self, file_path: str) -> torch.Tensor:
        """
        加载音频文件

        Args:
            file_path: 音频文件路径

        Returns:
            音频张量，形状为 (channels, samples)
        """
        wav, sr = torchaudio.load(file_path)
        logger.info(f"已加载音频：{file_path}，采样率：{sr}，声道数：{wav.shape[0]}，"
                     f"时长：{wav.shape[1] / sr:.2f} 秒")
        return wav

    def separate(
        self,
        input_path: str,
        output_dir: str,
        model_name: str = "htdemucs",
        shifts: int = 2,
        overlap: float = 0.25,
        progress_callback: Optional[Callable[[float, str], None]] = None,
    ) -> dict:
        """
        执行音频分离

        Args:
            input_path: 输入音频文件路径
            output_dir: 输出目录路径
            model_name: 分离模型名称
            shifts: 移位数（质量/速度权衡）
            overlap: 分段重叠比例
            progress_callback: 进度回调函数 callback(progress: float, message: str)

        Returns:
            分离结果字典，包含各音轨文件路径
            {
                "stems": {
                    "vocals": "path/to/vocals.wav",
                    "drums": "path/to/drums.wav",
                    ...
                },
                "model": "htdemucs",
                "duration": 123.45,
                "processing_time": 15.67
            }
        """
        start_time = time.time()

        # 验证模型名称
        if model_name not in settings.SUPPORTED_MODELS:
            raise ValueError(
                f"不支持的模型：{model_name}，"
                f"支持的模型：{settings.SUPPORTED_MODELS}"
            )

        # 创建输出目录
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # 报告进度：开始加载模型
        if progress_callback:
            progress_callback(5, "正在加载分离模型...")

        # 加载模型
        model = self.load_model(model_name)

        # 报告进度：开始加载音频
        if progress_callback:
            progress_callback(10, "正在加载音频文件...")

        # 加载音频
        wav = self._load_audio(input_path)
        original_sr = torchaudio.load(input_path)[1]  # 获取采样率

        # 转换为立体声（Demucs 要求双声道输入）
        if wav.shape[0] == 1:
            wav = wav.repeat(2, 1)
            logger.info("单声道音频已自动转换为立体声")

        # 添加 batch 维度：(1, 2, samples)
        wav = wav.unsqueeze(0)

        # 使用半精度（GPU 模式下）
        if self._device.type == "cuda":
            wav = wav.half()

        wav = wav.to(self._device)

        # 报告进度：开始分离
        if progress_callback:
            progress_callback(20, "正在进行音轨分离...")

        logger.info(
            f"开始分离处理 - 模型：{model_name}，"
            f"移位：{shifts}，重叠：{overlap}"
        )

        try:
            # 动态导入分离函数
            from demucs.apply import apply_model

            # 执行分离
            with torch.no_grad():
                sources = apply_model(
                    model,
                    wav,
                    device=self._device,
                    shifts=shifts,
                    overlap=overlap,
                    progress_callback=progress_callback,
                )

            # 报告进度：分离完成，开始保存
            if progress_callback:
                progress_callback(80, "正在保存分离结果...")

            # sources 形状：(1, num_stems, 2, samples)
            sources = sources.squeeze(0)  # (num_stems, 2, samples)

            # 获取音轨名称
            stem_names = model.sources
            logger.info(f"分离完成，共 {len(stem_names)} 个音轨：{stem_names}")

            # 保存各音轨
            result_stems = {}
            for i, stem_name in enumerate(stem_names):
                stem_audio = sources[i].cpu().float()  # 转回 float32

                # 确保音频在 [-1, 1] 范围内
                max_val = stem_audio.abs().max()
                if max_val > 1.0:
                    stem_audio = stem_audio / max_val

                # 生成输出文件名
                input_filename = Path(input_path).stem
                output_file = output_path / f"{input_filename}_{stem_name}.wav"

                # 保存音频文件
                torchaudio.save(
                    str(output_file),
                    stem_audio,
                    original_sr,
                    encoding="PCM_S",
                    bits_per_sample=16,
                )

                result_stems[stem_name] = str(output_file)
                logger.info(f"已保存音轨：{stem_name} -> {output_file}")

            # 计算处理时间
            elapsed = time.time() - start_time
            duration = wav.shape[-1] / original_sr

            # 报告进度：全部完成
            if progress_callback:
                progress_callback(100, "音轨分离完成")

            result = {
                "stems": result_stems,
                "model": model_name,
                "duration": round(duration, 2),
                "processing_time": round(elapsed, 2),
                "output_dir": str(output_path),
            }

            logger.info(
                f"分离任务完成 - 音频时长：{duration:.2f} 秒，"
                f"处理时间：{elapsed:.2f} 秒，"
                f"速度比：{duration / elapsed:.2f}x"
            )

            return result

        except Exception as e:
            logger.error(f"音轨分离失败：{e}")
            raise RuntimeError(f"音轨分离处理失败：{e}") from e

        finally:
            # 清理 GPU 内存
            self._cleanup_gpu()

    def _cleanup_gpu(self):
        """
        清理 GPU 显存
        释放中间张量，防止显存泄漏。
        """
        if self._device.type == "cuda":
            torch.cuda.empty_cache()
            gc.collect()
            logger.debug("已清理 GPU 显存缓存")

    def unload_model(self, model_name: Optional[str] = None):
        """
        卸载模型以释放显存

        Args:
            model_name: 要卸载的模型名称，为 None 时卸载所有模型
        """
        if model_name:
            if model_name in self._models:
                del self._models[model_name]
                logger.info(f"已卸载模型：{model_name}")
        else:
            self._models.clear()
            logger.info("已卸载所有模型")

        # 清理 GPU 内存
        self._cleanup_gpu()


# 全局服务单例
separation_service = SeparationService()
