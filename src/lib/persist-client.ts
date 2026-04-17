/**
 * 统一持久化客户端
 * 负责将 Zustand stores 的数据保存到后端 JSON 文件
 */

const API_BASE = 'http://localhost:18080/api/persist';

interface PersistResult<T> {
  status: 'ok' | 'error';
  data?: T;
  message?: string;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(url, options);
  if (!resp.ok) {
    throw new Error(`Persist API error: ${resp.status} ${resp.statusText}`);
  }
  return resp.json();
}

/**
 * 加载指定 entity 的数据
 */
export async function loadPersistedData<T>(entity: string): Promise<T | null> {
  try {
    const result = await fetchJSON<PersistResult<T>>(`${API_BASE}/${entity}`);
    if (result.status === 'ok' && result.data !== undefined) {
      return result.data as T;
    }
    return null;
  } catch (err) {
    console.warn(`[persist] Failed to load ${entity}:`, err);
    return null;
  }
}

/**
 * 保存指定 entity 的数据
 */
export async function savePersistedData<T>(entity: string, data: T): Promise<void> {
  try {
    await fetchJSON(`${API_BASE}/${entity}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn(`[persist] Failed to save ${entity}:`, err);
  }
}

/**
 * 防抖保存函数
 */
export function createDebouncedSave<T>(
  entity: string,
  delayMs: number = 300
): (data: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (data: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      savePersistedData(entity, data);
      timer = null;
    }, delayMs);
  };
}

/**
 * 加载所有实体数据
 */
export async function loadAllData(): Promise<Record<string, unknown>> {
  try {
    const result = await fetchJSON<{ status: string; data: Record<string, unknown> }>(`${API_BASE}/`);
    return result.data || {};
  } catch (err) {
    console.warn('[persist] Failed to load all data:', err);
    return {};
  }
}
