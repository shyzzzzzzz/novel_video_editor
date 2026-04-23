import { create } from 'zustand';
import {
  Character,
  Item,
  Location,
  PlotLine,
  PlotLineType,
  KnowledgeSnapshot,
  SearchResult,
  Relationship,
  ItemFlow,
  EmotionTag,
  ChapterPlotSummary,
  CharacterFate,
  ArcNode,
  ForeshadowNode,
} from '@/types';
import { v4 as uuid } from 'uuid';
import { loadPersistedData, createDebouncedSave } from '@/lib/persist-client';

interface KnowledgeState {
  characters: Character[];
  items: Item[];
  locations: Location[];
  plotLines: PlotLine[];
  snapshots: KnowledgeSnapshot[];
  chapterPlotSummaries: ChapterPlotSummary[];
  searchQuery: string;
  searchResults: SearchResult[];

  addCharacter: (character: Omit<Character, 'id' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => Character;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  addRelationship: (characterId: string, targetId: string, relationship: Omit<Relationship, 'targetId'>) => void;
  removeRelationship: (characterId: string, targetId: string) => void;
  updateEmotionalArc: (characterId: string, chapterId: string, emotion: EmotionTag) => void;
  snapshotCharacter: (characterId: string) => void;

  addItem: (item: Omit<Item, 'id' | 'flow' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => Item;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  addItemFlow: (itemId: string, flow: Omit<ItemFlow, 'chapterId'>) => void;
  snapshotItem: (itemId: string) => void;

  addLocation: (location: Omit<Location, 'id' | 'appearances' | 'createdAt' | 'updatedAt'>) => Location;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;

  addPlotLine: (plotLine: Omit<PlotLine, 'id' | 'createdAt' | 'updatedAt'>) => PlotLine;
  updatePlotLine: (id: string, updates: Partial<PlotLine>) => void;
  deletePlotLine: (id: string) => void;
  resolvePlotLine: (id: string) => void;

  createSnapshot: (note?: string) => KnowledgeSnapshot;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;

  setSearchQuery: (query: string) => void;
  performSearch: (query: string, chapters?: { id: string; title: string; content: string }[]) => void;
  clearSearch: () => void;

  // 持久化
  load: () => Promise<void>;

  getCharacterById: (id: string) => Character | undefined;
  getItemById: (id: string) => Item | undefined;
  getLocationById: (id: string) => Location | undefined;
  getPlotLineById: (id: string) => PlotLine | undefined;
  getPlotLinesByType: (type: PlotLineType) => PlotLine[];
  getUnresolvedPlotLines: () => PlotLine[];

  // 角色命运板
  updateCharacterFate: (characterId: string, fate: Partial<CharacterFate>) => void;
  addArcNode: (characterId: string, node: Omit<ArcNode, 'id'>) => void;

  // 伏笔追踪
  addForeshadow: (plotLineId: string, foreshadow: Omit<ForeshadowNode, 'id'>) => void;
  resolveForeshadow: (plotLineId: string, chapterId: string, content: string) => void;
  updatePlotLineHealth: (plotLineId: string, health: number) => void;

  // 章节剧情摘要
  createChapterPlotSummary: (summary: Omit<ChapterPlotSummary, 'id' | 'createdAt' | 'updatedAt'>) => ChapterPlotSummary;
  updateChapterPlotSummary: (chapterId: string, updates: Partial<ChapterPlotSummary>) => void;
  getChapterPlotSummary: (chapterId: string) => ChapterPlotSummary | undefined;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  characters: [],
  items: [],
  locations: [],
  plotLines: [],
  snapshots: [],
  chapterPlotSummaries: [],
  searchQuery: '',
  searchResults: [],

  addCharacter: (character) => {
    const newCharacter: Character = {
      ...character,
      id: uuid(),
      appearances: character.appearances || [],
      versions: character.versions || [],
      relationships: character.relationships || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ characters: [...state.characters, newCharacter] }));
    return newCharacter;
  },

