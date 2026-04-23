import { create } from 'zustand';
import { ProductionEpisode, ProductionScene, ProductionStatus } from '@/types';
import { v4 as uuid } from 'uuid';
import { loadPersistedData, createDebouncedSave } from '@/lib/persist-client';

type KanbanView = 'episode' | 'scene';

interface ProductionState {
  kanbanView: KanbanView;
  setKanbanView: (view: KanbanView) => void;

  episodes: ProductionEpisode[];
  currentEpisodeId: string | null;
  addEpisode: (name: string, projectId: string, novelChapterIds?: string[]) => ProductionEpisode;
  updateEpisode: (id: string, updates: Partial<ProductionEpisode>) => void;
  deleteEpisode: (id: string) => void;
  setCurrentEpisode: (id: string | null) => void;
  getCurrentEpisode: () => ProductionEpisode | null;
  advanceEpisodeStatus: (id: string) => void;
  revertEpisodeStatus: (id: string) => void;

  addScene: (episodeId: string, title: string, description?: string) => ProductionScene;
  updateScene: (sceneId: string, updates: Partial<ProductionScene>) => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (episodeId: string, sceneIds: string[]) => void;

  getScenesForEpisode: (episodeId: string) => ProductionScene[];
  getEpisodeProgress: (episodeId: string) => { stage: ProductionStatus; completed: number; total: number };

  // 持久化
  load: () => Promise<void>;
}

export const useProductionStore = create<ProductionState>((set, get) => ({
  kanbanView: 'episode',
  setKanbanView: (view) => set({ kanbanView: view }),

  episodes: [],
  currentEpisodeId: null,

  addEpisode: (name, projectId, novelChapterIds = []) => {
    const episode: ProductionEpisode = {
      id: uuid(),
      projectId,
      name,
      novelChapterIds,
      status: 'outline',
      scenes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ episodes: [...state.episodes, episode] }));
    return episode;
  },

  updateEpisode: (id, updates) =>
    set((state) => ({
      episodes: state.episodes.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      ),
    })),

  deleteEpisode: (id) =>
    set((state) => ({
      episodes: state.episodes.filter((e) => e.id !== id),
      currentEpisodeId: state.currentEpisodeId === id ? null : state.currentEpisodeId,
    })),

  setCurrentEpisode: (id) => set({ currentEpisodeId: id }),

  getCurrentEpisode: () => {
    const state = get();
    if (!state.currentEpisodeId) return null;
    return state.episodes.find((e) => e.id === state.currentEpisodeId) || null;
  },

  advanceEpisodeStatus: (id) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === id);
    if (!episode) return;

    const statusOrder: ProductionStatus[] = [
      'outline',
      'scripting',
      'storyboard',
      'footage',
      'rough_cut',
      'final',
    ];
    const currentIndex = statusOrder.indexOf(episode.status);
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      get().updateEpisode(id, { status: nextStatus });
    }
  },

  revertEpisodeStatus: (id) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === id);
    if (!episode) return;

    const statusOrder: ProductionStatus[] = [
      'outline',
      'scripting',
      'storyboard',
      'footage',
      'rough_cut',
      'final',
    ];
    const currentIndex = statusOrder.indexOf(episode.status);
    if (currentIndex > 0) {
      const prevStatus = statusOrder[currentIndex - 1];
      get().updateEpisode(id, { status: prevStatus });
    }
  },

  addScene: (episodeId, title, description = '') => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    if (!episode) throw new Error('Episode not found');

    const scene: ProductionScene = {
      id: uuid(),
      episodeId,
      title,
      description,
      shotIds: [],
      status: 'pending',
      characters: [],
      characterRefs: [],
      order: episode.scenes.length,
    };

    get().updateEpisode(episodeId, { scenes: [...episode.scenes, scene] });
    return scene;
  },

  updateScene: (sceneId, updates) =>
    set((state) => ({
      episodes: state.episodes.map((e) => ({
        ...e,
        scenes: e.scenes.map((s) =>
          s.id === sceneId ? { ...s, ...updates } : s
        ),
      })),
    })),

  deleteScene: (sceneId) =>
    set((state) => ({
      episodes: state.episodes.map((e) => ({
        ...e,
        scenes: e.scenes.filter((s) => s.id !== sceneId),
      })),
    })),

  reorderScenes: (episodeId, sceneIds) =>
    set((state) => ({
      episodes: state.episodes.map((e) => {
        if (e.id !== episodeId) return e;
        const sceneMap = new Map(e.scenes.map((s) => [s.id, s]));
        return {
          ...e,
          scenes: sceneIds
            .map((id, idx) => {
              const scene = sceneMap.get(id);
              return scene ? { ...scene, order: idx } : null;
            })
            .filter(Boolean) as ProductionScene[],
        };
      }),
    })),

  getScenesForEpisode: (episodeId) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    if (!episode) return [];
    return [...episode.scenes].sort((a, b) => a.order - b.order);
  },

  getEpisodeProgress: (episodeId) => {
    const state = get();
    const episode = state.episodes.find((e) => e.id === episodeId);
    if (!episode) return { stage: 'outline' as ProductionStatus, completed: 0, total: 6 };

    const statusOrder: ProductionStatus[] = [
      'outline',
      'scripting',
      'storyboard',
      'footage',
      'rough_cut',
      'final',
    ];
    const currentIndex = statusOrder.indexOf(episode.status);
    return {
      stage: episode.status,
      completed: currentIndex,
      total: statusOrder.length,
    };
  },

  load: async () => {
    const data = await loadPersistedData<{
      episodes: ProductionEpisode[];
      currentEpisodeId: string | null;
    }>('production');
    if (data) {
      // 数据迁移：旧的 'takes' 状态转为 'footage'
      const migratedEpisodes = (data.episodes ?? []).map((e) => ({
        ...e,
        status: (e.status as string) === 'takes' ? 'footage' as ProductionStatus : e.status,
      }));
      set((state) => ({
        episodes: migratedEpisodes.length > 0 ? migratedEpisodes : state.episodes,
        currentEpisodeId: data.currentEpisodeId ?? state.currentEpisodeId,
      }));
    }
  },
}));

// 自动保存
const debouncedSaveProduction = createDebouncedSave<{ episodes: ProductionEpisode[]; currentEpisodeId: string | null }>('production');
useProductionStore.subscribe((state) => {
  debouncedSaveProduction({
    episodes: state.episodes,
    currentEpisodeId: state.currentEpisodeId,
  });
});
