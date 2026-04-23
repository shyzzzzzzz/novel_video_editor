import { create } from 'zustand';
import { Project, Novel, Episode, Chapter, Character, Item, Location, PlotLine, ChapterPlotSummary, ProductionStatus, EpisodeStatus, ProductionEpisode } from '@/types';
import { v4 as uuid } from 'uuid';
import { loadPersistedData, createDebouncedSave } from '@/lib/persist-client';

// 旧数据结构迁移
interface LegacyNovelData {
  currentNovel: Novel | null;
  currentChapterId: string | null;
  storyNodes: unknown[];
}

interface LegacyKnowledgeData {
  characters: unknown[];
  items: unknown[];
  locations: unknown[];
  plotLines: unknown[];
  snapshots: unknown[];
  chapterPlotSummaries?: unknown[];
}

interface ProjectState {
  // 所有项目
  projects: Project[];
  // 当前项目
  currentProjectId: string | null;
  // 当前小说
  currentNovelId: string | null;
  // 当前章节
  currentChapterId: string | null;
  // 当前剧集
  currentEpisodeId: string | null;

  // 项目操作
  createProject: (name: string, description?: string) => Project;
  loadProjects: (projects: Project[]) => void;
  setCurrentProject: (projectId: string) => void;
  updateProject: (projectId: string, updates: Partial<Pick<Project, 'name' | 'description'>>) => void;
  deleteProject: (projectId: string) => void;

  // 获取当前项目
  getCurrentProject: () => Project | null;
  // 获取当前小说
  getCurrentNovel: () => Novel | null;
  // 获取当前剧集
  getCurrentEpisode: () => Episode | null;

  // 小说操作（代理到当前项目）
  addNovel: (novel: Omit<Novel, 'id' | 'createdAt' | 'updatedAt'>) => Novel | null;
  setCurrentNovel: (novelId: string) => void;
  updateNovel: (novelId: string, updates: Partial<Novel>) => void;
  deleteNovel: (novelId: string) => void;

  // 章节操作（代理到当前小说）
  addChapter: (chapter: Omit<Chapter, 'id' | 'novelId' | 'createdAt' | 'updatedAt'>) => Chapter | null;
  updateChapter: (chapterId: string, updates: Partial<Chapter>) => void;
  deleteChapter: (chapterId: string) => void;
  setCurrentChapter: (chapterId: string) => void;
  getCurrentChapter: () => Chapter | null;

  // 剧集操作（代理到当前项目）
  addEpisode: (episode: Omit<Episode, 'id' | 'createdAt' | 'updatedAt'>) => Episode | null;
  setCurrentEpisode: (episodeId: string) => void;
  updateEpisode: (episodeId: string, updates: Partial<Episode>) => void;
  deleteEpisode: (episodeId: string) => void;
  advanceEpisodeStatus: (episodeId: string) => void;
  revertEpisodeStatus: (episodeId: string) => void;

