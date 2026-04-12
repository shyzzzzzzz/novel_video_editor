import { create } from 'zustand';
import { RenderTask, RenderTaskStatus } from '@/types';
import { v4 as uuid } from 'uuid';

interface RenderState {
  tasks: RenderTask[];
  addTask: (type: 'image' | 'video', prompt: string, parameters?: Record<string, unknown>) => string;
  updateTask: (taskId: string, updates: Partial<RenderTask>) => void;
  removeTask: (taskId: string) => void;
  getTask: (taskId: string) => RenderTask | undefined;
  getTasksByStatus: (status: RenderTaskStatus) => RenderTask[];
}

export const useRenderStore = create<RenderState>((set, get) => ({
  tasks: [],

  addTask: (type, prompt, parameters = {}) => {
    const task: RenderTask = {
      id: uuid(),
      type,
      prompt,
      parameters,
      status: 'queued',
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task.id;
  },

  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    })),

  removeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),

  getTask: (taskId) => get().tasks.find((t) => t.id === taskId),

  getTasksByStatus: (status) => get().tasks.filter((t) => t.status === status),
}));