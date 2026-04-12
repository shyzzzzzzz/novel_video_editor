import { create } from 'zustand';
import { Script, ScriptVersion } from '@/types';
import { v4 as uuid } from 'uuid';

interface ScriptState {
  currentScript: Script | null;
  createScript: (episodeId: string, title: string, content: string) => Script;
  loadScript: (script: Script) => void;
  updateScript: (id: string, updates: Partial<Pick<Script, 'title' | 'content'>>) => void;
  saveVersion: (scriptId: string) => void;
  revertToVersion: (scriptId: string, versionId: string) => void;
  deleteScript: (episodeId: string, scriptId: string) => void;
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  currentScript: null,

  createScript: (episodeId, title, content) => {
    const script: Script = {
      id: uuid(),
      title,
      content,
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return script;
  },

  loadScript: (script) => set({ currentScript: script }),

  updateScript: (id, updates) =>
    set((state) => {
      if (!state.currentScript || state.currentScript.id !== id) return state;
      return {
        currentScript: {
          ...state.currentScript,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  saveVersion: (scriptId) =>
    set((state) => {
      if (!state.currentScript || state.currentScript.id !== scriptId) return state;
      const newVersion: ScriptVersion = {
        id: uuid(),
        content: state.currentScript.content,
        timestamp: new Date().toISOString(),
      };
      return {
        currentScript: {
          ...state.currentScript,
          version: state.currentScript.version + 1,
          history: [...state.currentScript.history, newVersion],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  revertToVersion: (scriptId, versionId) =>
    set((state) => {
      if (!state.currentScript || state.currentScript.id !== scriptId) return state;
      const targetVersion = state.currentScript.history.find((v) => v.id === versionId);
      if (!targetVersion) return state;
      return {
        currentScript: {
          ...state.currentScript,
          content: targetVersion.content,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  deleteScript: (_episodeId, _scriptId) => set({ currentScript: null }),
}));
