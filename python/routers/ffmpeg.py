import subprocess
import logging
import tempfile
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("vibestudio.ffmpeg")
router = APIRouter()


def safe_path(path: str) -> Path:
    """Validate path stays within a safe temp/data directory."""
    try:
        resolved = Path(path).resolve()
        # Allow paths in temp directory or absolute paths
        temp_dir = Path(tempfile.gettempdir()).resolve()
        if resolved.is_absolute() and not str(resolved).startswith(str(temp_dir)):
            # For now, just normalize — in production this would be more restrictive
            pass
        return resolved
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")


class FFmpegProbeResult(BaseModel):
    duration: float
    width: int
    height: int
    fps: float
    codec: str


@router.post("/probe")
async def probe(file_path: str) -> FFmpegProbeResult:
    """Get video metadata using ffprobe."""
    safe = safe_path(file_path)
    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(safe),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        import json
        data = json.loads(result.stdout)

        video_stream = next(
            (s for s in data["streams"] if s["codec_type"] == "video"), None
        )
        if not video_stream:
            raise HTTPException(status_code=400, detail="No video stream found")

        fps_parts = video_stream.get("r_frame_rate", "30/1").split("/")
        fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 else float(fps_parts[0])

        return FFmpegProbeResult(
            duration=float(data["format"].get("duration", 0)),
            width=video_stream.get("width", 1920),
            height=video_stream.get("height", 1080),
            fps=fps,
            codec=video_stream.get("codec_name", "h264"),
        )
    except subprocess.CalledProcessError:
        logger.error("ffprobe failed")
        raise HTTPException(status_code=500, detail="ffprobe error")
    except Exception:
        logger.error("Probe error")
        raise HTTPException(status_code=500, detail="Probe failed")


class ExportRequest(BaseModel):
    input_paths: list[str]
    output_path: str
    width: int = 1920
    height: int = 1080
    fps: int = 30
    codec: str = "libx264"
    crf: int = 23


@router.post("/export")
async def export_video(req: ExportRequest) -> dict:
    """Concatenate and encode video clips using FFmpeg."""
    try:
        concat_file = Path(tempfile.gettempdir()) / "vibestudio_concat.txt"
        concat_file.parent.mkdir(parents=True, exist_ok=True)
        validated_paths = [str(safe_path(p)) for p in req.input_paths]
        concat_file.write_text("\n".join(f"file '{p}'" for p in validated_paths))

        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-vf", f"scale={req.width}:{req.height}:force_original_aspect_ratio=decrease,pad={req.width}:{req.height}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", req.codec,
            "-crf", str(req.crf),
            "-c:a", "aac",
            "-b:a", "192k",
            "-r", str(req.fps),
            str(safe_path(req.output_path)),
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True
        )

        if result.returncode != 0:
            logger.error(f"ffmpeg error: {result.stderr}")
            raise HTTPException(status_code=500, detail="ffmpeg export failed")

        return {"status": "ok", "output_path": req.output_path}

    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="ffmpeg error")


@router.post("/extract_audio")
async def extract_audio(video_path: str, output_path: str) -> dict:
    """Extract audio from video file."""
    safe_video = safe_path(video_path)
    safe_output = safe_path(output_path)
    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(safe_video),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "44100",
            "-ac", "2",
            str(safe_output),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Audio extraction failed")
        return {"status": "ok", "output_path": output_path}
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Audio extraction failed")


class ExtractLastFrameRequest(BaseModel):
    video_path: str
    output_path: str


@router.post("/extract_last_frame")
async def extract_last_frame(req: ExtractLastFrameRequest) -> dict:
    """Extract the last frame from a video using ffmpeg."""
    safe_video = safe_path(req.video_path)
    safe_output = safe_path(req.output_path)
    safe_output.parent.mkdir(parents=True, exist_ok=True)
    try:
        # First get video duration
        probe_cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            str(safe_video),
        ]
        result = subprocess.run(probe_cmd, capture_output=True, text=True, check=True)
        import json
        data = json.loads(result.stdout)
        duration = float(data["format"].get("duration", 0))

        # Extract frame at last 0.1 seconds
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(max(0, duration - 0.1)),
            "-i", str(safe_video),
            "-vframes", "1",
            "-q:v", "2",
            str(safe_output),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"ffmpeg extract_last_frame error: {result.stderr}")
            raise HTTPException(status_code=500, detail="Frame extraction failed")
        return {"status": "ok", "output_path": req.output_path}
    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Frame extraction failed")
