import { create } from 'zustand';
import { SceneAsset, SceneType, SceneSource } from '@/types';
import { v4 as uuid } from 'uuid';

interface SceneState {
  currentScene: SceneAsset | null;
  createScene: (name: string, type: SceneType, source: SceneSource, thumbnail: string) => SceneAsset;
  loadScene: (scene: SceneAsset) => void;
  updateScene: (id: string, updates: Partial<Pick<SceneAsset, 'name' | 'metadata'>>) => void;
  deleteScene: (id: string) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  currentScene: null,

  createScene: (name, type, source, thumbnail) => ({
    id: uuid(),
    name,
    type,
    source,
    thumbnail,
    metadata: {},
    createdAt: new Date().toISOString(),
  }),

  loadScene: (scene) => set({ currentScene: scene }),

  updateScene: (id, updates) =>
    set((state) => {
      if (!state.currentScene || state.currentScene.id !== id) return state;
      return {
        currentScene: { ...state.currentScene, ...updates },
      };
    }),

  deleteScene: (_id) => set({ currentScene: null }),
}));
