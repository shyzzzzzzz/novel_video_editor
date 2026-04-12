import { create } from 'zustand';
import { Storyboard, Shot, CameraAngle } from '@/types';
import { v4 as uuid } from 'uuid';

type StoryboardViewMode = 'grid' | 'timeline';

interface StoryboardState {
  currentStoryboard: Storyboard | null;
  viewMode: StoryboardViewMode;

  createStoryboard: (episodeId: string) => Storyboard;
  loadStoryboard: (storyboard: Storyboard) => void;

  addShot: (storyboardId: string, description: string, cameraAngle: CameraAngle) => Shot;
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (shotId: string) => void;
  reorderShots: (storyboardId: string, shotIds: string[]) => void;

  setViewMode: (mode: StoryboardViewMode) => void;
}

export const useStoryboardStore = create<StoryboardState>((set, get) => ({
  currentStoryboard: null,
  viewMode: 'grid',

  createStoryboard: (episodeId) => {
    const storyboard: Storyboard = {
      id: uuid(),
      episodeId,
      shots: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return storyboard;
  },

  loadStoryboard: (storyboard) => set({ currentStoryboard: storyboard }),

  addShot: (storyboardId, description, cameraAngle) => {
    const shot: Shot = {
      id: uuid(),
      sequence: get().currentStoryboard?.shots.length || 0,
      description,
      cameraAngle,
      duration: 5,
      takeIds: [],
    };
    set((state) => {
      if (!state.currentStoryboard || state.currentStoryboard.id !== storyboardId) return state;
      return {
        currentStoryboard: {
          ...state.currentStoryboard,
          shots: [...state.currentStoryboard.shots, shot],
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return shot;
  },

  updateShot: (shotId, updates) =>
    set((state) => {
      if (!state.currentStoryboard) return state;
      return {
        currentStoryboard: {
          ...state.currentStoryboard,
          shots: state.currentStoryboard.shots.map((s) =>
            s.id === shotId ? { ...s, ...updates } : s
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  deleteShot: (shotId) =>
    set((state) => {
      if (!state.currentStoryboard) return state;
      return {
        currentStoryboard: {
          ...state.currentStoryboard,
          shots: state.currentStoryboard.shots.filter((s) => s.id !== shotId),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  reorderShots: (storyboardId, shotIds) =>
    set((state) => {
      if (!state.currentStoryboard || state.currentStoryboard.id !== storyboardId) return state;
      const shotMap = new Map(state.currentStoryboard.shots.map((s) => [s.id, s]));
      const reorderedShots = shotIds.map((id, idx) => {
        const shot = shotMap.get(id)!;
        return { ...shot, sequence: idx };
      });
      return {
        currentStoryboard: {
          ...state.currentStoryboard,
          shots: reorderedShots,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
}));
