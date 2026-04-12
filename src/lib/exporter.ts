import { TimelineTrack } from '@/types';

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
  _duration: number,
  options: ExportOptions,
  onProgress: ProgressCallback
): Promise<Blob> {
  onProgress({ status: 'preparing', progress: 0 });

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
    const appDataPath = await window.electronAPI.getAppPath('documents');
    const outputPath = `${appDataPath}/VibeStudio/exports/output_${Date.now()}.mp4`;

    const crfMap: Record<string, number> = { low: 28, medium: 23, high: 18 };
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

export function exportToEDL(tracks: TimelineTrack[], _duration: number): string {
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
