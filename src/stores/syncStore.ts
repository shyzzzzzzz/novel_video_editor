import { create } from 'zustand';

const SYNC_STORAGE_KEY = 'vibestudio_sync';

export interface SyncConfig {
  pat: string;        // GitHub Personal Access Token
  gistId: string;     // GitHub Gist ID
  filename: string;   // Filename within the Gist (e.g. "workspace.json")
}

interface SyncState {
  config: SyncConfig;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: string | null;

  setConfig: (config: Partial<SyncConfig>) => void;
  loadConfig: () => void;
  saveConfig: () => void;
  clearConfig: () => void;

  push: (data: object) => Promise<{ gistUrl: string }>;
  pull: () => Promise<object | null>;
}

const DEFAULT_CONFIG: SyncConfig = {
  pat: '',
  gistId: '',
  filename: 'vibestudio-workspace.json',
};

const API_BASE = 'http://localhost:18080/api';

export const useSyncStore = create<SyncState>((set, get) => ({
  config: { ...DEFAULT_CONFIG },
  lastSyncedAt: null,
  isSyncing: false,
  syncError: null,

  setConfig: (updates) => {
    set((state) => ({ config: { ...state.config, ...updates } }));
    get().saveConfig();
  },

  loadConfig: () => {
    try {
      const raw = localStorage.getItem(SYNC_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          config: { ...DEFAULT_CONFIG, ...data.config },
          lastSyncedAt: data.lastSyncedAt || null,
        });
      }
    } catch {
      // ignore
    }
  },

  saveConfig: () => {
    const { config, lastSyncedAt } = get();
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify({ config, lastSyncedAt }));
  },

  clearConfig: () => {
    localStorage.removeItem(SYNC_STORAGE_KEY);
    set({ config: { ...DEFAULT_CONFIG }, lastSyncedAt: null, syncError: null });
  },

  push: async (data) => {
    const { config } = get();
    if (!config.pat || !config.gistId) {
      throw new Error('请先配置 GitHub PAT 和 Gist ID');
    }

    set({ isSyncing: true, syncError: null });

    try {
      const content = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        ...data,
      }, null, 2);

      const resp = await fetch(`${API_BASE}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.pat}`,
        },
        body: JSON.stringify({
          gist_id: config.gistId,
          filename: config.filename,
          content,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }

      const result = await resp.json();
      const now = new Date().toISOString();
      set({ lastSyncedAt: now, isSyncing: false });
      get().saveConfig();

      return { gistUrl: result.gist_url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '同步失败';
      set({ syncError: msg, isSyncing: false });
      throw err;
    }
  },

  pull: async () => {
    const { config } = get();
    if (!config.pat || !config.gistId) {
      throw new Error('请先配置 GitHub PAT 和 Gist ID');
    }

    set({ isSyncing: true, syncError: null });

    try {
      const resp = await fetch(
        `${API_BASE}/sync/pull?gist_id=${encodeURIComponent(config.gistId)}&filename=${encodeURIComponent(config.filename)}`,
        {
          headers: {
            'Authorization': `Bearer ${config.pat}`,
          },
        }
      );

      if (resp.status === 404) {
        set({ isSyncing: false });
        return null; // Gist or file doesn't exist yet
      }

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(err.detail || `HTTP ${resp.status}`);
      }

      const result = await resp.json();
      const now = new Date().toISOString();
      set({ lastSyncedAt: now, isSyncing: false });
      get().saveConfig();

      if (!result.content) return null;
      return JSON.parse(result.content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '拉取失败';
      set({ syncError: msg, isSyncing: false });
      throw err;
    }
  },
}));