  // 角色操作（代理到当前项目）
  addCharacter: (character: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Character | null;
  updateCharacter: (characterId: string, updates: Partial<Character>) => void;
  deleteCharacter: (characterId: string) => void;

  // 物品操作（代理到当前项目）
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => Item | null;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  deleteItem: (itemId: string) => void;

  // 地点操作（代理到当前项目）
  addLocation: (location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>) => Location | null;
  updateLocation: (locationId: string, updates: Partial<Location>) => void;
  deleteLocation: (locationId: string) => void;

  // 剧情线操作（代理到当前项目）
  addPlotLine: (plotLine: Omit<PlotLine, 'id' | 'createdAt' | 'updatedAt'>) => PlotLine | null;
  updatePlotLine: (plotLineId: string, updates: Partial<PlotLine>) => void;
  deletePlotLine: (plotLineId: string) => void;

  // 章节摘要操作（代理到当前项目）
  addChapterPlotSummary: (summary: Omit<ChapterPlotSummary, 'id' | 'createdAt' | 'updatedAt'>) => ChapterPlotSummary | null;
  updateChapterPlotSummary: (summaryId: string, updates: Partial<ChapterPlotSummary>) => void;
  deleteChapterPlotSummary: (summaryId: string) => void;

  // 持久化
  load: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  currentNovelId: null,
  currentChapterId: null,
  currentEpisodeId: null,

  createProject: (name, description) => {
    const newProject: Project = {
      id: uuid(),
      name,
      description,
      novels: [],
      episodes: [],
      globalRoles: [],
      globalScenes: [],
      characters: [],
      items: [],
      locations: [],
      plotLines: [],
      chapterPlotSummaries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      projects: [...state.projects, newProject],
      currentProjectId: newProject.id,
      currentNovelId: null,
      currentEpisodeId: null,
    }));
    return newProject;
  },

  loadProjects: (projects) => set({ projects }),

  setCurrentProject: (projectId) => set({ currentProjectId: projectId, currentNovelId: null, currentChapterId: null, currentEpisodeId: null }),

  updateProject: (projectId, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    })),

  deleteProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== projectId),
      currentProjectId: state.currentProjectId === projectId
        ? (state.projects.find((p) => p.id !== projectId)?.id || null)
        : state.currentProjectId,
    })),

  getCurrentProject: () => {
    const state = get();
    return state.projects.find((p) => p.id === state.currentProjectId) || null;
  },

  getCurrentNovel: () => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project || !state.currentNovelId) return null;
    return project.novels.find((n) => n.id === state.currentNovelId) || null;
  },

  getCurrentEpisode: () => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project || !state.currentEpisodeId) return null;
    return project.episodes.find((e) => e.id === state.currentEpisodeId) || null;
  },

  addNovel: (novelData) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return null;

    const newNovel: Novel = {
      ...novelData,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, novels: [...p.novels, newNovel] } : p
      ),
      currentNovelId: newNovel.id,
    }));
    return newNovel;
  },

  setCurrentNovel: (novelId) => set({ currentNovelId: novelId }),

  updateNovel: (novelId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              novels: p.novels.map((n) =>
                n.id === novelId ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
              ),
            }
          : p
      ),
    }));
  },

  deleteNovel: (novelId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? { ...p, novels: p.novels.filter((n) => n.id !== novelId) }
          : p
      ),
      currentNovelId: s.currentNovelId === novelId ? null : s.currentNovelId,
    }));
  },

  addChapter: (chapterData) => {
    const state = get();
    const novel = state.getCurrentNovel();
    if (!novel) return null;

    const newChapter: Chapter = {
      ...chapterData,
      id: uuid(),
      novelId: novel.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === s.currentProjectId
          ? {
              ...p,
              novels: p.novels.map((n) =>
                n.id === novel.id
                  ? { ...n, chapters: [...n.chapters, newChapter], updatedAt: new Date().toISOString() }
                  : n
              ),
            }
          : p
      ),
    }));
    return newChapter;
  },

  updateChapter: (chapterId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              novels: p.novels.map((n) =>
                n.id === s.currentNovelId
                  ? {
                      ...n,
                      chapters: n.chapters.map((c) =>
                        c.id === chapterId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
                      ),
                    }
                  : n
              ),
            }
          : p
      ),
    }));
  },

  deleteChapter: (chapterId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              novels: p.novels.map((n) =>
                n.id === s.currentNovelId
                  ? { ...n, chapters: n.chapters.filter((c) => c.id !== chapterId) }
                  : n
              ),
            }
          : p
      ),
    }));
  },

  setCurrentChapter: (chapterId) => {
    set({ currentChapterId: chapterId });
  },

  getCurrentChapter: () => {
    const state = get();
    const novel = state.getCurrentNovel();
    if (!novel || !state.currentChapterId) return null;
    return novel.chapters.find((c) => c.id === state.currentChapterId) || null;
  },

  addEpisode: (episodeData) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return null;

    const newEpisode: Episode = {
      ...episodeData,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, episodes: [...p.episodes, newEpisode] } : p
      ),
      currentEpisodeId: newEpisode.id,
    }));
    return newEpisode;
  },

  setCurrentEpisode: (episodeId) => set({ currentEpisodeId: episodeId }),

  updateEpisode: (episodeId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              episodes: p.episodes.map((e) =>
                e.id === episodeId ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
              ),
            }
          : p
      ),
    }));
  },

  deleteEpisode: (episodeId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? { ...p, episodes: p.episodes.filter((e) => e.id !== episodeId) }
          : p
      ),
      currentEpisodeId: s.currentEpisodeId === episodeId ? null : s.currentEpisodeId,
    }));
  },

  advanceEpisodeStatus: (episodeId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;
    const episode = project.episodes.find((e) => e.id === episodeId);
    if (!episode) return;

    const statusOrder: Episode['productionStatus'][] = [
      'outline',
      'scripting',
      'storyboard',
      'footage',
      'rough_cut',
      'final',
    ];
    const currentStatus = episode.productionStatus || 'outline';
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      state.updateEpisode(episodeId, { productionStatus: nextStatus });
    }
  },

  revertEpisodeStatus: (episodeId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;
    const episode = project.episodes.find((e) => e.id === episodeId);
    if (!episode) return;

    const statusOrder: Episode['productionStatus'][] = [
      'outline',
      'scripting',
      'storyboard',
      'footage',
      'rough_cut',
      'final',
    ];
    const currentStatus = episode.productionStatus || 'outline';
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex > 0) {
      const prevStatus = statusOrder[currentIndex - 1];
      state.updateEpisode(episodeId, { productionStatus: prevStatus });
    }
  },

  addCharacter: (characterData) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return null;

    const newCharacter: Character = {
      ...characterData,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, characters: [...p.characters, newCharacter] } : p
      ),
    }));
    return newCharacter;
  },

  updateCharacter: (characterId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              characters: p.characters.map((c) =>
                c.id === characterId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
              ),
            }
          : p
      ),
    }));
  },

  deleteCharacter: (characterId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? { ...p, characters: p.characters.filter((c) => c.id !== characterId) }
          : p
      ),
    }));
  },

  addItem: (itemData) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return null;

    const newItem: Item = {
      ...itemData,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, items: [...p.items, newItem] } : p
      ),
    }));
    return newItem;
  },

  updateItem: (itemId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              items: p.items.map((i) =>
                i.id === itemId ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
              ),
            }
          : p
      ),
    }));
  },

  deleteItem: (itemId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? { ...p, items: p.items.filter((i) => i.id !== itemId) }
          : p
      ),
    }));
  },

  addLocation: (locationData) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return null;

    const newLocation: Location = {
      ...locationData,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, locations: [...p.locations, newLocation] } : p
      ),
    }));
    return newLocation;
  },

  updateLocation: (locationId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              locations: p.locations.map((l) =>
                l.id === locationId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
              ),
            }
          : p
      ),
    }));
  },

  deleteLocation: (locationId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? { ...p, locations: p.locations.filter((l) => l.id !== locationId) }
          : p
      ),
    }));
  },

  addPlotLine: (plotLineData) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return null;

    const newPlotLine: PlotLine = {
      ...plotLineData,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, plotLines: [...p.plotLines, newPlotLine] } : p
      ),
    }));
    return newPlotLine;
  },

  updatePlotLine: (plotLineId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              plotLines: p.plotLines.map((pl) =>
                pl.id === plotLineId ? { ...pl, ...updates, updatedAt: new Date().toISOString() } : pl
              ),
            }
          : p
      ),
    }));
  },

  deletePlotLine: (plotLineId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? { ...p, plotLines: p.plotLines.filter((pl) => pl.id !== plotLineId) }
          : p
      ),
    }));
  },

  addChapterPlotSummary: (summaryData) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return null;

    const newSummary: ChapterPlotSummary = {
      ...summaryData,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id ? { ...p, chapterPlotSummaries: [...p.chapterPlotSummaries, newSummary] } : p
      ),
    }));
    return newSummary;
  },

  updateChapterPlotSummary: (summaryId, updates) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              chapterPlotSummaries: p.chapterPlotSummaries.map((cs) =>
                cs.id === summaryId ? { ...cs, ...updates, updatedAt: new Date().toISOString() } : cs
              ),
            }
          : p
      ),
    }));
  },

  deleteChapterPlotSummary: (summaryId) => {
    const state = get();
    const project = state.getCurrentProject();
    if (!project) return;

    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === project.id
          ? { ...p, chapterPlotSummaries: p.chapterPlotSummaries.filter((cs) => cs.id !== summaryId) }
          : p
      ),
    }));
  },

  load: async () => {
    // 先检查新结构
    const newData = await loadPersistedData<{
      projects: Project[];
      currentProjectId: string | null;
      currentNovelId: string | null;
      currentChapterId: string | null;
      currentEpisodeId: string | null;
    }>('projects');

    // 加载旧的生产数据（用于迁移）
    const oldProductionData = await loadPersistedData<{
      episodes: ProductionEpisode[];
      currentEpisodeId: string | null;
    }>('production');

    if (newData && newData.projects && newData.projects.length > 0) {
      // 有新数据，直接使用
      set({
        projects: newData.projects ?? [],
        currentProjectId: newData.currentProjectId ?? null,
        currentNovelId: newData.currentNovelId ?? null,
        currentChapterId: newData.currentChapterId ?? null,
        currentEpisodeId: newData.currentEpisodeId ?? null,
      });
      return;
    }

    // 迁移旧数据
    const oldNovelData = await loadPersistedData<LegacyNovelData>('novels');
    const oldKnowledgeData = await loadPersistedData<LegacyKnowledgeData>('knowledge');

    // 如果有旧数据，创建默认项目
    if (oldNovelData?.currentNovel || oldKnowledgeData?.characters?.length || (oldProductionData?.episodes?.length ?? 0) > 0) {
      // 迁移 episodes：从旧的 productionStore 来（ProductionEpisode -> Episode）
      const migratedEpisodes: Episode[] = (oldProductionData?.episodes ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        status: 'draft' as EpisodeStatus,
        productionStatus: e.status as ProductionStatus,
        novelChapterIds: e.novelChapterIds,
        scenes: e.scenes,
        outline: e.outline,
        script: e.script,
        generatedStoryboard: e.storyboard,
        scripts: [],
        storyboards: [],
        audioTracks: [],
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }));

      const defaultProject: Project = {
        id: uuid(),
        name: '默认项目',
        description: '从旧版本迁移的数据',
        novels: oldNovelData?.currentNovel ? [oldNovelData.currentNovel] : [],
        episodes: migratedEpisodes,
        globalRoles: [],
        globalScenes: [],
        characters: (oldKnowledgeData?.characters || []) as Project['characters'],
        items: (oldKnowledgeData?.items || []) as Project['items'],
        locations: (oldKnowledgeData?.locations || []) as Project['locations'],
        plotLines: (oldKnowledgeData?.plotLines || []) as Project['plotLines'],
        chapterPlotSummaries: (oldKnowledgeData?.chapterPlotSummaries || []) as Project['chapterPlotSummaries'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      set({
        projects: [defaultProject],
        currentProjectId: defaultProject.id,
        currentNovelId: oldNovelData?.currentNovel?.id || null,
        currentChapterId: oldNovelData?.currentChapterId || null,
        currentEpisodeId: oldProductionData?.currentEpisodeId || null,
      });
      return;
    }

    // 都没有数据，初始化空状态
    set({
      projects: [],
      currentProjectId: null,
      currentNovelId: null,
      currentChapterId: null,
      currentEpisodeId: null,
    });
  },
}));

// 自动保存
const debouncedSaveProjects = createDebouncedSave<{
  projects: Project[];
  currentProjectId: string | null;
  currentNovelId: string | null;
  currentChapterId: string | null;
  currentEpisodeId: string | null;
}>('projects');

useProjectStore.subscribe((state) => {
  debouncedSaveProjects({
    projects: state.projects,
    currentProjectId: state.currentProjectId,
    currentNovelId: state.currentNovelId,
    currentChapterId: state.currentChapterId,
    currentEpisodeId: state.currentEpisodeId,
  });
});
