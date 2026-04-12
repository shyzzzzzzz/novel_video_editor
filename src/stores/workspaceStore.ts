import { create } from 'zustand';
import { Workspace, Episode } from '@/types';
import { v4 as uuid } from 'uuid';

interface WorkspaceState {
  workspace: Workspace | null;
  currentProjectId: string | null;
  currentSeriesId: string | null;
  currentSeasonId: string | null;
  currentEpisodeId: string | null;

  // Workspace 操作
  createWorkspace: (name: string) => void;
  loadWorkspace: (workspace: Workspace) => void;

  // Project 操作
  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;

  // Series 操作
  createSeries: (projectId: string, name: string) => string;
  setCurrentSeries: (id: string | null) => void;

  // Season 操作
  createSeason: (seriesId: string, name: string) => string;
  setCurrentSeason: (id: string | null) => void;

  // Episode 操作
  createEpisode: (seasonId: string, name: string) => string;
  setCurrentEpisode: (id: string | null) => void;
  updateEpisodeStatus: (id: string, status: Episode['status']) => void;

  // 工具
  getCurrentEpisode: () => Episode | null;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  currentProjectId: null,
  currentSeriesId: null,
  currentSeasonId: null,
  currentEpisodeId: null,

  createWorkspace: (name) =>
    set({
      workspace: {
        id: uuid(),
        name,
        projects: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),

  loadWorkspace: (workspace) => set({ workspace }),

  createProject: (name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: [
            ...state.workspace.projects,
            {
              id,
              name,
              series: [],
              globalRoles: [],
              globalScenes: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  deleteProject: (id) =>
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.filter((p) => p.id !== id),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  setCurrentProject: (id) => set({ currentProjectId: id }),

  createSeries: (projectId, name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) =>
            p.id === projectId
              ? { ...p, series: [...p.series, { id, name, seasons: [] }] }
              : p
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  setCurrentSeries: (id) => set({ currentSeriesId: id }),

  createSeason: (seriesId, name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) => ({
            ...p,
            series: p.series.map((s) =>
              s.id === seriesId ? { ...s, seasons: [...s.seasons, { id, name, episodes: [] }] } : s
            ),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  setCurrentSeason: (id) => set({ currentSeasonId: id }),

  createEpisode: (seasonId, name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) => ({
            ...p,
            series: p.series.map((s) => ({
              ...s,
              seasons: s.seasons.map((season) =>
                season.id === seasonId
                  ? {
                      ...season,
                      episodes: [
                        ...season.episodes,
                        {
                          id,
                          name,
                          status: 'draft' as const,
                          scripts: [],
                          storyboards: [],
                          takes: [],
                          audioTracks: [],
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : season
              ),
            })),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  setCurrentEpisode: (id) => set({ currentEpisodeId: id }),

  updateEpisodeStatus: (id, status) =>
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) => ({
            ...p,
            series: p.series.map((s) => ({
              ...s,
              seasons: s.seasons.map((season) => ({
                ...season,
                episodes: season.episodes.map((e) =>
                  e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
                ),
              })),
            })),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  getCurrentEpisode: () => {
    const state = get();
    if (!state.workspace || !state.currentProjectId) return null;
    const project = state.workspace.projects.find((p) => p.id === state.currentProjectId);
    if (!project) return null;
    for (const series of project.series) {
      for (const season of series.seasons) {
        const episode = season.episodes.find((e) => e.id === state.currentEpisodeId);
        if (episode) return episode;
      }
    }
    return null;
  },
}));
