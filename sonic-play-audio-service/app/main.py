"""
FastAPI 应用入口
配置 CORS、路由挂载、健康检查和 GPU 信息端点。
"""

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import HealthResponse, GPUInfoResponse

# ==================== 日志配置 ====================

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ==================== 创建 FastAPI 应用 ====================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    SonicPlay 音频处理微服务

    ## 功能
    - **音轨分离**：使用 Demucs 模型将音频分离为人声、鼓、贝斯、其他音轨
    - **MIDI 转录**：使用 Spotify Basic Pitch 将音频转录为 MIDI
    - **完整流水线**：一键完成分离 + 转录

    ## GPU 优化
    针对 RTX 5070 GPU 笔记本优化，支持 CUDA 加速。
    """,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ==================== CORS 配置 ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS 已配置，允许的来源：{settings.CORS_ORIGINS}")


# ==================== 路由挂载 ====================

from app.api.routes import router as api_router

app.include_router(api_router, prefix="")
logger.info("API 路由已挂载")


# ==================== 健康检查端点 ====================

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["系统"],
    summary="健康检查",
    description="检查服务运行状态和 GPU 可用性。",
)
async def health_check():
    """健康检查端点"""
    import torch
    gpu_available = torch.cuda.is_available()
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        gpu_available=gpu_available,
    )


# ==================== GPU 信息端点 ====================

@app.get(
    "/gpu-info",
    response_model=GPUInfoResponse,
    tags=["系统"],
    summary="GPU 信息",
    description="获取 GPU 型号、显存、CUDA 版本等信息。",
)
async def gpu_info():
    """GPU 信息端点"""
    from app.services.separation_service import separation_service
    info = separation_service.get_gpu_info()
    return GPUInfoResponse(**info)


# ==================== 启动事件 ====================

@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    logger.info("=" * 60)
    logger.info(f"  {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 60)

    # 检查 GPU 状态
    import torch
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_mem = torch.cuda.get_device_properties(0).total_mem / (1024 ** 3)
        logger.info(f"  GPU：{gpu_name}")
        logger.info(f"  显存：{gpu_mem:.1f} GB")
        logger.info(f"  CUDA：{torch.version.cuda}")
    else:
        logger.warning("  GPU 不可用，将使用 CPU 模式（速度较慢）")

    logger.info(f"  输出目录：{settings.OUTPUT_DIR.resolve()}")
    logger.info(f"  上传目录：{settings.UPLOAD_DIR.resolve()}")
    logger.info(f"  最大并发任务：{settings.MAX_CONCURRENT_TASKS}")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    logger.info("服务正在关闭...")
    # 卸载模型释放显存
    try:
        from app.services.separation_service import separation_service
        separation_service.unload_model()
    except Exception:
        pass
    logger.info("服务已关闭")
