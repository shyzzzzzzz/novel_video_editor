import { create } from 'zustand';
import { Novel, Chapter, ChapterMetadata, StoryNode, KnowledgeSyncResult, ExtractedScene } from '@/types';
import { v4 as uuid } from 'uuid';
import { loadPersistedData, createDebouncedSave } from '@/lib/persist-client';
import { generateText } from '@/lib/api-client';
import { useSettingsStore } from '@/stores/settingsStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

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
  updateChapter: (chapterId: string, updates: Partial<Pick<Chapter, 'title' | 'content' | 'status' | 'metadata'>>) => void;
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

  // 持久化
  load: () => Promise<void>;

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
          chapters: state.currentNovel.chapters.map((c) => {
            if (c.id !== chapterId) return c;
            const newChapter = { ...c, ...updates, updatedAt: new Date().toISOString() };
            if (updates.content !== undefined) {
              const content = updates.content;
              const wordCount = content.replace(/\s/g, '').length;
              const sceneCount = content.split(/\n\s*\n/).filter((s) => s.trim()).length;
              newChapter.metadata = {
                ...c.metadata,
                wordCount,
                sceneCount,
              };
            }
            return newChapter;
          }),
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

    const config = useSettingsStore.getState().apis.text;
    if (config.provider === 'mock') {
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
    }

    const prompt = `你是小说知识提取专家。请从以下小说章节中提取知识库信息，返回标准 JSON 格式。

【章节标题】${chapter.title || '无标题'}
【章节内容】
${chapter.content}

请以 JSON 格式返回，结构如下：
{
  "characters": [
    {
      "name": "角色名",
      "personality": "性格特征描述",
      "background": "背景信息",
      "description": "外貌/特征描述"
    }
  ],
  "items": [
    {
      "name": "物品名",
      "description": "物品描述",
      "significance": "在故事中的意义"
    }
  ],
  "locations": [
    {
      "name": "地点名",
      "description": "地点描述",
      "atmosphere": "氛围特点"
    }
  ],
  "plotPoints": [
    {
      "title": "情节点标题",
      "description": "情节点描述",
      "type": "hook|suspense|foreshadowing|climax|resolution"
    }
  ],
  "scenes": [
    {
      "title": "场景标题",
      "description": "场景描述",
      "dialogueSummary": "关键对话摘要",
      "emotion": "场景情绪",
      "characters": ["角色名1", "角色名2"],
      "location": "地点名"
    }
  ]
}

只返回 JSON，不要包含其他文字。`;

    const sysprompt = config.sysprompt || '你是一位专业的小说知识提取助手。';

    let response: string;
    try {
      response = await generateText(prompt, { system: sysprompt });
    } catch (err) {
      throw new Error(`知识提取失败: ${err instanceof Error ? err.message : '未知错误'}`);
    }

    // 解析 JSON
    let extracted: {
      characters?: { name: string; personality?: string; background?: string; description?: string }[];
      items?: { name: string; description?: string; significance?: string }[];
      locations?: { name: string; description?: string; atmosphere?: string }[];
      plotPoints?: { title: string; description?: string; type?: string }[];
      scenes?: { title: string; description?: string; dialogueSummary?: string; emotion?: string; characters?: string[]; location?: string }[];
    };

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法解析 JSON');
      }
    } catch {
      throw new Error(`知识提取结果解析失败: ${response.slice(0, 100)}`);
    }

    // 添加到知识库
    const knowledge = useKnowledgeStore.getState();
    const now = new Date().toISOString();

    const newCharacterIds: string[] = [];
    if (extracted.characters) {
      for (const char of extracted.characters) {
        if (!char.name) continue;
        const existing = knowledge.characters.find((c) => c.name === char.name);
        if (!existing) {
          const created = knowledge.addCharacter({
            name: char.name,
            personality: char.personality || '',
            background: char.background || '',
            card: { images: [], defaultImageIndex: 0, description: char.description || '', keyExpressions: [] },
          });
          newCharacterIds.push(created.id);
        }
      }
    }

    const newItemIds: string[] = [];
    if (extracted.items) {
      for (const item of extracted.items) {
        if (!item.name) continue;
        const existing = knowledge.items.find((i) => i.name === item.name);
        if (!existing) {
          const created = knowledge.addItem({
            name: item.name,
            description: item.description || '',
            significance: item.significance || '',
          });
          newItemIds.push(created.id);
        }
      }
    }

    const newLocationIds: string[] = [];
    if (extracted.locations) {
      for (const loc of extracted.locations) {
        if (!loc.name) continue;
        const existing = knowledge.locations.find((l) => l.name === loc.name);
        if (!existing) {
          const created = knowledge.addLocation({
            name: loc.name,
            description: loc.description || '',
            atmosphere: loc.atmosphere || '',
          });
          newLocationIds.push(created.id);
        }
      }
    }

    const newPlotPointIds: string[] = [];
    if (extracted.plotPoints) {
      for (const pp of extracted.plotPoints) {
        if (!pp.title) continue;
        const created = knowledge.addPlotLine({
          title: pp.title,
          description: pp.description || '',
          type: (pp.type as any) || 'suspense',
          status: 'active',
        });
        newPlotPointIds.push(created.id);
      }
    }

    const scenesExtracted: ExtractedScene[] = [];
    if (extracted.scenes) {
      for (const scene of extracted.scenes) {
        if (!scene.title) continue;
        scenesExtracted.push({
          id: uuid(),
          chapterId,
          title: scene.title,
          description: scene.description || '',
          dialogueSummary: scene.dialogueSummary || '',
          emotion: scene.emotion || '',
          characters: scene.characters || [],
          location: scene.location,
        });
      }
    }

    const result: KnowledgeSyncResult = {
      syncedAt: now,
      newCharacters: newCharacterIds,
      newItems: newItemIds,
      newLocations: newLocationIds,
      newPlotPoints: newPlotPointIds,
      updatedCharacters: [],
      updatedItems: [],
      scenesExtracted,
    };

    set({ lastSyncResult: result });
    return result;
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

  load: async () => {
    const data = await loadPersistedData<{
      currentNovel: Novel | null;
      currentChapterId: string | null;
      storyNodes: StoryNode[];
    }>('novels');
    if (data) {
      set((state) => ({
        currentNovel: data.currentNovel ?? state.currentNovel,
        currentChapterId: data.currentChapterId ?? state.currentChapterId,
        storyNodes: data.storyNodes ?? state.storyNodes,
      }));
    }
  },
}));

// 自动保存
const debouncedSaveNovels = createDebouncedSave<{ currentNovel: Novel | null; currentChapterId: string | null; storyNodes: StoryNode[] }>('novels');
useNovelStore.subscribe((state) => {
  debouncedSaveNovels({
    currentNovel: state.currentNovel,
    currentChapterId: state.currentChapterId,
    storyNodes: state.storyNodes,
  });
});
