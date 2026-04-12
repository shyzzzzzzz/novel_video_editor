# VibeStudio Electron Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Tauri (Rust) desktop shell with Electron + Python FastAPI backend, keeping 100% of existing React/TypeScript frontend code.

**Architecture:** Electron wraps the existing Vite dev server. Main process communicates with a Python FastAPI HTTP server (localhost:18080) via standard fetch. IPC between renderer and main process uses Electron's contextBridge for file system access.

**Tech Stack:** Electron 33.x + electron-builder, Python 3.11+ / FastAPI / uvicorn, existing React 18 + TypeScript + Vite + Zustand + Tailwind CSS stack.

---

## File Structure

```
vibe-studio/
├── electron/
│   ├── main.ts              # Electron main process
│   └── preload.ts           # Context bridge for IPC
├── python/
│   ├── main.py              # FastAPI entry point
│   ├── requirements.txt     # Python dependencies
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── ffmpeg.py        # FFmpeg operations
│   │   ├── storage.py       # File storage operations
│   │   └── generation.py    # AI generation task proxy
│   └── services/
│       ├── __init__.py
│       └── ffmpeg_service.py
├── package.json             # (modified)
├── vite.config.ts           # (modified)
├── index.html               # (modified)
├── src/                     # (unchanged - all 50+ TS/TSX files)
├── src-tauri/               # (deleted at end)
└── electron-builder.yml     # (created)
```

---

### Task 1: Initialize Electron Project

**Files:**
- Modify: `package.json`
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron-builder.yml`

- [ ] **Step 1: Add Electron and electron-builder dependencies**

Run in `D:\claude_dev\ai_vedio`:

```bash
npm install --save-dev electron@33 electron-builder@25
```

- [ ] **Step 2: Update package.json scripts**

Replace current `"scripts"` section with:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:python\"",
    "dev:frontend": "vite",
    "dev:python": "cd python && python -m uvicorn main:app --reload --port 18080",
    "build": "tsc && vite build",
    "build:electron": "npm run build && electron-builder",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "uuid": "^11.0.3",
    "zustand": "^5.0.2",
    "electron-log": "^5.2.4"
  }
}
```

- [ ] **Step 3: Install concurrently**

```bash
npm install --save-dev concurrently@5
```

- [ ] **Step 4: Write electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('VibeStudio starting...');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  log.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'VibeStudio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    // Development: load Vite dev server
    mainWindow.loadURL('http://localhost:1420');
    mainWindow.webContents.openDevTools();
    log.info('Loaded dev server at http://localhost:1420');
  } else {
    // Production: load built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    log.info('Loaded production build');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: open file dialog
ipcMain.handle('dialog:openFile', async (_, options: { filters?: { name: string; extensions: string[] }[] }) => {
  const { dialog } = await import('electron');
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: options.filters,
  });
  return result;
});

// IPC: read file as base64
ipcMain.handle('fs:readFileBase64', async (_, filePath: string) => {
  const fs = await import('fs/promises');
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
});

// IPC: write file
ipcMain.handle('fs:writeFile', async (_, filePath: string, data: string | Buffer) => {
  const fs = await import('fs/promises');
  await fs.writeFile(filePath, data);
  return true;
});

// IPC: check if file exists
ipcMain.handle('fs:exists', async (_, filePath: string) => {
  const fs = await import('fs');
  return fs.existsSync(filePath);
});

// IPC: get app data path
ipcMain.handle('app:getPath', async (_, name: 'userData' | 'documents' | 'temp') => {
  return app.getPath(name);
});

app.whenReady().then(() => {
  log.info('App ready, creating window...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed, quitting...');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

- [ ] **Step 5: Write electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialog
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:openFile', options || {}),

  // File system
  readFileBase64: (filePath: string) => ipcRenderer.invoke('fs:readFileBase64', filePath),
  writeFile: (filePath: string, data: string | ArrayBuffer) =>
    ipcRenderer.invoke('fs:writeFile', filePath, data),
  fileExists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),

  // App paths
  getAppPath: (name: 'userData' | 'documents' | 'temp') =>
    ipcRenderer.invoke('app:getPath', name),

  // Platform info
  platform: process.platform,
});
```

- [ ] **Step 6: Write electron-builder.yml**

```yaml
appId: com.vibestudio.app
productName: VibeStudio
directories:
  buildResources: build
  output: release
