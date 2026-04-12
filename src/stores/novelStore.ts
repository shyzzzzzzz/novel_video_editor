import { create } from 'zustand';
import { Novel, Chapter, ChapterMetadata, StoryNode, KnowledgeSyncResult } from '@/types';
import { v4 as uuid } from 'uuid';

interface NovelState {
  // 当前小说
  currentNovel: Novel | null;
  currentChapterId: string | null;

  // 剧情节点（用于续写入口）
  storyNodes: StoryNode[];

  // 知识库同步结果（最近一次）
  lastSyncResult: KnowledgeSyncResult | null;

  // 小说操作
  createNovel: (title: string, description?: string) => Novel;
  loadNovel: (novel: Novel) => void;
  updateNovel: (updates: Partial<Pick<Novel, 'title' | 'description'>>) => void;

  // 章节操作
  createChapter: (title: string, content?: string) => Chapter;
  loadChapter: (chapterId: string) => void;
  updateChapter: (chapterId: string, updates: Partial<Pick<Chapter, 'title' | 'content' | 'status'>>) => void;
  deleteChapter: (chapterId: string) => void;
  reorderChapter: (chapterId: string, newOrder: number) => void;

  // 计算章节元数据
  computeMetadata: (chapterId: string) => ChapterMetadata;

  // 剧情节点操作
  addStoryNode: (node: Omit<StoryNode, 'id' | 'createdAt'>) => StoryNode;
  resolveStoryNode: (nodeId: string) => void;
  getUnresolvedNodes: () => StoryNode[];

  // 知识库同步
  triggerSync: (chapterId: string) => Promise<KnowledgeSyncResult>;
  markChapterSynced: (chapterId: string) => void;

  // 工具
  getCurrentChapter: () => Chapter | null;
  getChapterCount: () => number;
  getCompletedChapterCount: () => number;
}

export const useNovelStore = create<NovelState>((set, get) => ({
  currentNovel: null,
  currentChapterId: null,
  storyNodes: [],
  lastSyncResult: null,

  createNovel: (title, description) => {
    const novel: Novel = {
      id: uuid(),
      title,
      description,
      chapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ currentNovel: novel, currentChapterId: null });
    return novel;
  },

  loadNovel: (novel) => set({ currentNovel: novel, currentChapterId: null }),

  updateNovel: (updates) =>
    set((state) => {
      if (!state.currentNovel) return state;
      return {
        currentNovel: {
          ...state.currentNovel,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  createChapter: (title, content = '') => {
    const state = get();
    if (!state.currentNovel) throw new Error('No novel loaded');

    const chapter: Chapter = {
      id: uuid(),
      novelId: state.currentNovel.id,
      title,
      content,
      order: state.currentNovel.chapters.length,
      status: 'draft',
      metadata: {
        wordCount: 0,
        sceneCount: 0,
        characters: [],
        items: [],
        locations: [],
        plotPoints: [],
        hooks: [],
        tone: '',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      if (!state.currentNovel) return state;
      return {
        currentNovel: {
          ...state.currentNovel,
          chapters: [...state.currentNovel.chapters, chapter],
          updatedAt: new Date().toISOString(),
        },
        currentChapterId: chapter.id,
      };
    });

    return chapter;
  },

  loadChapter: (chapterId) => set({ currentChapterId: chapterId }),

  updateChapter: (chapterId, updates) =>
    set((state) => {
      if (!state.currentNovel) return state;
      return {
        currentNovel: {
          ...state.currentNovel,
          chapters: state.currentNovel.chapters.map((c) =>
            c.id === chapterId
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  deleteChapter: (chapterId) =>
    set((state) => {
      if (!state.currentNovel) return state;
      return {
        currentNovel: {
          ...state.currentNovel,
          chapters: state.currentNovel.chapters
            .filter((c) => c.id !== chapterId)
            .map((c, i) => ({ ...c, order: i })),
          updatedAt: new Date().toISOString(),
        },
        currentChapterId:
          state.currentChapterId === chapterId ? null : state.currentChapterId,
      };
    }),

  reorderChapter: (chapterId, newOrder) =>
    set((state) => {
      if (!state.currentNovel) return state;
      const chapters = [...state.currentNovel.chapters];
      const current = chapters.find((c) => c.id === chapterId);
      if (!current) return state;

      const oldOrder = current.order;
      chapters.forEach((c) => {
        if (c.id === chapterId) {
          c.order = newOrder;
        } else if (oldOrder < newOrder && c.order > oldOrder && c.order <= newOrder) {
          c.order--;
        } else if (oldOrder > newOrder && c.order >= newOrder && c.order < oldOrder) {
          c.order++;
        }
      });

      return {
        currentNovel: {
          ...state.currentNovel,
          chapters,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  computeMetadata: (chapterId) => {
    const state = get();
    const chapter = state.currentNovel?.chapters.find((c) => c.id === chapterId);
    if (!chapter) {
      return {
        wordCount: 0,
        sceneCount: 0,
        characters: [],
        items: [],
        locations: [],
        plotPoints: [],
        hooks: [],
        tone: '',
      };
    }

    const content = chapter.content;
    const wordCount = content.replace(/\s/g, '').length;
    const sceneCount = content.split(/\n\s*\n/).filter((s) => s.trim()).length;

    return {
      ...chapter.metadata,
      wordCount,
      sceneCount,
    };
  },

  addStoryNode: (node) => {
    const newNode: StoryNode = {
      ...node,
      id: uuid(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ storyNodes: [...state.storyNodes, newNode] }));
    return newNode;
  },

  resolveStoryNode: (nodeId) =>
    set((state) => ({
      storyNodes: state.storyNodes.map((n) =>
        n.id === nodeId ? { ...n, isResolved: true } : n
      ),
    })),

  getUnresolvedNodes: () => get().storyNodes.filter((n) => !n.isResolved),

  triggerSync: async (chapterId) => {
    const state = get();
    const chapter = state.currentNovel?.chapters.find((c) => c.id === chapterId);
    if (!chapter) throw new Error('Chapter not found');

    const mockResult: KnowledgeSyncResult = {
      syncedAt: new Date().toISOString(),
      newCharacters: [],
      newItems: [],
      newLocations: [],
      newPlotPoints: [],
      updatedCharacters: [],
      updatedItems: [],
      scenesExtracted: [],
    };

    set({ lastSyncResult: mockResult });
    return mockResult;
  },

  markChapterSynced: (chapterId) =>
    set((state) => {
      if (!state.currentNovel) return state;
      return {
        currentNovel: {
          ...state.currentNovel,
          chapters: state.currentNovel.chapters.map((c) =>
            c.id === chapterId
              ? {
                  ...c,
                  status: 'synced' as const,
                  metadata: {
                    ...c.metadata,
                    lastSyncedAt: new Date().toISOString(),
                  },
                }
              : c
          ),
        },
      };
    }),

  getCurrentChapter: () => {
    const state = get();
    if (!state.currentNovel || !state.currentChapterId) return null;
    return (
      state.currentNovel.chapters.find((c) => c.id === state.currentChapterId) || null
    );
  },

  getChapterCount: () => get().currentNovel?.chapters.length || 0,

  getCompletedChapterCount: () =>
    get().currentNovel?.chapters.filter((c) => c.status === 'completed' || c.status === 'synced').length || 0,
}));
