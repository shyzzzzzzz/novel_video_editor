import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ffmpeg, storage, generation, sync

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vibestudio")


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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
