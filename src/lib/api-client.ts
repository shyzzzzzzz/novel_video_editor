import { useRenderStore } from '@/stores/renderStore';
import { useSettingsStore, ApiCategory } from '@/stores/settingsStore';

function getBaseUrl(): string {
  try {
    return useSettingsStore.getState().apis.text.baseUrl;
  } catch {
    return 'http://localhost:18080';
  }
}

interface GenerateOptions {
  type: 'image' | 'video';
  prompt: string;
  parameters?: Record<string, unknown>;
}

function getApiConfig(type: 'image' | 'video') {
  const cat: ApiCategory = type === 'image' ? 'image' : 'video';
  return useSettingsStore.getState().apis[cat];
}

export async function submitGenerationTask(options: GenerateOptions): Promise<string> {
  const { addTask } = useRenderStore.getState();
  const taskId = addTask(options.type, options.prompt, options.parameters);

  const config = getApiConfig(options.type);
  const provider = config.provider;

  // Mock mode — return fake result immediately
  if (provider === 'mock') {
    const mockUrl = `https://picsum.photos/1280/720?random=${Date.now()}`;
    useRenderStore.getState().updateTask(taskId, {
      status: 'completed',
      progress: 100,
      resultUrl: mockUrl,
      completedAt: new Date().toISOString(),
    });
    return taskId;
  }

  try {
    const baseUrl = config.baseUrl;
    const endpoint = options.type === 'image' ? '/generation/image' : '/generation/video';
    const apiKey = config.apiKey;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt: options.prompt, ...options.parameters }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    useRenderStore.getState().updateTask(taskId, {
      status: 'completed',
      progress: 100,
      resultUrl: data.result_url,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    useRenderStore.getState().updateTask(taskId, {
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
  return submitGenerationTask({ type: 'image', prompt, parameters });
}

export async function generateVideo(
  prompt: string,
  parameters?: Record<string, unknown>
): Promise<string> {
  return submitGenerationTask({ type: 'video', prompt, parameters });
}

export async function probeVideo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
}> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/ffmpeg/probe?file_path=${encodeURIComponent(filePath)}`);
  if (!response.ok) throw new Error(`Probe failed: ${response.status}`);
  return response.json();
}

export async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/ffmpeg/extract_audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_path: videoPath, output_path: audioPath }),
  });
  if (!response.ok) throw new Error(`Extract audio failed: ${response.status}`);
}
