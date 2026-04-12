import { create } from 'zustand';
import { Take, TakeStatus, TakeFilter } from '@/types';
import { v4 as uuid } from 'uuid';

interface TakesState {
  takes: Take[];
  selectedTakeIds: Map<string, string>;
  filter: TakeFilter | null;

  addTake: (shotId: string, prompt: string, parameters?: Record<string, unknown>) => Take;
  updateTake: (takeId: string, updates: Partial<Take>) => void;
  deleteTake: (takeId: string) => void;

  selectTake: (shotId: string, takeId: string) => void;
  getSelectedTake: (shotId: string) => Take | undefined;

  setFilter: (filter: TakeFilter | null) => void;
  getTakesForShot: (shotId: string) => Take[];
}

export const useTakesStore = create<TakesState>((set, get) => ({
  takes: [],
  selectedTakeIds: new Map(),
  filter: null,

  addTake: (shotId, prompt, parameters = {}) => {
    const take: Take = {
      id: uuid(),
      shotId,
      version: 1,
      prompt,
      parameters,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ takes: [...state.takes, take] }));
    return take;
  },

  updateTake: (takeId, updates) =>
    set((state) => ({
      takes: state.takes.map((t) => (t.id === takeId ? { ...t, ...updates } : t)),
    })),

  deleteTake: (takeId) =>
    set((state) => ({
      takes: state.takes.filter((t) => t.id !== takeId),
    })),

  selectTake: (shotId, takeId) =>
    set((state) => {
      const newMap = new Map(state.selectedTakeIds);
      newMap.set(shotId, takeId);
      return { selectedTakeIds: newMap };
    }),

  getSelectedTake: (shotId) => {
    const selectedId = get().selectedTakeIds.get(shotId);
    if (!selectedId) return undefined;
    return get().takes.find((t) => t.id === selectedId);
  },

  setFilter: (filter) => set({ filter }),

  getTakesForShot: (shotId) => {
    const { takes, filter } = get();
    let filtered = takes.filter((t) => t.shotId === shotId);
    if (filter?.status) {
      filtered = filtered.filter((t) => t.status === filter.status);
    }
    return filtered.sort((a, b) => b.version - a.version);
  },
}));
