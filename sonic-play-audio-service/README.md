# SonicPlay 音频处理微服务

基于 Demucs + Basic Pitch 的音频分离与 MIDI 转录微服务，针对 RTX 5070 GPU 笔记本优化。

## 功能特性

- **音轨分离**：使用 Meta Demucs 模型将音频分离为独立音轨
  - 4-stem 模型（htdemucs）：人声、鼓、贝斯、其他
  - 6-stem 模型（htdemucs_6s）：额外包含吉他和钢琴
- **MIDI 转录**：使用 Spotify Basic Pitch 进行多音高检测，输出标准 MIDI 文件
- **完整流水线**：一键完成 音频上传 -> 音轨分离 -> MIDI 转录
- **GPU 加速**：支持 CUDA 加速，针对 RTX 5070 优化（半精度推理）

## 环境要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| GPU | NVIDIA GPU（8GB+ 显存） | RTX 5070 Laptop（12GB） |
| CUDA | 12.x | 12.1+ |
| Python | 3.11 | 3.11 |
| 内存 | 16 GB | 32 GB |
| 磁盘 | 10 GB | SSD 50 GB+ |

## 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆项目
cd sonic-play-audio-service

# 2. 构建并启动
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 验证服务
curl http://localhost:8000/health
```

**前置条件**：需要安装 [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html)

### 方式二：直接安装

```bash
# 1. 运行安装脚本
bash setup.sh

# 2. 启动服务
bash run.sh

# 3. 验证服务
curl http://localhost:8000/health
```

### 方式三：手动安装

```bash
# 创建虚拟环境
python3.11 -m venv venv
source venv/bin/activate

# 安装 PyTorch CUDA 版本
pip install torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cu121

# 安装其他依赖
pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API 接口

服务启动后，访问 `http://localhost:8000/docs` 查看完整的交互式 API 文档（Swagger UI）。

### 健康检查

```bash
curl http://localhost:8000/health
```

### GPU 信息

```bash
curl http://localhost:8000/gpu-info
```

### 提交音轨分离任务

```bash
curl -X POST http://localhost:8000/api/separate \
  -F "file=@your_song.mp3" \
  -F "model=htdemucs" \
  -F "shifts=2" \
  -F "overlap=0.25"
```

**参数说明**：
- `file`：音频文件（必填）
- `model`：分离模型，`htdemucs`（4轨）或 `htdemucs_6s`（6轨），默认 `htdemucs`
- `shifts`：移位数（0-10），值越大质量越高但速度越慢，默认 `2`
- `overlap`：分段重叠比例（0.0-1.0），默认 `0.25`

### 提交 MIDI 转录任务

```bash
curl -X POST http://localhost:8000/api/transcribe \
  -F "file=@your_audio.wav" \
  -F "export_note_events=true"
```

### 提交完整流水线（分离 + 转录）

```bash
curl -X POST http://localhost:8000/api/pipeline \
  -F "file=@your_song.mp3" \
  -F "model=htdemucs" \
  -F "shifts=2" \
  -F "overlap=0.25" \
  -F "export_note_events=true"
```

### 查询任务状态

```bash
# 返回的 task_id 替换下面的 {task_id}
curl http://localhost:8000/api/tasks/{task_id}
```

**响应示例**：
```json
{
  "task_id": "a1b2c3d4",
  "status": "completed",
  "progress": 100.0,
  "message": "音轨分离完成",
  "result_urls": {
    "stems": {
      "vocals": "/api/download/song_vocals.wav",
      "drums": "/api/download/song_drums.wav",
      "bass": "/api/download/song_bass.wav",
      "other": "/api/download/song_other.wav"
    },
    "model": "htdemucs",
    "duration": 245.5,
    "processing_time": 32.1
  }
}
```

### 下载结果文件

```bash
curl -O http://localhost:8000/api/download/song_vocals.wav
```

## 运行测试

```bash
# 确保虚拟环境已激活
source venv/bin/activate

# 运行测试脚本（自动生成测试音频并验证所有功能）
python test_service.py
```

## 性能预期（RTX 5070 Laptop）

