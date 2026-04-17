import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routers import ffmpeg, storage, generation, sync, persist

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vibestudio")

STORAGE_ROOT = Path("D:/vibestudio_data")
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("VibeStudio API started on port 18080")
    yield
    logger.info("VibeStudio API shutting down")


app = FastAPI(
    title="VibeStudio API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ffmpeg.router, prefix="/api/ffmpeg", tags=["ffmpeg"])
app.include_router(storage.router, prefix="/api/storage", tags=["storage"])
app.include_router(generation.router, prefix="/api/generation", tags=["generation"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(persist.router, prefix="/api/persist", tags=["persist"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}


# 静态文件服务 — 让前端可以直接访问上传的视频/图片
app.mount("/storage/files", StaticFiles(directory=str(STORAGE_ROOT)), name="storage")