  updateCharacter: (id, updates) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    })),

  deleteCharacter: (id) =>
    set((state) => ({ characters: state.characters.filter((c) => c.id !== id) })),

  addRelationship: (characterId, targetId, relationship) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? {
              ...c,
              relationships: [
                ...c.relationships,
                { ...relationship, targetId } as Relationship,
              ],
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    })),

  removeRelationship: (characterId, targetId) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? {
              ...c,
              relationships: c.relationships.filter((r) => r.targetId !== targetId),
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    })),

  updateEmotionalArc: (characterId, chapterId, emotion) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? {
              ...c,
              arc: { ...c.arc, chapters: { ...c.arc.chapters, [chapterId]: emotion } },
              updatedAt: new Date().toISOString(),
            }
          : c
      ),
    })),

  snapshotCharacter: (characterId) => {
    const state = get();
    const character = state.characters.find((c) => c.id === characterId);
    if (!character) return;
    const snapshot = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      character: { ...character },
    };
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId ? { ...c, versions: [...c.versions, snapshot] } : c
      ),
    }));
  },

  addItem: (item) => {
    const newItem: Item = {
      ...item,
      id: uuid(),
      flow: [],
      appearances: [],
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ items: [...state.items, newItem] }));
    return newItem;
  },

  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
      ),
    })),

  deleteItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

  addItemFlow: (itemId, flow) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId
          ? {
              ...i,
              flow: [...i.flow, flow as ItemFlow],
              updatedAt: new Date().toISOString(),
            }
          : i
      ),
    })),

  snapshotItem: (itemId) => {
    const state = get();
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return;
    const snapshot = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      item: { ...item },
    };
    set((state) => ({
      items: state.items.map((i) =>
        i.id === itemId ? { ...i, versions: [...i.versions, snapshot] } : i
      ),
    }));
  },

  addLocation: (location) => {
    const newLocation: Location = {
      ...location,
      id: uuid(),
      appearances: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ locations: [...state.locations, newLocation] }));
    return newLocation;
  },

  updateLocation: (id, updates) =>
    set((state) => ({
      locations: state.locations.map((l) =>
        l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l
      ),
    })),

  deleteLocation: (id) =>
    set((state) => ({ locations: state.locations.filter((l) => l.id !== id) })),

  addPlotLine: (plotLine) => {
    const newPlotLine: PlotLine = {
      ...plotLine,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ plotLines: [...state.plotLines, newPlotLine] }));
    return newPlotLine;
  },

  updatePlotLine: (id, updates) =>
    set((state) => ({
      plotLines: state.plotLines.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    })),

  deletePlotLine: (id) =>
    set((state) => ({ plotLines: state.plotLines.filter((p) => p.id !== id) })),

  resolvePlotLine: (id) =>
    set((state) => ({
      plotLines: state.plotLines.map((p) =>
        p.id === id ? { ...p, status: 'resolved' as const, updatedAt: new Date().toISOString() } : p
      ),
    })),

  createSnapshot: (note) => {
    const state = get();
    const snapshot: KnowledgeSnapshot = {
      id: uuid(),
      timestamp: new Date().toISOString(),
      note,
      characters: JSON.parse(JSON.stringify(state.characters)),
      items: JSON.parse(JSON.stringify(state.items)),
      locations: JSON.parse(JSON.stringify(state.locations)),
      plotLines: JSON.parse(JSON.stringify(state.plotLines)),
    };
    set((state) => ({ snapshots: [...state.snapshots, snapshot] }));
    return snapshot;
  },

  restoreSnapshot: (snapshotId) => {
    const state = get();
    const snapshot = state.snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return;
    set({
      characters: JSON.parse(JSON.stringify(snapshot.characters)),
      items: JSON.parse(JSON.stringify(snapshot.items)),
      locations: JSON.parse(JSON.stringify(snapshot.locations)),
      plotLines: JSON.parse(JSON.stringify(snapshot.plotLines)),
    });
  },

  deleteSnapshot: (snapshotId) =>
    set((state) => ({ snapshots: state.snapshots.filter((s) => s.id !== snapshotId) })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  performSearch: (query, chapters) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    const results: SearchResult[] = [];
    const q = query.toLowerCase();
    const state = get();

    state.characters.forEach((c) => {
      if (c.name.toLowerCase().includes(q) || c.personality.toLowerCase().includes(q)) {
        results.push({
          type: 'character',
          id: c.id,
          title: c.name,
          excerpt: c.personality,
          score: c.name.toLowerCase().includes(q) ? 2 : 1,
        });
      }
    });

    state.items.forEach((i) => {
      if (i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) {
        results.push({
          type: 'item',
          id: i.id,
          title: i.name,
          excerpt: i.description,
          score: i.name.toLowerCase().includes(q) ? 2 : 1,
        });
      }
    });

    state.locations.forEach((l) => {
      if (l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)) {
        results.push({
          type: 'location',
          id: l.id,
          title: l.name,
          excerpt: l.description,
          score: l.name.toLowerCase().includes(q) ? 2 : 1,
        });
      }
    });

    state.plotLines.forEach((p) => {
      if (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
        results.push({
          type: 'plotline',
          id: p.id,
          title: p.title,
          excerpt: p.description,
          score: p.title.toLowerCase().includes(q) ? 2 : 1,
        });
      }
    });

    if (chapters) {
      chapters.forEach((ch) => {
        if (ch.content.toLowerCase().includes(q) || ch.title.toLowerCase().includes(q)) {
          results.push({
            type: 'chapter',
            id: ch.id,
            title: ch.title,
            excerpt: ch.content.substring(0, 100),
            chapterId: ch.id,
            score: ch.title.toLowerCase().includes(q) ? 2 : 1,
          });
        }
      });
    }

    results.sort((a, b) => b.score - a.score);
    set({ searchResults: results, searchQuery: query });
  },

  clearSearch: () => set({ searchResults: [], searchQuery: '' }),

  getCharacterById: (id) => get().characters.find((c) => c.id === id),
  getItemById: (id) => get().items.find((i) => i.id === id),
  getLocationById: (id) => get().locations.find((l) => l.id === id),
  getPlotLineById: (id) => get().plotLines.find((p) => p.id === id),
  getPlotLinesByType: (type) => get().plotLines.filter((p) => p.type === type),
  getUnresolvedPlotLines: () => get().plotLines.filter((p) => p.status === 'active'),

  // 角色命运板
  updateCharacterFate: (characterId, fate) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? { ...c, fate: { ...c.fate, ...fate } as CharacterFate, updatedAt: new Date().toISOString() }
          : c
      ),
    })),

  addArcNode: (characterId, node) =>
    set((state) => ({
      characters: state.characters.map((c) => {
        if (c.id !== characterId) return c;
        const arc = c.fate?.arc || [];
        const existingFate = c.fate || { characterId: c.id, status: 'active' as const, arc: [] as ArcNode[] };
        return {
          ...c,
          fate: {
            ...existingFate,
            arc: [...arc, { ...node, id: uuid() } as ArcNode],
          },
          updatedAt: new Date().toISOString(),
        } as Character;
      }),
    })),

  // 伏笔追踪
  addForeshadow: (plotLineId, foreshadow) =>
    set((state) => ({
      plotLines: state.plotLines.map((p) => {
        if (p.id !== plotLineId) return p;
        const newForeshadow: ForeshadowNode = { ...foreshadow, id: uuid() };
        return {
          ...p,
          foreshadowNodes: [...(p.foreshadowNodes || []), newForeshadow],
          updatedAt: new Date().toISOString(),
        };
      }),
    })),

  resolveForeshadow: (plotLineId, chapterId, content) =>
    set((state) => ({
      plotLines: state.plotLines.map((p) => {
        if (p.id !== plotLineId) return p;
        return {
          ...p,
          status: 'resolved' as const,
          resolution: { chapterId, chapterTitle: '', content },
          updatedAt: new Date().toISOString(),
        } as PlotLine;
      }),
    })),

  updatePlotLineHealth: (plotLineId, health) =>
    set((state) => ({
      plotLines: state.plotLines.map((p) =>
        p.id === plotLineId ? { ...p, health: Math.max(0, Math.min(100, health)), updatedAt: new Date().toISOString() } : p
      ),
    })),

  // 章节剧情摘要
  createChapterPlotSummary: (summary) => {
    const newSummary: ChapterPlotSummary = {
      ...summary,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ chapterPlotSummaries: [...state.chapterPlotSummaries, newSummary] }));
    return newSummary;
  },

  updateChapterPlotSummary: (chapterId, updates) =>
    set((state) => ({
      chapterPlotSummaries: state.chapterPlotSummaries.map((s) =>
        s.chapterId === chapterId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      ),
    })),

  getChapterPlotSummary: (chapterId) =>
    get().chapterPlotSummaries.find((s) => s.chapterId === chapterId),

  load: async () => {
    const data = await loadPersistedData<{
      characters: Character[];
      items: Item[];
      locations: Location[];
      plotLines: PlotLine[];
      snapshots: KnowledgeSnapshot[];
      chapterPlotSummaries: ChapterPlotSummary[];
    }>('knowledge');
    if (data) {
      set((state) => ({
        characters: data.characters ?? state.characters,
        items: data.items ?? state.items,
        locations: data.locations ?? state.locations,
        plotLines: data.plotLines ?? state.plotLines,
        snapshots: data.snapshots ?? state.snapshots,
        chapterPlotSummaries: data.chapterPlotSummaries ?? state.chapterPlotSummaries,
      }));
    }
  },
}));

// 自动保存
const debouncedSaveKnowledge = createDebouncedSave<{ characters: Character[]; items: Item[]; locations: Location[]; plotLines: PlotLine[]; snapshots: KnowledgeSnapshot[]; chapterPlotSummaries: ChapterPlotSummary[] }>('knowledge');
useKnowledgeStore.subscribe((state) => {
  debouncedSaveKnowledge({
    characters: state.characters,
    items: state.items,
    locations: state.locations,
    plotLines: state.plotLines,
    snapshots: state.snapshots,
    chapterPlotSummaries: state.chapterPlotSummaries,
  });
});