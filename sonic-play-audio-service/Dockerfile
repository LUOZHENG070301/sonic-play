# ============================================
# SonicPlay 音频处理微服务 Dockerfile
# 基于 NVIDIA CUDA 12.1 运行时
# 针对 RTX 5070 GPU 笔记本优化
# ============================================

FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# 避免交互式安装提示
ENV DEBIAN_FRONTEND=noninteractive

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    ffmpeg \
    libsndfile1 \
    sox \
    libsox-fmt-all \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 设置 Python 3.11 为默认
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# 创建应用目录
WORKDIR /app

# 先安装 PyTorch CUDA 版本（利用 Docker 层缓存）
RUN pip install --no-cache-dir \
    torch==2.1.0+cu121 \
    torchaudio==2.1.0+cu121 \
    --extra-index-url https://download.pytorch.org/whl/cu121

# 复制依赖文件并安装其他依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY app/ ./app/
COPY run.sh .

# 创建输出和上传目录
RUN mkdir -p /app/output /app/uploads

# 赋予启动脚本执行权限
RUN chmod +x run.sh

# 暴露服务端口
EXPOSE 8000

# 环境变量
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DEVICE=cuda
ENV GPU_ID=0
ENV OUTPUT_DIR=/app/output
ENV UPLOAD_DIR=/app/uploads

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动服务
CMD ["python", "-m", "uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "1", \
     "--log-level", "info"]
