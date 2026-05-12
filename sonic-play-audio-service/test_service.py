"""
SonicPlay 音频处理微服务 - 测试脚本
验证 GPU 加速、模型加载、音轨分离和 MIDI 转录功能。
"""

import os
import sys
import time
import logging
import tempfile
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


def print_header(title: str):
    """打印测试标题"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_result(name: str, passed: bool, detail: str = ""):
    """打印测试结果"""
    status = "PASS" if passed else "FAIL"
    symbol = "[OK]" if passed else "[!!]"
    msg = f"  {symbol} {name}: {status}"
    if detail:
        msg += f" ({detail})"
    print(msg)
    return passed


class TestRunner:
    """测试运行器"""

    def __init__(self):
        self.results = []
        self.temp_dir = tempfile.mkdtemp(prefix="sonic_play_test_")
        logger.info(f"临时目录：{self.temp_dir}")

    def run_all(self):
        """运行所有测试"""
        print_header("SonicPlay 音频处理微服务 - 功能测试")

        # 测试 1：GPU 检测
        self.test_gpu_detection()

        # 测试 2：依赖导入
        self.test_imports()

        # 测试 3：生成测试音频
        test_audio = self.generate_test_audio()

        # 测试 4：Demucs 模型加载
        model_loaded = self.test_demucs_model_load()

        # 测试 5：音轨分离
        if model_loaded and test_audio:
            self.test_separation(test_audio)

        # 测试 6：MIDI 转录
        if test_audio:
            self.test_transcription(test_audio)

        # 测试 7：配置验证
        self.test_config()

        # 打印汇总
        self.print_summary()

    def test_gpu_detection(self):
        """测试 GPU 检测"""
        print_header("1. GPU 检测")

        import torch

        cuda_available = torch.cuda.is_available()
        self.results.append(
            print_result("CUDA 可用", cuda_available)
        )

        if cuda_available:
            gpu_count = torch.cuda.device_count()
            self.results.append(
                print_result("GPU 数量", gpu_count > 0, f"{gpu_count} 块")
            )

            for i in range(gpu_count):
                props = torch.cuda.get_device_properties(i)
                vram_gb = props.total_mem / (1024 ** 3)
                self.results.append(
                    print_result(
                        f"GPU {i}",
                        True,
                        f"{props.name}, {vram_gb:.1f} GB 显存"
                    )
                )

            cuda_version = torch.version.cuda
            self.results.append(
                print_result("CUDA 版本", cuda_version is not None, cuda_version or "未知")
            )
        else:
            self.results.append(
                print_result("GPU", False, "CUDA 不可用，将使用 CPU 模式")
            )

    def test_imports(self):
        """测试依赖库导入"""
        print_header("2. 依赖库导入")

        modules = [
            ("torch", "PyTorch"),
            ("torchaudio", "TorchAudio"),
            ("numpy", "NumPy"),
            ("fastapi", "FastAPI"),
            ("uvicorn", "Uvicorn"),
        ]

        for module_name, display_name in modules:
            try:
                mod = __import__(module_name)
                version = getattr(mod, "__version__", "未知版本")
                self.results.append(
                    print_result(display_name, True, version)
                )
            except ImportError as e:
                self.results.append(
                    print_result(display_name, False, str(e))
                )

        # 测试 Demucs
        try:
            import demucs
            self.results.append(
                print_result("Demucs", True, demucs.__version__)
            )
        except ImportError as e:
            self.results.append(
                print_result("Demucs", False, str(e))
            )

        # 测试 Basic Pitch
        try:
            import basic_pitch
            self.results.append(
                print_result("Basic Pitch", True, basic_pitch.__version__)
            )
        except ImportError as e:
            self.results.append(
                print_result("Basic Pitch", False, str(e))
            )

    def generate_test_audio(self) -> str:
        """生成测试音频文件（简单正弦波）"""
        print_header("3. 生成测试音频")

        try:
            import torch
            import torchaudio

            # 生成 5 秒的 440Hz 正弦波（A4 音符）
            sample_rate = 44100
            duration = 5.0
            t = torch.linspace(0, duration, int(sample_rate * duration))

            # 生成多个频率的正弦波叠加（模拟简单和弦）
            freqs = [261.63, 329.63, 392.00]  # C4, E4, G4（C 大三和弦）
            waveform = sum(torch.sin(2 * 3.14159 * f * t) for f in freqs)

            # 归一化
            waveform = waveform / waveform.abs().max() * 0.8

            # 转换为立体声
            stereo = torch.stack([waveform, waveform])

            # 保存
            output_path = os.path.join(self.temp_dir, "test_chord.wav")
            torchaudio.save(output_path, stereo, sample_rate)

            file_size = os.path.getsize(output_path) / 1024
            self.results.append(
                print_result(
                    "测试音频生成",
                    True,
                    f"C大三和弦, {duration}秒, {file_size:.1f} KB"
                )
            )

            return output_path

        except Exception as e:
            self.results.append(
                print_result("测试音频生成", False, str(e))
            )
            return None

    def test_demucs_model_load(self) -> bool:
        """测试 Demucs 模型加载"""
        print_header("4. Demucs 模型加载")

        try:
            from app.services.separation_service import separation_service

            # 测试 GPU 信息获取
            gpu_info = separation_service.get_gpu_info()
            self.results.append(
                print_result(
                    "GPU 信息获取",
                    True,
                    f"设备: {gpu_info.get('device_name', 'CPU')}"
                )
            )

            # 测试模型加载（htdemucs）
            start = time.time()
            model = separation_service.load_model("htdemucs")
            load_time = time.time() - start

            self.results.append(
                print_result(
                    "htdemucs 模型加载",
                    model is not None,
                    f"耗时 {load_time:.2f} 秒"
                )
            )

            return True

        except Exception as e:
            self.results.append(
                print_result("Demucs 模型加载", False, str(e))
            )
            return False

    def test_separation(self, audio_path: str):
        """测试音轨分离"""
        print_header("5. 音轨分离测试")

        try:
            from app.services.separation_service import separation_service

            output_dir = os.path.join(self.temp_dir, "separated")

            # 进度回调
            def progress_cb(progress, message):
                print(f"    进度：{progress:.0f}% - {message}")

            start = time.time()
            result = separation_service.separate(
                input_path=audio_path,
                output_dir=output_dir,
                model_name="htdemucs",
                shifts=0,       # 测试时使用 0 移位以加快速度
                overlap=0.25,
                progress_callback=progress_cb,
            )
            elapsed = time.time() - start

            # 验证结果
            stems = result.get("stems", {})
            expected_stems = ["vocals", "drums", "bass", "other"]

            self.results.append(
                print_result(
                    "分离完成",
                    len(stems) == len(expected_stems),
                    f"{len(stems)} 个音轨, 耗时 {elapsed:.2f} 秒"
                )
            )

            # 验证每个音轨文件
            for stem_name in expected_stems:
                if stem_name in stems:
                    file_path = stems[stem_name]
                    exists = os.path.exists(file_path)
                    size = os.path.getsize(file_path) / 1024 if exists else 0
                    self.results.append(
                        print_result(
                            f"音轨 {stem_name}",
                            exists,
                            f"{size:.1f} KB" if exists else "文件不存在"
                        )
                    )

            # 速度比
            duration = result.get("duration", 0)
            if elapsed > 0 and duration > 0:
                speed_ratio = duration / elapsed
                self.results.append(
                    print_result(
                        "处理速度",
                        True,
                        f"{speed_ratio:.2f}x 实时速度"
                    )
                )

        except Exception as e:
            self.results.append(
                print_result("音轨分离", False, str(e))
            )

    def test_transcription(self, audio_path: str):
        """测试 MIDI 转录"""
        print_header("6. MIDI 转录测试")

        try:
            from app.services.transcription_service import transcription_service

            output_dir = os.path.join(self.temp_dir, "transcribed")

            def progress_cb(progress, message):
                print(f"    进度：{progress:.0f}% - {message}")

            start = time.time()
            result = transcription_service.transcribe(
                input_path=audio_path,
                output_dir=output_dir,
                export_note_events=True,
                progress_callback=progress_cb,
            )
            elapsed = time.time() - start

            # 验证 MIDI 文件
            midi_file = result.get("midi_file", "")
            midi_exists = os.path.exists(midi_file) if midi_file else False
            self.results.append(
                print_result(
                    "MIDI 文件生成",
                    midi_exists,
                    f"{os.path.getsize(midi_file) / 1024:.1f} KB" if midi_exists else "失败"
                )
            )

            # 验证音符事件 JSON
            notes_file = result.get("note_events_file")
            if notes_file:
                notes_exists = os.path.exists(notes_file)
                self.results.append(
                    print_result(
                        "音符事件 JSON",
                        notes_exists,
                        f"{os.path.getsize(notes_file) / 1024:.1f} KB" if notes_exists else "失败"
                    )
                )

            # 音符数量
            note_count = result.get("note_count", 0)
            self.results.append(
                print_result(
                    "音符检测",
                    True,
                    f"检测到 {note_count} 个音符"
                )
            )

            # 处理时间
            self.results.append(
                print_result(
                    "转录速度",
                    True,
                    f"耗时 {elapsed:.2f} 秒"
                )
            )

        except Exception as e:
            self.results.append(
                print_result("MIDI 转录", False, str(e))
            )

    def test_config(self):
        """测试配置"""
        print_header("7. 配置验证")

        try:
            from app.config import settings

            self.results.append(
                print_result(
                    "配置加载",
                    True,
                    f"输出目录: {settings.OUTPUT_DIR}"
                )
            )
            self.results.append(
                print_result(
                    "支持模型",
                    len(settings.SUPPORTED_MODELS) > 0,
                    str(settings.SUPPORTED_MODELS)
                )
            )
            self.results.append(
                print_result(
                    "目录创建",
                    settings.OUTPUT_DIR.exists(),
                    str(settings.OUTPUT_DIR)
                )
            )

        except Exception as e:
            self.results.append(
                print_result("配置验证", False, str(e))
            )

    def print_summary(self):
        """打印测试汇总"""
        print_header("测试汇总")

        total = len(self.results)
        passed = sum(1 for r in self.results if r)
        failed = total - passed

        print(f"\n  总测试数：{total}")
        print(f"  通过：{passed}")
        print(f"  失败：{failed}")

        if failed == 0:
            print(f"\n  {'='*40}")
            print(f"  所有测试通过！服务可以正常运行。")
            print(f"  {'='*40}")
        else:
            print(f"\n  {'='*40}")
            print(f"  有 {failed} 个测试失败，请检查错误信息。")
            print(f"  {'='*40}")

        print()

        # 清理临时文件
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
            logger.info(f"已清理临时目录：{self.temp_dir}")
        except Exception:
            pass


if __name__ == "__main__":
    # 确保在项目根目录运行
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    runner = TestRunner()
    runner.run_all()
