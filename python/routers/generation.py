import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("vibestudio.generation")
router = APIRouter()


class ImageGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "dall-e-3"
    size: Optional[str] = "1024x1024"


class VideoGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "runway-gen3"
    duration: Optional[int] = 10


@router.post("/image")
async def generate_image(req: ImageGenerationRequest) -> dict:
    """Stub: In production, call actual image generation API."""
    logger.info(f"Image generation request: {req.prompt[:50]}...")
    return {
        "task_id": "stub-image-task",
        "status": "completed",
        "result_url": f"https://picsum.photos/1024/1024?random=1",
    }


@router.post("/video")
async def generate_video(req: VideoGenerationRequest) -> dict:
    """Stub: In production, call actual video generation API."""
    logger.info(f"Video generation request: {req.prompt[:50]}...")
    return {
        "task_id": "stub-video-task",
        "status": "completed",
        "result_url": f"https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
    }


@router.get("/task/{task_id}")
async def get_task_status(task_id: str) -> dict:
    """Check generation task status."""
    return {"task_id": task_id, "status": "completed"}