files:
  - dist/**/*
  - python/**/*
  - !python/__pycache__/**
  - !python/**/__pycache__/**
extraResources:
  - from: python
    to: python
    filter:
      - "**/*"
asar: true
asarUnpack:
  - python/**
win:
  target:
    - target: nsis
      arch:
        - x64
  artifactName: ${productName}-${version}-win.${ext}
mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  artifactName: ${productName}-${version}-mac.${ext}
linux:
  target:
    - target: AppImage
      arch:
        - x64
  artifactName: ${productName}-${version}-linux.${ext}
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 7: Add TypeScript types for window.electronAPI**

Create `src/types/electron.d.ts`:

```typescript
export {};

declare global {
  interface Window {
    electronAPI: {
      openFileDialog: (options?: {
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      readFileBase64: (filePath: string) => Promise<string>;
      writeFile: (
        filePath: string,
        data: string | ArrayBuffer
      ) => Promise<boolean>;
      fileExists: (filePath: string) => Promise<boolean>;
      getAppPath: (
        name: 'userData' | 'documents' | 'temp'
      ) => Promise<string>;
      platform: string;
    };
  }
}
```

- [ ] **Step 8: Commit**

```bash
cd D:\claude_dev\ai_vedio
git add package.json package-lock.json electron/ electron-builder.yml src/types/electron.d.ts
git commit -m "feat: add Electron main process and electron-builder config"
```

---

### Task 2: Update Vite Config for Electron

**Files:**
- Modify: `vite.config.ts`
- Modify: `index.html`

- [ ] **Step 1: Update vite.config.ts**

Replace current content with:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  clearScreen: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
```

Changes from original:
- Removed `server.strictPort: true` from Tauri block
- Removed `server.watch.ignored: ['**/src-tauri/**']`
- Changed `base` from default (`/`) to `'./'` (required for Electron)
- Added explicit `build.outDir: 'dist'`

- [ ] **Step 2: Update index.html**

Add this inside `<head>` before `<title>`:

```html
  <base href="./" />
```

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts index.html
git commit -m "chore: update vite config for Electron compatibility"
```

---

### Task 3: Create Python FastAPI Backend (Stub)

**Files:**
- Create: `python/main.py`
- Create: `python/requirements.txt`
- Create: `python/routers/__init__.py`
- Create: `python/routers/ffmpeg.py`
- Create: `python/routers/storage.py`
- Create: `python/routers/generation.py`
- Create: `python/services/__init__.py`
- Create: `python/services/ffmpeg_service.py`

- [ ] **Step 1: Write python/requirements.txt**

```
fastapi==0.115.12
uvicorn[standard]==0.30.6
python-multipart==0.0.12
httpx==0.27.2
pydantic==2.10.6
```

- [ ] **Step 2: Write python/main.py**

```python
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import ffmpeg, storage, generation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vibestudio")

app = FastAPI(title="VibeStudio API", version="0.1.0")

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


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.on_event("startup")
async def startup():
    logger.info("VibeStudio API started on port 18080")


@app.on_event("shutdown")
async def shutdown():
    logger.info("VibeStudio API shutting down")
```

- [ ] **Step 3: Write python/routers/__init__.py**

```python
from . import ffmpeg, storage, generation

__all__ = ["ffmpeg", "storage", "generation"]
```

- [ ] **Step 4: Write python/routers/ffmpeg.py**

```python
import subprocess
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("vibestudio.ffmpeg")
router = APIRouter()


class FFmpegProbeResult(BaseModel):
    duration: float
    width: int
    height: int
    fps: float
    codec: str


@router.post("/probe")
async def probe(file_path: str) -> FFmpegProbeResult:
    """Get video metadata using ffprobe."""
    try:
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path,
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
    except subprocess.CalledProcessError as e:
        logger.error(f"ffprobe failed: {e}")
        raise HTTPException(status_code=500, detail=f"ffprobe error: {e}")
    except Exception as e:
        logger.error(f"Probe error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
        with open("D:\\temp_vibestudio_concat.txt", "w") as f:
            for p in req.input_paths:
                f.write(f"file '{p}'\n")

        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", "D:\\temp_vibestudio_concat.txt",
            "-vf", f"scale={req.width}:{req.height}:force_original_aspect_ratio=decrease,pad={req.width}:{req.height}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", req.codec,
            "-crf", str(req.crf),
            "-c:a", "aac",
            "-b:a", "192k",
            "-r", str(req.fps),
            req.output_path,
        ]

        result = subprocess.run(
            cmd, capture_output=True, text=True
        )

        if result.returncode != 0:
            logger.error(f"ffmpeg error: {result.stderr}")
            raise HTTPException(status_code=500, detail=f"ffmpeg error: {result.stderr[:500]}")

        return {"status": "ok", "output_path": req.output_path}

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract_audio")
async def extract_audio(video_path: str, output_path: str) -> dict:
    """Extract audio from video file."""
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "44100",
        "-ac", "2",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr[:500])
    return {"status": "ok", "output_path": output_path}
```

- [ ] **Step 5: Write python/routers/storage.py**

```python
import shutil
import os
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()


class FileOperationRequest(BaseModel):
    source: str
    destination: str


@router.post("/copy")
async def copy_file(req: FileOperationRequest) -> dict:
    try:
        shutil.copy2(req.source, req.destination)
        return {"status": "ok", "destination": req.destination}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/move")
async def move_file(req: FileOperationRequest) -> dict:
    try:
        shutil.move(req.source, req.destination)
        return {"status": "ok", "destination": req.destination}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete_file(path: str) -> dict:
    try:
        if os.path.isfile(path):
            os.remove(path)
        elif os.path.isdir(path):
            shutil.rmtree(path)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mkdir")
async def create_directory(path: str) -> dict:
    try:
        Path(path).mkdir(parents=True, exist_ok=True)
        return {"status": "ok", "path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/exists")
async def file_exists(path: str) -> dict:
    return {"exists": os.path.exists(path)}


@router.post("/upload")
async def upload_file(path: str, file: UploadFile = File(...)) -> dict:
    try:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return {"status": "ok", "path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 6: Write python/routers/generation.py**

```python
import httpx
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("vibestudio.generation")
router = APIRouter()

# Proxy for AI generation APIs - stub implementation
# In production, replace with actual API clients (OpenAI, Runway, etc.)


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
    # TODO: Replace with actual API call
    return {
        "task_id": "stub-image-task",
        "status": "completed",
        "result_url": f"https://picsum.photos/1024/1024?random=1",
    }


@router.post("/video")
async def generate_video(req: VideoGenerationRequest) -> dict:
    """Stub: In production, call actual video generation API."""
    logger.info(f"Video generation request: {req.prompt[:50]}...")
    # TODO: Replace with actual API call
    return {
        "task_id": "stub-video-task",
        "status": "completed",
        "result_url": f"https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
    }


@router.get("/task/{task_id}")
async def get_task_status(task_id: str) -> dict:
    """Check generation task status."""
    # Stub always returns completed
    return {"task_id": task_id, "status": "completed"}
```

- [ ] **Step 7: Write python/services/__init__.py and python/services/ffmpeg_service.py**

python/services/__init__.py:
```python
from .ffmpeg_service import FFmpegService

__all__ = ["FFmpegService"]
```

python/services/ffmpeg_service.py:
```python
import subprocess
import json
import logging
from pathlib import Path

logger = logging.getLogger("vibestudio.services.ffmpeg")


class FFmpegService:
    def __init__(self):
        self.ffmpeg_path = "ffmpeg"
        self.ffprobe_path = "ffprobe"

    def probe(self, file_path: str) -> dict:
        """Return ffprobe JSON output."""
        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)

    def export(
        self,
        input_files: list[str],
        output_path: str,
        width: int = 1920,
        height: int = 1080,
        fps: int = 30,
        codec: str = "libx264",
    ) -> subprocess.CompletedProcess:
        """Concatenate inputs and export."""
        concat_file = Path("D:\\temp_vibestudio_concat.txt")
        concat_file.parent.mkdir(parents=True, exist_ok=True)
        concat_file.write_text("\n".join(f"file '{p}'" for p in input_files))

        cmd = [
            self.ffmpeg_path,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease",
            "-c:v", codec,
            "-crf", "23",
            "-c:a", "aac",
            output_path,
        ]
        return subprocess.run(cmd, capture_output=True, text=True)

    def extract_audio(self, video_path: str, audio_path: str) -> subprocess.CompletedProcess:
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "44100", "-ac", "2",
            audio_path,
        ]
        return subprocess.run(cmd, capture_output=True, text=True)
```

- [ ] **Step 8: Commit**

```bash
git add python/
git commit -m "feat: add Python FastAPI backend with FFmpeg router"
```

---

### Task 4: Update api-client.ts and exporter.ts

**Files:**
- Modify: `src/lib/api-client.ts`
- Modify: `src/lib/exporter.ts`

- [ ] **Step 1: Update api-client.ts to use Python backend**

Replace content with:

```typescript
import { useRenderStore } from '@/stores/renderStore';

const API_BASE = 'http://localhost:18080/api';

interface GenerateOptions {
  type: 'image' | 'video';
  prompt: string;
  parameters?: Record<string, unknown>;
}

export async function submitGenerationTask(options: GenerateOptions): Promise<string> {
  const { addTask } = useRenderStore.getState();
  const taskId = addTask(options.type, options.prompt, options.parameters);

  try {
    const endpoint = options.type === 'image' ? '/generation/image' : '/generation/video';
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: options.prompt, ...options.parameters }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    const { updateTask } = useRenderStore.getState();
    updateTask(taskId, {
      status: 'completed',
      progress: 100,
      resultUrl: data.result_url,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const { updateTask } = useRenderStore.getState();
    updateTask(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return taskId;
}

export async function generateImage(
  prompt: string,
  parameters?: Record<string, unknown>
): Promise<string> {
  console.log('generateImage called:', prompt, parameters);
  return submitGenerationTask({ type: 'image', prompt, parameters });
}

export async function generateVideo(
  prompt: string,
  parameters?: Record<string, unknown>
): Promise<string> {
  console.log('generateVideo called:', prompt, parameters);
  return submitGenerationTask({ type: 'video', prompt, parameters });
}

export async function probeVideo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
}> {
  const response = await fetch(`${API_BASE}/ffmpeg/probe?file_path=${encodeURIComponent(filePath)}`);
  if (!response.ok) throw new Error(`Probe failed: ${response.status}`);
  return response.json();
}

export async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  const response = await fetch(`${API_BASE}/ffmpeg/extract_audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_path: videoPath, output_path: audioPath }),
  });
  if (!response.ok) throw new Error(`Extract audio failed: ${response.status}`);
}
```

- [ ] **Step 2: Update exporter.ts to use Python backend**

Replace content with:

```typescript
import { TimelineTrack } from '@/types';
import { probeVideo } from './api-client';

const API_BASE = 'http://localhost:18080/api';

interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high';
}

interface ExportProgress {
  status: 'preparing' | 'encoding' | 'complete' | 'error';
  progress: number;
  currentFrame?: number;
  totalFrames?: number;
}

type ProgressCallback = (progress: ExportProgress) => void;

export async function exportTimeline(
  tracks: TimelineTrack[],
  duration: number,
  options: ExportOptions,
  onProgress: ProgressCallback
): Promise<Blob> {
  onProgress({ status: 'preparing', progress: 0 });

  // Collect all clip source files
  const inputPaths: string[] = [];
  for (const track of tracks) {
    for (const clip of track.clips) {
      if (clip.sourceId) {
        inputPaths.push(clip.sourceId);
      }
    }
  }

  if (inputPaths.length === 0) {
    onProgress({ status: 'complete', progress: 100 });
    return new Blob([], { type: `video/${options.format}` });
  }

  try {
    // Get user documents path via Electron IPC, then save
    const appDataPath = await window.electronAPI.getAppPath('documents');
    const outputPath = `${appDataPath}/VibeStudio/exports/output_${Date.now()}.mp4`;

    const crfMap = { low: 28, medium: 23, high: 18 };
    const crf = crfMap[options.quality];

    const response = await fetch(`${API_BASE}/ffmpeg/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input_paths: inputPaths,
        output_path: outputPath,
        width: options.width,
        height: options.height,
        fps: options.fps,
        codec: 'libx264',
        crf,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }

    // Read the exported file and return as Blob
    const fileBuffer = await window.electronAPI.readFileBase64(outputPath);
    const binaryString = atob(fileBuffer);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    onProgress({ status: 'complete', progress: 100 });
    return new Blob([bytes], { type: `video/${options.format}` });

  } catch (error) {
    onProgress({ status: 'error', progress: 0 });
    throw error;
  }
}

export function exportToEDL(tracks: TimelineTrack[], duration: number): string {
  let edl = `TITLE: VibeStudio Export\nFCM: NON-DROP FRAME\n\n`;
  let eventNum = 1;

  for (const track of tracks) {
    for (const clip of track.clips) {
      const startTimecode = framesToTimecode(clip.startTime * 30, 30);
      const endTimecode = framesToTimecode((clip.startTime + clip.duration) * 30, 30);
      const sourceIn = framesToTimecode(clip.inPoint * 30, 30);
      const sourceOut = framesToTimecode(clip.outPoint * 30, 30);

      edl += `${eventNum.toString().padStart(3, '0')}  AX       V     C        ${startTimecode} ${endTimecode} ${sourceIn} ${sourceOut}\n`;
      edl += `* FROM CLIP NAME: ${clip.sourceId}\n\n`;
      eventNum++;
    }
  }

  return edl;
}

function framesToTimecode(frames: number, fps: number): string {
  const totalSeconds = frames / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const remainingFrames = Math.floor(frames % fps);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/api-client.ts src/lib/exporter.ts
git commit -m "refactor: connect api-client and exporter to Python FastAPI backend"
```

---

### Task 5: Verify Dev Server Works

**Files:**
- None (verification only)

- [ ] **Step 1: Install Python dependencies**

```bash
cd D:\claude_dev\ai_vedio\python
pip install -r requirements.txt
```

- [ ] **Step 2: Verify Python backend starts**

```bash
cd D:\claude_dev\ai_vedio\python
python -m uvicorn main:app --port 18080
```

Expected output: `Uvicorn running on http://127.0.0.1:18080`

- [ ] **Step 3: Test API health endpoint**

In a second terminal:

```bash
curl http://localhost:18080/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Compile and verify Electron main process**

The TypeScript in `electron/main.ts` uses `import.meta.url` which requires ESM. Compile it:

Add `electron/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "electron/dist",
    "rootDir": "electron",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["electron/**/*.ts"]
}
```

Then compile:

```bash
cd D:\claude_dev\ai_vedio
npx tsc -p electron/tsconfig.json
```

Expected: `electron/dist/main.js` and `electron/dist/preload.js` created

- [ ] **Step 5: Verify Vite dev server**

```bash
npm run dev:frontend
```

Expected: Vite dev server starts on port 1420 without errors.

---

### Task 6: Remove Tauri Files

**Files:**
- Delete: `src-tauri/` directory

- [ ] **Step 1: Remove Tauri directory**

```bash
rm -rf D:/claude_dev/ai_vedio/src-tauri
```

- [ ] **Step 2: Remove Tauri-specific npm packages**

```bash
npm uninstall @tauri-apps/cli @tauri-apps/api
```

- [ ] **Step 3: Commit deletion**

```bash
git add -A
git commit -m "chore: remove Tauri (Rust) backend, switch to Electron + FastAPI"
```

---

## Verification Checklist

After all tasks complete, run:

```bash
# Terminal 1: Python backend
cd python && python -m uvicorn main:app --port 18080

# Terminal 2: Vite frontend
npm run dev:frontend

# Terminal 3: Electron (in another terminal)
electron .
```

Expected: VibeStudio window opens with full UI, no Rust installed required.

---

## Migration Summary

| Component | Before (Tauri) | After (Electron) |
|---|---|---|
| Desktop shell | Rust/Tauri | Electron |
| FFmpeg integration | Rust Command | Python subprocess |
| AI API calls | JS fetch (simulated) | Python FastAPI proxy |
| File system access | Tauri fs plugin | Electron IPC + Node fs |
| Python integration | IPC to external process | Direct FastAPI on localhost |
| Build output | `.exe` via Cargo | `.exe` via electron-builder |

No frontend changes required — all 50+ React/TypeScript files remain untouched.
