"""
完整处理流水线服务
整合音频分离和 MIDI 转录，提供端到端的处理能力。
包含任务管理、状态追踪和结果缓存。
"""

import asyncio
import uuid
import time
import logging
from pathlib import Path
from typing import Optional, Callable
from datetime import datetime, timedelta

from app.config import settings
from app.models import TaskStatusEnum

logger = logging.getLogger(__name__)


class TaskManager:
    """
    任务管理器
    - 管理所有后台任务的创建、执行和状态追踪
    - 支持任务结果缓存
    - 线程安全的任务状态更新
    """

    def __init__(self):
        """初始化任务管理器"""
        # 任务存储：{task_id: task_info}
        self._tasks: dict = {}
        # 信号量控制最大并发任务数
        self._semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_TASKS)

    def create_task(
        self,
        task_type: str,
        params: dict = None,
    ) -> str:
        """
        创建新任务

        Args:
            task_type: 任务类型（separate / transcribe / pipeline）
            params: 任务参数

        Returns:
            任务 ID
        """
        task_id = str(uuid.uuid4())[:8]
        self._tasks[task_id] = {
            "task_id": task_id,
            "task_type": task_type,
            "status": TaskStatusEnum.PENDING,
            "progress": 0.0,
            "message": "任务已创建，等待处理",
            "params": params or {},
            "result": None,
            "error": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        logger.info(f"创建任务：{task_id}，类型：{task_type}")
        return task_id

    def get_task(self, task_id: str) -> Optional[dict]:
        """
        获取任务信息

        Args:
            task_id: 任务 ID

        Returns:
            任务信息字典，不存在则返回 None
        """
        return self._tasks.get(task_id)

    def update_task(
        self,
        task_id: str,
        status: Optional[TaskStatusEnum] = None,
        progress: Optional[float] = None,
        message: Optional[str] = None,
        result: Optional[dict] = None,
        error: Optional[str] = None,
    ):
        """
        更新任务状态

        Args:
            task_id: 任务 ID
            status: 新状态
            progress: 进度（0~100）
            message: 状态消息
            result: 任务结果
            error: 错误信息
        """
        task = self._tasks.get(task_id)
        if task is None:
            logger.warning(f"尝试更新不存在的任务：{task_id}")
            return

        if status is not None:
            task["status"] = status
        if progress is not None:
            task["progress"] = max(0.0, min(100.0, progress))
        if message is not None:
            task["message"] = message
        if result is not None:
            task["result"] = result
        if error is not None:
            task["error"] = error

        task["updated_at"] = datetime.now()

    def cleanup_expired_tasks(self):
        """清理过期的任务缓存"""
        now = datetime.now()
        expired_ids = []

        for task_id, task in self._tasks.items():
            if task["status"] in (
                TaskStatusEnum.COMPLETED,
                TaskStatusEnum.FAILED,
            ):
                ttl = timedelta(seconds=settings.TASK_CACHE_TTL)
                if now - task["updated_at"] > ttl:
                    expired_ids.append(task_id)

        for task_id in expired_ids:
            del self._tasks[task_id]
            logger.info(f"已清理过期任务：{task_id}")

        if expired_ids:
            logger.info(f"共清理 {len(expired_ids)} 个过期任务")

    async def acquire_slot(self):
        """获取任务执行槽位（控制并发数）"""
        await self._semaphore.acquire()

    def release_slot(self):
        """释放任务执行槽位"""
        self._semaphore.release()


class PipelineService:
    """
    完整处理流水线服务
    - 音频上传 -> 音轨分离 -> MIDI 转录 -> 返回结果
    - 使用任务管理器进行异步任务管理
    """

    def __init__(self):
        """初始化流水线服务"""
        self.task_manager = TaskManager()
        logger.info("流水线服务初始化完成")

    def _make_progress_callback(
        self,
        task_id: str,
        phase: str,
        progress_offset: float = 0.0,
        progress_scale: float = 1.0,
    ) -> Callable[[float, str], None]:
        """
        创建进度回调函数

        Args:
            task_id: 任务 ID
            phase: 当前阶段名称
            progress_offset: 进度偏移量
            progress_scale: 进度缩放比例

        Returns:
            进度回调函数
        """
        def callback(progress: float, message: str):
            # 将子任务的进度映射到总进度
            total_progress = progress_offset + progress * progress_scale
            full_message = f"[{phase}] {message}"
            self.task_manager.update_task(
                task_id,
                progress=total_progress,
                message=full_message,
            )
            logger.debug(f"任务 {task_id} 进度：{total_progress:.1f}% - {full_message}")

        return callback

    async def submit_separation_task(
        self,
        input_path: str,
        model_name: str = "htdemucs",
        shifts: int = 2,
        overlap: float = 0.25,
    ) -> str:
        """
        提交音轨分离任务

        Args:
            input_path: 输入音频文件路径
            model_name: 分离模型名称
            shifts: 移位数
            overlap: 重叠比例

        Returns:
            任务 ID
        """
        # 创建任务
        task_id = self.task_manager.create_task(
            task_type="separate",
            params={
                "input_path": input_path,
                "model": model_name,
                "shifts": shifts,
                "overlap": overlap,
            },
        )

        # 生成输出目录
        output_dir = str(
            Path(settings.OUTPUT_DIR) / "separated" / task_id
        )

        # 启动后台处理
        asyncio.create_task(
            self._run_separation(
                task_id=task_id,
                input_path=input_path,
                output_dir=output_dir,
                model_name=model_name,
                shifts=shifts,
                overlap=overlap,
            )
        )

        return task_id

    async def _run_separation(
        self,
        task_id: str,
        input_path: str,
        output_dir: str,
        model_name: str,
        shifts: int,
        overlap: float,
    ):
        """后台执行分离任务"""
        await self.task_manager.acquire_slot()

        try:
            from app.services.separation_service import separation_service

            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.PROCESSING,
                message="开始音轨分离...",
            )

            # 创建进度回调
            progress_cb = self._make_progress_callback(
                task_id, "音轨分离"
            )

            # 在线程池中执行分离（避免阻塞事件循环）
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: separation_service.separate(
                    input_path=input_path,
                    output_dir=output_dir,
                    model_name=model_name,
                    shifts=shifts,
                    overlap=overlap,
                    progress_callback=progress_cb,
                ),
            )

            # 构建结果 URL
            result_urls = {}
            for stem_name, file_path in result["stems"].items():
                filename = Path(file_path).name
                result_urls[stem_name] = f"/api/download/{filename}"

            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.COMPLETED,
                progress=100.0,
                message="音轨分离完成",
                result={
                    "stems": result_urls,
                    "model": result["model"],
                    "duration": result["duration"],
                    "processing_time": result["processing_time"],
                    "output_dir": result["output_dir"],
                },
            )

        except Exception as e:
            logger.error(f"分离任务 {task_id} 失败：{e}")
            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.FAILED,
                message="音轨分离失败",
                error=str(e),
            )

        finally:
            self.task_manager.release_slot()

    async def submit_transcription_task(
        self,
        input_path: str,
        export_note_events: bool = True,
    ) -> str:
        """
        提交 MIDI 转录任务

        Args:
            input_path: 输入音频文件路径
            export_note_events: 是否输出音符事件 JSON

        Returns:
            任务 ID
        """
        task_id = self.task_manager.create_task(
            task_type="transcribe",
            params={
                "input_path": input_path,
                "export_note_events": export_note_events,
            },
        )

        output_dir = str(
            Path(settings.OUTPUT_DIR) / "transcribed" / task_id
        )

        asyncio.create_task(
            self._run_transcription(
                task_id=task_id,
                input_path=input_path,
                output_dir=output_dir,
                export_note_events=export_note_events,
            )
        )

        return task_id

    async def _run_transcription(
        self,
        task_id: str,
        input_path: str,
        output_dir: str,
        export_note_events: bool,
    ):
        """后台执行转录任务"""
        await self.task_manager.acquire_slot()

        try:
            from app.services.transcription_service import transcription_service

            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.PROCESSING,
                message="开始 MIDI 转录...",
            )

            progress_cb = self._make_progress_callback(
                task_id, "MIDI 转录"
            )

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: transcription_service.transcribe(
                    input_path=input_path,
                    output_dir=output_dir,
                    export_note_events=export_note_events,
                    progress_callback=progress_cb,
                ),
            )

            # 构建结果 URL
            midi_filename = Path(result["midi_file"]).name
            result_urls = {
                "midi_file": f"/api/download/{midi_filename}",
            }
            if result["note_events_file"]:
                notes_filename = Path(result["note_events_file"]).name
                result_urls["note_events"] = f"/api/download/{notes_filename}"

            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.COMPLETED,
                progress=100.0,
                message="MIDI 转录完成",
                result={
                    "result_urls": result_urls,
                    "note_count": result["note_count"],
                    "duration": result["duration"],
                    "processing_time": result["processing_time"],
                    "output_dir": result["output_dir"],
                },
            )

        except Exception as e:
            logger.error(f"转录任务 {task_id} 失败：{e}")
            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.FAILED,
                message="MIDI 转录失败",
                error=str(e),
            )

        finally:
            self.task_manager.release_slot()

    async def submit_pipeline_task(
        self,
        input_path: str,
        model_name: str = "htdemucs",
        shifts: int = 2,
        overlap: float = 0.25,
        export_note_events: bool = True,
    ) -> str:
        """
        提交完整流水线任务（分离 + 转录）

        Args:
            input_path: 输入音频文件路径
            model_name: 分离模型名称
            shifts: 移位数
            overlap: 重叠比例
            export_note_events: 是否输出音符事件 JSON

        Returns:
            任务 ID
        """
        task_id = self.task_manager.create_task(
            task_type="pipeline",
            params={
                "input_path": input_path,
                "model": model_name,
                "shifts": shifts,
                "overlap": overlap,
                "export_note_events": export_note_events,
            },
        )

        output_dir = str(
            Path(settings.OUTPUT_DIR) / "pipeline" / task_id
        )

        asyncio.create_task(
            self._run_pipeline(
                task_id=task_id,
                input_path=input_path,
                output_dir=output_dir,
                model_name=model_name,
                shifts=shifts,
                overlap=overlap,
                export_note_events=export_note_events,
            )
        )

        return task_id

    async def _run_pipeline(
        self,
        task_id: str,
        input_path: str,
        output_dir: str,
        model_name: str,
        shifts: int,
        overlap: float,
        export_note_events: bool,
    ):
        """后台执行完整流水线任务"""
        await self.task_manager.acquire_slot()

        try:
            from app.services.separation_service import separation_service
            from app.services.transcription_service import transcription_service

            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.PROCESSING,
                message="开始完整流水线处理...",
            )

            start_time = time.time()

            # ====== 阶段 1：音轨分离（占总进度的 0~60%）======
            sep_output_dir = str(Path(output_dir) / "separated")
            sep_progress_cb = self._make_progress_callback(
                task_id, "音轨分离",
                progress_offset=0.0,
                progress_scale=0.6,
            )

            loop = asyncio.get_event_loop()
            sep_result = await loop.run_in_executor(
                None,
                lambda: separation_service.separate(
                    input_path=input_path,
                    output_dir=sep_output_dir,
                    model_name=model_name,
                    shifts=shifts,
                    overlap=overlap,
                    progress_callback=sep_progress_cb,
                ),
            )

            # ====== 阶段 2：对每个音轨进行 MIDI 转录（占总进度的 60~100%）======
            stem_files = sep_result["stems"]
            num_stems = len(stem_files)
            transcriptions = {}

            for idx, (stem_name, stem_path) in enumerate(stem_files.items()):
                # 计算当前音轨转录的进度范围
                stem_progress_offset = 60.0 + (40.0 * idx / num_stems)
                stem_progress_scale = 40.0 / num_stems

                trans_progress_cb = self._make_progress_callback(
                    task_id, f"MIDI 转录 - {stem_name}",
                    progress_offset=stem_progress_offset,
                    progress_scale=stem_progress_scale,
                )

                self.task_manager.update_task(
                    task_id,
                    message=f"正在转录音轨：{stem_name} ({idx + 1}/{num_stems})",
                )

                try:
                    trans_output_dir = str(Path(output_dir) / "transcribed" / stem_name)
                    trans_result = await loop.run_in_executor(
                        None,
                        lambda sp=stem_path, od=trans_output_dir:
                            transcription_service.transcribe(
                                input_path=sp,
                                output_dir=od,
                                export_note_events=export_note_events,
                                progress_callback=trans_progress_cb,
                            ),
                    )

                    # 构建转录结果 URL
                    midi_filename = Path(trans_result["midi_file"]).name
                    trans_urls = {
                        "midi_file": f"/api/download/{midi_filename}",
                    }
                    if trans_result["note_events_file"]:
                        notes_filename = Path(trans_result["note_events_file"]).name
                        trans_urls["note_events"] = f"/api/download/{notes_filename}"

                    transcriptions[stem_name] = {
                        "result_urls": trans_urls,
                        "note_count": trans_result["note_count"],
                        "processing_time": trans_result["processing_time"],
                    }

                except Exception as e:
                    logger.warning(f"音轨 {stem_name} 转录失败：{e}")
                    transcriptions[stem_name] = {
                        "error": str(e),
                        "note_count": 0,
                    }

            # 构建分离结果 URL
            sep_urls = {}
            for stem_name, file_path in sep_result["stems"].items():
                filename = Path(file_path).name
                sep_urls[stem_name] = f"/api/download/{filename}"

            # 计算总处理时间
            total_time = time.time() - start_time

            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.COMPLETED,
                progress=100.0,
                message="完整流水线处理完成",
                result={
                    "separation": {
                        "stems": sep_urls,
                        "model": sep_result["model"],
                        "duration": sep_result["duration"],
                        "processing_time": sep_result["processing_time"],
                    },
                    "transcriptions": transcriptions,
                    "total_processing_time": round(total_time, 2),
                    "output_dir": output_dir,
                },
            )

        except Exception as e:
            logger.error(f"流水线任务 {task_id} 失败：{e}")
            self.task_manager.update_task(
                task_id,
                status=TaskStatusEnum.FAILED,
                message="流水线处理失败",
                error=str(e),
            )

        finally:
            self.task_manager.release_slot()


# 全局服务单例
pipeline_service = PipelineService()
