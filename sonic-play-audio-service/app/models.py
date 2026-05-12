"""
Pydantic 数据模型定义
定义 API 请求/响应的数据结构。
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ==================== 枚举类型 ====================

class TaskStatusEnum(str, Enum):
    """任务状态枚举"""
    PENDING = "pending"          # 等待处理
    PROCESSING = "processing"    # 处理中
    COMPLETED = "completed"      # 已完成
    FAILED = "failed"            # 处理失败


class SeparationModelEnum(str, Enum):
    """分离模型枚举"""
    HTDEMUCS = "htdemucs"           # 4-stem 分离（vocals, drums, bass, other）
    HTDEMUCS_6S = "htdemucs_6s"     # 6-stem 分离（+ guitar, piano）


# ==================== 请求模型 ====================

class SeparateRequest(BaseModel):
    """音轨分离请求参数"""
    model: SeparationModelEnum = Field(
        default=SeparationModelEnum.HTDEMUCS,
        description="分离模型：htdemucs（4轨）或 htdemucs_6s（6轨）"
    )
    shifts: int = Field(
        default=2,
        ge=0,
        le=10,
        description="移位数，值越大质量越高但速度越慢"
    )
    overlap: float = Field(
        default=0.25,
        ge=0.0,
        le=1.0,
        description="分段重叠比例，0.0~1.0"
    )


class TranscribeRequest(BaseModel):
    """MIDI 转录请求参数"""
    export_note_events: bool = Field(
        default=True,
        description="是否同时输出音符事件 JSON"
    )


class PipelineRequest(BaseModel):
    """完整流水线请求参数"""
    model: SeparationModelEnum = Field(
        default=SeparationModelEnum.HTDEMUCS,
        description="分离模型"
    )
    shifts: int = Field(
        default=2,
        ge=0,
        le=10,
        description="分离移位数"
    )
    overlap: float = Field(
        default=0.25,
        ge=0.0,
        le=1.0,
        description="分离重叠比例"
    )
    export_note_events: bool = Field(
        default=True,
        description="是否输出音符事件 JSON"
    )


# ==================== 响应模型 ====================

class TaskResponse(BaseModel):
    """任务提交响应"""
    task_id: str = Field(..., description="任务唯一标识")
    status: TaskStatusEnum = Field(..., description="任务状态")
    message: str = Field(..., description="状态描述")


class TaskStatusResponse(BaseModel):
    """任务状态查询响应"""
    task_id: str = Field(..., description="任务唯一标识")
    status: TaskStatusEnum = Field(..., description="当前状态")
    progress: float = Field(default=0.0, description="处理进度（0~100）")
    message: str = Field(default="", description="状态描述")
    result_urls: Optional[dict] = Field(default=None, description="结果文件下载地址")
    error: Optional[str] = Field(default=None, description="错误信息（仅失败时）")


class GPUInfoResponse(BaseModel):
    """GPU 信息响应"""
    gpu_available: bool = Field(..., description="GPU 是否可用")
    gpu_name: Optional[str] = Field(default=None, description="GPU 型号名称")
    cuda_version: Optional[str] = Field(default=None, description="CUDA 版本")
    vram_total: Optional[float] = Field(default=None, description="显存总量（GB）")
    vram_used: Optional[float] = Field(default=None, description="已用显存（GB）")
    vram_free: Optional[float] = Field(default=None, description="可用显存（GB）")
    device_name: str = Field(default="cpu", description="实际使用的计算设备")


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str = Field(default="ok", description="服务状态")
    version: str = Field(..., description="服务版本")
    gpu_available: bool = Field(..., description="GPU 是否可用")


class StemInfo(BaseModel):
    """单个音轨信息"""
    stem_name: str = Field(..., description="音轨名称")
    file_url: str = Field(..., description="文件下载地址")
    duration: Optional[float] = Field(default=None, description="时长（秒）")


class SeparationResult(BaseModel):
    """分离结果"""
    stems: list[StemInfo] = Field(default_factory=list, description="分离出的音轨列表")
    model_used: str = Field(..., description="使用的模型名称")


class TranscriptionResult(BaseModel):
    """转录结果"""
    midi_file_url: str = Field(..., description="MIDI 文件下载地址")
    note_events_url: Optional[str] = Field(default=None, description="音符事件 JSON 下载地址")
    note_count: int = Field(default=0, description="检测到的音符数量")


class PipelineResult(BaseModel):
    """完整流水线结果"""
    separation: SeparationResult = Field(..., description="分离结果")
    transcriptions: dict[str, TranscriptionResult] = Field(
        default_factory=dict,
        description="各音轨的转录结果，键为音轨名称"
    )
