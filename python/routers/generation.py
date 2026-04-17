import logging
import os
from typing import Optional, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("vibestudio.generation")
router = APIRouter()

# 尝试导入 anthropic SDK
try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("anthropic SDK not installed, pip install anthropic")


def get_anthropic_client() -> Optional[Anthropic]:
    """创建 Anthropic 客户端，用于 MiniMax M2.7 等兼容 API."""
    if not ANTHROPIC_AVAILABLE:
        return None

    api_key = os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("MINIMAX_API_KEY")
    base_url = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("MINIMAX_BASE_URL", "https://api.minimaxi.com/anthropic")

    if not api_key:
        return None

    return Anthropic(
        api_key=api_key,
        base_url=base_url,
    )


class TextGenerationRequest(BaseModel):
    prompt: str
    system: Optional[str] = None
    max_tokens: Optional[int] = 4096
    model: Optional[str] = "MiniMax-M2.7"
    temperature: Optional[float] = 0.7


class ImageGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "dall-e-3"
    size: Optional[str] = "1024x1024"


class VideoGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "runway-gen3"
    duration: Optional[int] = 10
    first_frame_url: Optional[str] = None
    last_frame_url: Optional[str] = None


@router.post("/text")
async def generate_text(req: TextGenerationRequest) -> dict:
    """使用 Anthropic API 兼容接口生成文本（支持 MiniMax M2.7 等）."""
    logger.info(f"Text generation request: {req.prompt[:50]}... model={req.model}")

    client = get_anthropic_client()
    if not client:
        # Mock 模式
        logger.info("No API key configured, returning mock response")
        return {
            "task_id": "mock-text-task",
            "status": "completed",
            "content": f"[Mock 响应] 收到: {req.prompt[:100]}...",
            "model": req.model,
        }

    try:
        message = client.messages.create(
            model=req.model or "MiniMax-M2.7",
            max_tokens=req.max_tokens or 4096,
            system=req.system or "You are a helpful AI assistant.",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": req.prompt,
                        }
                    ]
                }
            ],
        )

        # 提取响应内容
        text_content = ""
        for block in message.content:
            if hasattr(block, 'text'):
                text_content += block.text
            elif hasattr(block, 'thinking'):
                # MiniMax M2.7 的 thinking 块
                logger.info(f"Thinking block: {block.thinking[:100]}...")

        return {
            "task_id": message.id,
            "status": "completed",
            "content": text_content,
            "model": req.model,
            "usage": {
                "input_tokens": message.usage.input_tokens if hasattr(message, 'usage') else 0,
                "output_tokens": message.usage.output_tokens if hasattr(message, 'usage') else 0,
            },
        }
    except Exception as e:
        logger.error(f"Text generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image")
async def generate_image(req: ImageGenerationRequest) -> dict:
    """生成图像（暂为 stub）."""
    logger.info(f"Image generation request: {req.prompt[:50]}...")
    return {
        "task_id": "stub-image-task",
        "status": "completed",
        "result_url": f"https://picsum.photos/1024/1024?random=1",
    }


@router.post("/video")
async def generate_video(req: VideoGenerationRequest) -> dict:
    """生成视频（暂为 stub）."""
    logger.info(f"Video generation request: {req.prompt[:50]}...")
    logger.info(f"  first_frame_url: {req.first_frame_url}")
    logger.info(f"  last_frame_url: {req.last_frame_url}")
    return {
        "task_id": "stub-video-task",
        "status": "completed",
        "result_url": f"https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
    }


@router.get("/task/{task_id}")
async def get_task_status(task_id: str) -> dict:
    """检查生成任务状态."""
    return {"task_id": task_id, "status": "completed"}
