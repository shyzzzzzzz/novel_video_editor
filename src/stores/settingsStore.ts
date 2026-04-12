import { create } from 'zustand';

export type AIProvider = 'openai' | 'runway' | 'minimax' | 'mock';

export type ApiCategory = 'text' | 'image' | 'video';

export interface ApiConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
}

interface SettingsState {
  apis: Record<ApiCategory, ApiConfig>;
  setApi: (cat: ApiCategory, config: Partial<ApiConfig>) => void;
  load: () => void;
  save: () => void;
}

const STORAGE_KEY = 'vibestudio_settings';

const DEFAULT_APIS: Record<ApiCategory, ApiConfig> = {
  text: { provider: 'mock', apiKey: '', baseUrl: 'http://localhost:18080' },
  image: { provider: 'mock', apiKey: '', baseUrl: 'http://localhost:18080' },
  video: { provider: 'mock', apiKey: '', baseUrl: 'http://localhost:18080' },
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apis: { ...DEFAULT_APIS },

  setApi: (cat, config) => {
    set((state) => ({
      apis: {
        ...state.apis,
        [cat]: { ...state.apis[cat], ...config },
      },
    }));
    get().save();
  },

  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          apis: {
            text: { ...DEFAULT_APIS.text, ...(data.text || {}) },
            image: { ...DEFAULT_APIS.image, ...(data.image || {}) },
            video: { ...DEFAULT_APIS.video, ...(data.video || {}) },
          },
        });
      }
    } catch {
      // ignore
    }
  },

  save: () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(get().apis));
  },
}));
