#!/bin/bash
# ============================================
# SonicPlay 音频处理微服务 - 一键安装脚本
# 适用于 RTX 5070 GPU 笔记本（非 Docker 方式）
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # 无颜色

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  SonicPlay 音频处理微服务 - 安装脚本${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ==================== 1. 检查 Python 版本 ====================

echo -e "${YELLOW}[1/6] 检查 Python 环境...${NC}"

if command -v python3.11 &> /dev/null; then
    PYTHON_CMD="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+')
    if [[ "$PYTHON_VERSION" == "3.11" ]]; then
        PYTHON_CMD="python3"
    else
        echo -e "${RED}错误：需要 Python 3.11，当前版本：$(python3 --version)${NC}"
        echo -e "${YELLOW}请安装 Python 3.11：${NC}"
        echo "  Ubuntu/Debian: sudo apt install python3.11 python3.11-venv"
        echo "  或使用 pyenv: pyenv install 3.11"
        exit 1
    fi
else
    echo -e "${RED}错误：未找到 Python 3${NC}"
    echo "请先安装 Python 3.11"
    exit 1
fi

echo -e "${GREEN}  Python 版本：$($PYTHON_CMD --version)${NC}"

# ==================== 2. 检查 CUDA ====================

echo -e "${YELLOW}[2/6] 检查 CUDA 环境...${NC}"

CUDA_AVAILABLE=false

if command -v nvcc &> /dev/null; then
    NVCC_VERSION=$(nvcc --version | grep "release" | grep -oP '\d+\.\d+')
    echo -e "${GREEN}  NVCC 版本：$NVCC_VERSION${NC}"
    CUDA_AVAILABLE=true
elif command -v nvidia-smi &> /dev/null; then
    echo -e "${GREEN}  nvidia-smi 可用${NC}"
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null | while read line; do
        echo -e "${GREEN}  GPU：$line${NC}"
    done
    CUDA_AVAILABLE=true
else
    echo -e "${YELLOW}  警告：未检测到 CUDA/nvidia-smi${NC}"
    echo -e "${YELLOW}  将安装 CPU 版本的 PyTorch（处理速度较慢）${NC}"
fi

# ==================== 3. 创建虚拟环境 ====================

echo -e "${YELLOW}[3/6] 创建 Python 虚拟环境...${NC}"

VENV_DIR="venv"

if [ ! -d "$VENV_DIR" ]; then
    $PYTHON_CMD -m venv $VENV_DIR
    echo -e "${GREEN}  虚拟环境已创建：$VENV_DIR${NC}"
else
    echo -e "${GREEN}  虚拟环境已存在：$VENV_DIR${NC}"
fi

# 激活虚拟环境
source $VENV_DIR/bin/activate
echo -e "${GREEN}  虚拟环境已激活${NC}"

# 升级 pip
pip install --upgrade pip setuptools wheel

# ==================== 4. 安装 PyTorch ====================

echo -e "${YELLOW}[4/6] 安装 PyTorch...${NC}"

if [ "$CUDA_AVAILABLE" = true ]; then
    # 检测 CUDA 版本以选择合适的 PyTorch
    echo -e "${GREEN}  检测到 GPU，安装 CUDA 版本 PyTorch...${NC}"
    pip install torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cu121
else
    echo -e "${YELLOW}  未检测到 GPU，安装 CPU 版本 PyTorch...${NC}"
    pip install torch==2.1.0 torchaudio==2.1.0 --index-url https://download.pytorch.org/whl/cpu
fi

echo -e "${GREEN}  PyTorch 安装完成${NC}"

# ==================== 5. 安装其他依赖 ====================

echo -e "${YELLOW}[5/6] 安装其他依赖...${NC}"

pip install -r requirements.txt

echo -e "${GREEN}  所有依赖安装完成${NC}"

# ==================== 6. 验证安装 ====================

echo -e "${YELLOW}[6/6] 验证安装...${NC}"

echo ""
echo -e "${BLUE}--- 验证 PyTorch ---${NC}"
$PYTHON_CMD -c "
import torch
print(f'PyTorch 版本：{torch.__version__}')
if torch.cuda.is_available():
    print(f'CUDA 可用：是')
    print(f'GPU 数量：{torch.cuda.device_count()}')
    for i in range(torch.cuda.device_count()):
        props = torch.cuda.get_device_properties(i)
        print(f'GPU {i}：{props.name}')
        print(f'  显存：{props.total_mem / 1024**3:.1f} GB')
else:
    print('CUDA 可用：否（将使用 CPU 模式）')
"

echo ""
echo -e "${BLUE}--- 验证 Demucs ---${NC}"
$PYTHON_CMD -c "
try:
    import demucs
    print(f'Demucs 版本：{demucs.__version__}')
    print('Demucs 导入成功')
except Exception as e:
    print(f'Demucs 导入失败：{e}')
"

echo ""
echo -e "${BLUE}--- 验证 Basic Pitch ---${NC}"
$PYTHON_CMD -c "
try:
    import basic_pitch
    print(f'Basic Pitch 版本：{basic_pitch.__version__}')
    print('Basic Pitch 导入成功')
except Exception as e:
    print(f'Basic Pitch 导入失败：{e}')
"

echo ""
echo -e "${BLUE}--- 验证 FastAPI ---${NC}"
$PYTHON_CMD -c "
import fastapi
import uvicorn
print(f'FastAPI 版本：{fastapi.__version__}')
print(f'Uvicorn 版本：{uvicorn.__version__}')
print('FastAPI 导入成功')
"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "启动服务："
echo -e "  ${BLUE}source venv/bin/activate${NC}"
echo -e "  ${BLUE}bash run.sh${NC}"
echo ""
echo -e "或直接运行："
echo -e "  ${BLUE}source venv/bin/activate && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000${NC}"
echo ""
