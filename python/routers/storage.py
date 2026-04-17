import shutil
import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()

ALLOWED_ROOT = Path("D:/vibestudio_data")

def safe_path(path: str) -> Path:
    """Validate path stays within ALLOWED_ROOT to prevent traversal."""
    try:
        resolved = (ALLOWED_ROOT / path).resolve()
        if not str(resolved).startswith(str(ALLOWED_ROOT.resolve())):
            raise HTTPException(status_code=403, detail="Path outside allowed directory")
        return resolved
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")


class FileOperationRequest(BaseModel):
    source: str
    destination: str


@router.post("/copy")
async def copy_file(req: FileOperationRequest) -> dict:
    try:
        src = safe_path(req.source)
        dst = safe_path(req.destination)
        shutil.copy2(src, dst)
        return {"status": "ok", "destination": str(dst)}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Storage operation failed")


@router.post("/move")
async def move_file(req: FileOperationRequest) -> dict:
    try:
        src = safe_path(req.source)
        dst = safe_path(req.destination)
        shutil.move(src, dst)
        return {"status": "ok", "destination": str(dst)}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Storage operation failed")


@router.post("/delete")
async def delete_file(path: str) -> dict:
    try:
        p = safe_path(path)
        if p.is_file():
            os.remove(p)
        elif p.is_dir():
            shutil.rmtree(p)
        return {"status": "ok"}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception:
        raise HTTPException(status_code=500, detail="Storage operation failed")


@router.post("/mkdir")
async def create_directory(path: str) -> dict:
    try:
        p = safe_path(path)
        p.mkdir(parents=True, exist_ok=True)
        return {"status": "ok", "path": str(p)}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception:
        raise HTTPException(status_code=500, detail="Storage operation failed")


@router.get("/exists")
async def file_exists(path: str) -> dict:
    p = safe_path(path)
    return {"exists": p.exists()}


@router.post("/upload")
async def upload_file(path: str, file: UploadFile = File(...)) -> dict:
    try:
        p = safe_path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return {"status": "ok", "path": str(p)}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception:
        raise HTTPException(status_code=500, detail="Storage operation failed")


class WriteTextRequest(BaseModel):
    content: str


@router.get("/read")
async def read_text(path: str) -> dict:
    """Read text file content."""
    try:
        p = safe_path(path)
        if not p.exists():
            raise HTTPException(status_code=404, detail="File not found")
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()
        return {"status": "ok", "content": content}
    except HTTPException:
        raise
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not valid text")
    except Exception:
        raise HTTPException(status_code=500, detail="Read operation failed")


@router.post("/write")
async def write_text(path: str, req: WriteTextRequest) -> dict:
    """Write text content to file."""
    try:
        p = safe_path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write(req.content)
        return {"status": "ok", "path": str(p)}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception:
        raise HTTPException(status_code=500, detail="Write operation failed")
