"""
应用配置管理模块
管理所有服务配置项，包括模型选择、输出目录、GPU 设备等。
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()


class Settings:
    """全局配置类"""

    # ==================== 基础配置 ====================

    # 应用名称
    APP_NAME: str = "SonicPlay Audio Service"

    # 应用版本
    APP_VERSION: str = "1.0.0"

    # 服务监听地址
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # 服务监听端口
    PORT: int = int(os.getenv("PORT", "8000"))

    # 调试模式
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # ==================== CORS 配置 ====================

    # 允许的跨域来源（逗号分隔）
    CORS_ORIGINS: list = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
    ).split(",")

    # ==================== GPU 配置 ====================

    # 计算设备（cuda / cpu）
    DEVICE: str = os.getenv("DEVICE", "cuda")

    # GPU 设备编号
    GPU_ID: int = int(os.getenv("GPU_ID", "0"))

    # ==================== 文件上传配置 ====================

    # 最大上传文件大小（字节），默认 500MB
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(500 * 1024 * 1024)))

    # 上传文件临时目录
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", "./uploads"))

    # 允许的音频格式
    ALLOWED_AUDIO_FORMATS: list = [
        ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".wma", ".aiff"
    ]

    # ==================== 输出配置 ====================

    # 分离结果输出目录
    OUTPUT_DIR: Path = Path(os.getenv("OUTPUT_DIR", "./output"))

    # 分离结果音频格式
    OUTPUT_FORMAT: str = os.getenv("OUTPUT_FORMAT", "wav")

    # ==================== Demucs 分离配置 ====================

    # 默认分离模型（htdemucs: 4-stem, htdemucs_6s: 6-stem）
    DEFAULT_SEPARATION_MODEL: str = os.getenv(
        "DEFAULT_SEPARATION_MODEL", "htdemucs"
    )

    # 支持的分离模型列表
    SUPPORTED_MODELS: list = ["htdemucs", "htdemucs_6s"]

    # 默认移位数（shifts 参数，值越大质量越高但越慢）
    DEFAULT_SHIFTS: int = int(os.getenv("DEFAULT_SHIFTS", "2"))

    # 默认重叠比例（overlap 参数，0.0 ~ 1.0）
    DEFAULT_OVERLAP: float = float(os.getenv("DEFAULT_OVERLAP", "0.25"))

    # 分离时使用的分段长度（秒）
    SEGMENT_LENGTH: int = int(os.getenv("SEGMENT_LENGTH", "10"))

    # ==================== Basic Pitch 转录配置 ====================

    # MIDI 转录时的最小音符频率（Hz）
    MIN_NOTE_FREQUENCY: float = float(os.getenv("MIN_NOTE_FREQUENCY", "27.5"))

    # MIDI 转录时的最大音符频率（Hz）
    MAX_NOTE_FREQUENCY: float = float(os.getenv("MAX_NOTE_FREQUENCY", "4186.0"))

    # MIDI 转录时的最小音符持续时间（帧数）
    MIN_NOTE_LENGTH: int = int(os.getenv("MIN_NOTE_LENGTH", "4"))

    # 是否输出音符事件 JSON
    EXPORT_NOTE_EVENTS: bool = os.getenv(
        "EXPORT_NOTE_EVENTS", "true"
    ).lower() == "true"

    # ==================== 任务管理配置 ====================

    # 任务结果缓存时间（秒），默认 1 小时
    TASK_CACHE_TTL: int = int(os.getenv("TASK_CACHE_TTL", "3600"))

    # 最大并发任务数
    MAX_CONCURRENT_TASKS: int = int(os.getenv("MAX_CONCURRENT_TASKS", "2"))

    # ==================== 日志配置 ====================

    # 日志级别
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    def __init__(self):
        """初始化配置，创建必要的目录"""
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# 全局配置单例
settings = Settings()
