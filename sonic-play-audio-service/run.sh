#!/bin/bash
# ============================================
# SonicPlay 音频处理微服务 - 启动脚本
# ============================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 激活虚拟环境（如果存在）
if [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}虚拟环境已激活${NC}"
else
    echo -e "${YELLOW}警告：未找到虚拟环境，使用系统 Python${NC}"
fi

# ==================== 显示 GPU 信息 ====================

echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  SonicPlay 音频处理微服务${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

python -c "
import torch
if torch.cuda.is_available():
    print('GPU 信息：')
    for i in range(torch.cuda.device_count()):
        props = torch.cuda.get_device_properties(i)
        mem_used = torch.cuda.memory_allocated(i) / (1024**3)
        mem_total = props.total_mem / (1024**3)
        print(f'  GPU {i}: {props.name}')
        print(f'  显存: {mem_total:.1f} GB (已用: {mem_used:.2f} GB)')
        print(f'  CUDA: {torch.version.cuda}')
    print()
else:
    print('警告：GPU 不可用，将使用 CPU 模式（处理速度较慢）')
    print()
"

# ==================== 启动服务 ====================

echo -e "${GREEN}正在启动服务...${NC}"
echo -e "${GREEN}API 文档：http://localhost:8000/docs${NC}"
echo -e "${GREEN}健康检查：http://localhost:8000/health${NC}"
echo ""

# 启动 Uvicorn
python -m uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 1 \
    --log-level info \
    --reload
