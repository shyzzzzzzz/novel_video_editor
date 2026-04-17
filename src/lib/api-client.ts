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
  type: 'image' | 'video' | 'text';
  prompt: string;
  parameters?: Record<string, unknown>;
  firstFrameUrl?: string;
  lastFrameUrl?: string;
}

function getApiConfig(type: 'image' | 'video' | 'text') {
  const cat: ApiCategory = type === 'image' ? 'image' : type === 'video' ? 'video' : 'text';
  return useSettingsStore.getState().apis[cat];
}

/**
 * 生成文本（通过 OpenAI/DeepSeek/MiniMax 等兼容 API）
 */
export async function generateText(
  prompt: string,
  options?: {
    system?: string;
    maxTokens?: number;
    model?: string;
    temperature?: number;
  }
): Promise<string> {
  const config = getApiConfig('text');
  const provider = config.provider;

  // Mock 模式
  if (provider === 'mock') {
    return `[Mock 响应] 收到: ${prompt.slice(0, 50)}...`;
  }

  const baseUrl = config.baseUrl;
  const apiKey = config.apiKey;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  // 根据 provider 选择端点和默认模型
  let endpoint = '/v1/chat/completions';
  let defaultModel = 'gpt-4o';

  if (provider === 'deepseek') {
    endpoint = '/v1/chat/completions';
    defaultModel = 'deepseek-chat';
  } else if (provider === 'minimax') {
    endpoint = '/v1/chat/completions';
    defaultModel = 'MiniMax-M2.7';
  } else if (provider === 'openai') {
    endpoint = '/v1/chat/completions';
    defaultModel = 'gpt-4o';
  }

  // 优先级：options.model > config.model > defaultModel
  const model = options?.model || config.model || defaultModel;

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (options?.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Text generation error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  // OpenAI-compatible response format
  return data.choices?.[0]?.message?.content || data.content || '';
}

/**
 * 流式生成文本，支持 onChunk 回调
 */
export async function generateTextStream(
  prompt: string,
  options?: {
    system?: string;
    maxTokens?: number;
    model?: string;
    temperature?: number;
  },
  onChunk?: (text: string, done: boolean) => void
): Promise<string> {
  const config = getApiConfig('text');
  const provider = config.provider;

  // Mock 模式
  if (provider === 'mock') {
    const chunks = ['[', 'M', 'o', 'c', 'k', ' ', '响', '应', ']', ':', ' ', '收', '到'];
    for (const c of chunks) {
      await new Promise((r) => setTimeout(r, 50));
      onChunk?.(c, false);
    }
    onChunk?.('', true);
    return `[Mock 响应] 收到: ${prompt.slice(0, 50)}...`;
  }

  const baseUrl = config.baseUrl;
  const apiKey = config.apiKey;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  let endpoint = '/v1/chat/completions';
  let defaultModel = 'gpt-4o';

  if (provider === 'deepseek') {
    endpoint = '/v1/chat/completions';
    defaultModel = 'deepseek-chat';
  } else if (provider === 'minimax') {
    endpoint = '/v1/chat/completions';
    defaultModel = 'MiniMax-M2.7';
  } else if (provider === 'openai') {
    endpoint = '/v1/chat/completions';
    defaultModel = 'gpt-4o';
  }

  const model = options?.model || config.model || defaultModel;

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (options?.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Text generation error: ${response.status} - ${text}`);
  }

  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // SSE format: data: {...}\n\n
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          onChunk?.('', true);
          continue;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            onChunk?.(delta, false);
          }
        } catch {
          // ignore parse errors for incomplete JSON
        }
      }
    }
  }

  onChunk?.('', true);
  return fullContent;
}

export async function submitGenerationTask(options: GenerateOptions): Promise<string> {
  // Text generation doesn't use the render pipeline
  if (options.type === 'text') {
    throw new Error('Text generation should use generateText function');
  }

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
      body: JSON.stringify({
        prompt: options.prompt,
        ...options.parameters,
        // 首尾帧参考（仅视频生成时使用）
        ...(options.type === 'video' && options.firstFrameUrl && { first_frame_url: options.firstFrameUrl }),
        ...(options.type === 'video' && options.lastFrameUrl && { last_frame_url: options.lastFrameUrl }),
      }),
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
  parameters?: Record<string, unknown>,
  firstFrameUrl?: string,
  lastFrameUrl?: string
): Promise<string> {
  return submitGenerationTask({ type: 'video', prompt, parameters, firstFrameUrl, lastFrameUrl });
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

/**
 * 从视频URL提取最后一帧作为图片
 * 使用客户端 canvas 实现，适用于 blob URL 或 http URL
 */
export async function extractLastFrame(videoUrl: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;
    video.muted = true;

    video.onloadedmetadata = () => {
      // 跳到最后一秒
      video.currentTime = Math.max(0, video.duration - 0.1);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error('视频加载失败'));
    };

    video.load();
  });
}

/**
 * 将服务器相对路径解析为完整 URL
 * 兼容旧的 blob/data URL 格式
 */
export function resolveVideoUrl(serverPath: string): string {
  if (serverPath.startsWith('http') || serverPath.startsWith('data:') || serverPath.startsWith('blob:')) {
    return serverPath;
  }
  return `http://localhost:18080/storage/files/${serverPath}`;
}