| 任务 | 音频时长 | 预计处理时间 | 速度比 |
|------|---------|-------------|--------|
| 4-stem 分离（shifts=2） | 3 分钟 | ~15-25 秒 | ~7-12x |
| 4-stem 分离（shifts=0） | 3 分钟 | ~8-12 秒 | ~15-22x |
| 6-stem 分离（shifts=2） | 3 分钟 | ~20-35 秒 | ~5-9x |
| MIDI 转录 | 3 分钟 | ~10-20 秒 | ~9-18x |
| 完整流水线（4-stem + 转录） | 3 分钟 | ~60-90 秒 | ~2-3x |

> 注：实际性能取决于音频复杂度、系统负载和 GPU 温度降频情况。

## 项目结构

```
sonic-play-audio-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 应用入口
│   ├── config.py            # 配置管理
│   ├── models.py            # Pydantic 数据模型
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py        # API 路由定义
│   └── services/
│       ├── __init__.py
│       ├── separation_service.py   # 音频分离服务（Demucs）
│       ├── transcription_service.py # MIDI 转录服务（Basic Pitch）
│       └── pipeline_service.py     # 完整处理流水线
├── output/                  # 分离和转录结果输出目录
├── uploads/                 # 上传文件临时目录
├── requirements.txt         # Python 依赖
├── Dockerfile               # Docker 构建文件
├── docker-compose.yml       # Docker Compose 配置
├── setup.sh                 # 一键安装脚本
├── run.sh                   # 启动脚本
├── test_service.py          # 测试脚本
└── README.md                # 本文件
```

## 环境变量配置

可通过 `.env` 文件或环境变量进行配置：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `HOST` | `0.0.0.0` | 服务监听地址 |
| `PORT` | `8000` | 服务监听端口 |
| `DEVICE` | `cuda` | 计算设备（cuda/cpu） |
| `GPU_ID` | `0` | GPU 设备编号 |
| `DEBUG` | `false` | 调试模式 |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `MAX_CONCURRENT_TASKS` | `2` | 最大并发任务数 |
| `MAX_FILE_SIZE` | `524288000` | 最大上传文件大小（字节） |
| `OUTPUT_DIR` | `./output` | 输出目录 |
| `UPLOAD_DIR` | `./uploads` | 上传目录 |
| `DEFAULT_SEPARATION_MODEL` | `htdemucs` | 默认分离模型 |
| `CORS_ORIGINS` | `http://localhost:3000,...` | CORS 允许的来源 |

## 常见问题排查

### 1. CUDA 不可用

```
错误：CUDA 不可用，将使用 CPU 模式
```

**解决方案**：
- 确认已安装 NVIDIA 驱动：`nvidia-smi`
- 确认 CUDA 版本匹配：`nvcc --version`
- 确认安装了 CUDA 版本的 PyTorch：
  ```bash
  pip install torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cu121
  ```

### 2. 显存不足（OOM）

```
错误：CUDA out of memory
```

**解决方案**：
- 降低 `shifts` 参数（设为 0）
- 降低 `overlap` 参数（设为 0.1）
- 减少最大并发任务数（`MAX_CONCURRENT_TASKS=1`）
- 关闭其他占用 GPU 的程序

### 3. 模型下载失败

```
错误：模型加载失败
```

**解决方案**：
- 检查网络连接（Demucs 首次运行需要下载模型）
- 手动预下载模型：
  ```bash
  python -c "from demucs import pretrained; pretrained.get_model('htdemucs')"
  ```

### 4. Docker GPU 不可用

```
错误：could not select device driver ""
```

**解决方案**：
- 安装 NVIDIA Container Toolkit：
  ```bash
  distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
  curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
  curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
  sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
  sudo systemctl restart docker
  ```

### 5. 音频格式不支持

```
错误：不支持的音频格式
```

**解决方案**：
- 支持的格式：`.wav`, `.mp3`, `.flac`, `.ogg`, `.m4a`, `.aac`, `.wma`, `.aiff`
- 使用 FFmpeg 转换格式：`ffmpeg -i input.xxx output.wav`

## 技术栈

- **Web 框架**：FastAPI + Uvicorn
- **音频分离**：Meta Demucs 4.0
- **MIDI 转录**：Spotify Basic Pitch 0.3
- **深度学习**：PyTorch 2.1 + CUDA 12.1
- **音频处理**：TorchAudio
- **数据验证**：Pydantic 2.9

## 许可证

MIT License
