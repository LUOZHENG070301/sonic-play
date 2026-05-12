"""
API 路由模块
定义所有 HTTP 接口端点。
"""

import os
import shutil
import logging
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse

from app.config import settings
from app.models import (
    TaskResponse,
    TaskStatusResponse,
    TaskStatusEnum,
    GPUInfoResponse,
    HealthResponse,
)

logger = logging.getLogger(__name__)

# 创建路由器
router = APIRouter(prefix="/api")


def _validate_audio_file(file: UploadFile) -> str:
    """
    验证上传的音频文件

    Args:
        file: 上传的文件对象

    Returns:
        文件扩展名（小写，含点号）

    Raises:
        HTTPException: 文件格式不支持时抛出
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")

    # 检查文件扩展名
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_AUDIO_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的音频格式：{ext}，"
                   f"支持的格式：{', '.join(settings.ALLOWED_AUDIO_FORMATS)}",
        )
    return ext


async def _save_upload_file(file: UploadFile) -> str:
    """
    保存上传的文件到临时目录

    Args:
        file: 上传的文件对象

    Returns:
        保存后的文件路径
    """
    # 验证文件
    ext = _validate_audio_file(file)

    # 生成唯一文件名
    import uuid
    unique_filename = f"{uuid.uuid4().hex[:12]}{ext}"
    save_path = settings.UPLOAD_DIR / unique_filename

    # 分块写入文件（避免大文件占用过多内存）
    try:
        with open(save_path, "wb") as f:
            while True:
                chunk = await file.read(1024 * 1024)  # 每次读取 1MB
                if not chunk:
                    break
                f.write(chunk)
    except Exception as e:
        # 写入失败时清理文件
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(
            status_code=500, detail=f"文件保存失败：{str(e)}"
        )

    logger.info(f"文件已保存：{save_path}，大小：{save_path.stat().st_size / 1024 / 1024:.2f} MB")
    return str(save_path)


# ==================== 音轨分离接口 ====================

@router.post(
    "/separate",
    response_model=TaskResponse,
    summary="提交音轨分离任务",
    description="上传音频文件，提交音轨分离任务。支持 htdemucs（4轨）和 htdemucs_6s（6轨）模型。",
)
async def submit_separation_task(
    file: UploadFile = File(..., description="音频文件"),
    model: str = Form(
        default="htdemucs",
        description="分离模型：htdemucs（4轨）或 htdemucs_6s（6轨）",
    ),
    shifts: int = Form(default=2, ge=0, le=10, description="移位数"),
    overlap: float = Form(default=0.25, ge=0.0, le=1.0, description="重叠比例"),
):
    """提交音轨分离任务"""
    # 验证模型名称
    if model not in settings.SUPPORTED_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的模型：{model}，支持的模型：{settings.SUPPORTED_MODELS}",
        )

    # 保存上传文件
    input_path = await _save_upload_file(file)

    # 提交任务
    from app.services.pipeline_service import pipeline_service
    task_id = await pipeline_service.submit_separation_task(
        input_path=input_path,
        model_name=model,
        shifts=shifts,
        overlap=overlap,
    )

    return TaskResponse(
        task_id=task_id,
        status=TaskStatusEnum.PENDING,
        message="音轨分离任务已提交",
    )


# ==================== MIDI 转录接口 ====================

@router.post(
    "/transcribe",
    response_model=TaskResponse,
    summary="提交 MIDI 转录任务",
    description="上传音频文件，提交 MIDI 转录任务。使用 Spotify Basic Pitch 进行多音高检测。",
)
async def submit_transcription_task(
    file: UploadFile = File(..., description="音频文件"),
    export_note_events: bool = Form(
        default=True,
        description="是否输出音符事件 JSON",
    ),
):
    """提交 MIDI 转录任务"""
    input_path = await _save_upload_file(file)

    from app.services.pipeline_service import pipeline_service
    task_id = await pipeline_service.submit_transcription_task(
        input_path=input_path,
        export_note_events=export_note_events,
    )

    return TaskResponse(
        task_id=task_id,
        status=TaskStatusEnum.PENDING,
        message="MIDI 转录任务已提交",
    )


# ==================== 完整流水线接口 ====================

@router.post(
    "/pipeline",
    response_model=TaskResponse,
    summary="提交完整流水线任务",
    description="上传音频文件，执行音轨分离 + MIDI 转录的完整流水线。",
)
async def submit_pipeline_task(
    file: UploadFile = File(..., description="音频文件"),
    model: str = Form(
        default="htdemucs",
        description="分离模型：htdemucs（4轨）或 htdemucs_6s（6轨）",
    ),
    shifts: int = Form(default=2, ge=0, le=10, description="移位数"),
    overlap: float = Form(default=0.25, ge=0.0, le=1.0, description="重叠比例"),
    export_note_events: bool = Form(
        default=True,
        description="是否输出音符事件 JSON",
    ),
):
    """提交完整流水线任务"""
    if model not in settings.SUPPORTED_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的模型：{model}，支持的模型：{settings.SUPPORTED_MODELS}",
        )

    input_path = await _save_upload_file(file)

    from app.services.pipeline_service import pipeline_service
    task_id = await pipeline_service.submit_pipeline_task(
        input_path=input_path,
        model_name=model,
        shifts=shifts,
        overlap=overlap,
        export_note_events=export_note_events,
    )

    return TaskResponse(
        task_id=task_id,
        status=TaskStatusEnum.PENDING,
        message="完整流水线任务已提交",
    )


# ==================== 任务状态查询接口 ====================

@router.get(
    "/tasks/{task_id}",
    response_model=TaskStatusResponse,
    summary="查询任务状态",
    description="根据任务 ID 查询任务的处理状态、进度和结果。",
)
async def get_task_status(task_id: str):
    """查询任务状态"""
    from app.services.pipeline_service import pipeline_service

    task = pipeline_service.task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=f"任务不存在：{task_id}")

    return TaskStatusResponse(
        task_id=task["task_id"],
        status=task["status"],
        progress=task["progress"],
        message=task["message"],
        result_urls=task["result"],
        error=task["error"],
    )


# ==================== 文件下载接口 ====================

@router.get(
    "/download/{filename}",
    summary="下载结果文件",
    description="根据文件名下载处理结果文件（音频、MIDI 等）。",
)
async def download_file(filename: str):
    """下载结果文件"""
    # 在输出目录中搜索文件
    output_dir = settings.OUTPUT_DIR

    # 递归搜索文件
    for root, dirs, files in os.walk(output_dir):
        if filename in files:
            file_path = Path(root) / filename
            return FileResponse(
                path=str(file_path),
                filename=filename,
                media_type="application/octet-stream",
            )

    raise HTTPException(status_code=404, detail=f"文件不存在：{filename}")


# ==================== GPU 信息接口 ====================

@router.get(
    "/gpu-info",
    response_model=GPUInfoResponse,
    summary="获取 GPU 信息",
    description="返回当前 GPU 的型号、显存、CUDA 版本等信息。",
)
async def get_gpu_info():
    """获取 GPU 信息"""
    from app.services.separation_service import separation_service

    info = separation_service.get_gpu_info()
    return GPUInfoResponse(**info)
