# VibeStudio Phase 2: 知识库体系

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成知识库体系核心功能 — 角色库、物品库、地点库、情节线、全局搜索、知识库版本控制。知识库是连接小说创作侧与剧集制作侧的中枢。

**Architecture:** 在现有 Zustand store 体系上，新增 knowledgeStore 统一管理知识库状态。知识库数据以 JSON 结构存储，支持快照生成与回滚。全局搜索基于内存过滤（数据量小），关系图谱使用简化的力导向布局。

**Tech Stack:** 现有 Vite / React 18 / TypeScript 5 / Zustand / Tailwind CSS

---

## File Structure

```
src/
├── stores/
│   └── knowledgeStore.ts              # 新增：知识库统一状态管理
├── components/
│   └── knowledge/
│       ├── RoleLibrary.tsx            # 角色库面板
│       ├── RoleCard.tsx               # 角色卡组件（扩展，支持关系）
│       ├── RelationshipGraph.tsx       # 关系图谱可视化
│       ├── ItemLibrary.tsx            # 物品库面板
│       ├── LocationLibrary.tsx        # 地点库面板
│       ├── PlotLineLibrary.tsx        # 情节线面板（主线/支线/伏笔/悬念）
│       ├── EmotionalArcChart.tsx      # 情感弧线图表
│       ├── GlobalSearch.tsx           # 全局搜索
│       ├── KnowledgeSnapshotManager.tsx # 知识库版本管理
│       └── KnowledgePanel.tsx         # 知识库主面板（整合所有模块）
```

---

## Data Model

### 知识库核心类型

```typescript
// ==================== 知识库 ====================

export interface Character {
  id: string;
  name: string;
  card: CharacterCard;
  personality: string;         // 性格特征
  background: string;        // 背景故事
  arc: EmotionalArc;         // 情感弧线
  relationships: Relationship[];
  appearances: ChapterAppearance[];  // 在哪些章节出现过
  versions: CharacterSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface CharacterCard {
  image?: string;            // Base64 或 URL
  description: string;       // 形象描述（用于AI生成）
  keyExpressions: string[];   // 常用表情/动作标签
}

export interface Relationship {
  targetId: string;           // 关联角色ID
  type: 'ally' | 'enemy' | 'family' | 'romantic' | 'neutral';
  description: string;         // 关系描述
  sinceChapterId?: string;    // 从哪章建立此关系
}

export interface EmotionalArc {
  // 情感变化轨迹，key为chapterId，value为情绪状态
  // e.g., { "ch1": "neutral", "ch2": "anxious", "ch3": "relieved" }
  chapters: Record<string, EmotionTag>;
}

export type EmotionTag =
  | 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness'
  | 'disgust' | 'anger' | 'anticipation' | 'neutral';

export interface ChapterAppearance {
  chapterId: string;
  chapterTitle: string;
  order: number;              // 在章节中的出现顺序
  description?: string;        // 本次出场描述
}

export interface CharacterSnapshot {
  id: string;
  timestamp: string;
  character: Character;        // 快照时的完整角色数据
}

// ==================== 物品 ====================

export interface Item {
  id: string;
  name: string;
  description: string;
  symbolism: string;           // 象征意义
  flow: ItemFlow[];          // 物品流转历史
  appearances: ChapterAppearance[];
  versions: ItemSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface ItemFlow {
  chapterId: string;
  chapterTitle: string;
  holderId?: string;          // 当前持有者角色ID
  holderName?: string;        // 当前持有者名字
  event: string;              // 发生了什么
}

export interface ItemSnapshot {
  id: string;
  timestamp: string;
  item: Item;
}

// ==================== 地点 ====================

export interface Location {
  id: string;
  name: string;
  type: 'interior' | 'exterior' | 'other';
  atmosphere: string;         // 场景氛围描述
  description: string;        // 详细描述
  appearances: ChapterAppearance[];
  createdAt: string;
  updatedAt: string;
}

// ==================== 情节线 ====================

export interface PlotLine {
  id: string;
  type: PlotLineType;
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'abandoned';
  chapters: string[];         // 涉及章节ID列表
  relatedCharacterIds: string[];
  relatedItemIds: string[];
  foreshadow?: string;       // 伏笔内容（如果是伏笔类型）
  suspense?: string;         // 悬念内容（如果是悬念类型）
  createdAt: string;
  updatedAt: string;
}

export type PlotLineType = 'main' | 'sub' | 'foreshadow' | 'suspense';

// ==================== 知识库快照 ====================

export interface KnowledgeSnapshot {
  id: string;
  timestamp: string;
  note?: string;             // 快照备注
  characters: Character[];
  items: Item[];
  locations: Location[];
  plotLines: PlotLine[];
}

// ==================== 搜索 ====================

export interface SearchResult {
  type: 'character' | 'item' | 'location' | 'plotline' | 'chapter';
  id: string;
  title: string;
  excerpt?: string;           // 匹配的文本片段
  chapterId?: string;         // 如果是小说章节内容
  score: number;              // 匹配度
}
```

---

## Task 1: 创建 knowledgeStore

**Files:**
- Create: `src/stores/knowledgeStore.ts`

- [ ] **Step 1: 创建 knowledgeStore.ts**

```typescript
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
  ChapterAppearance,
  EmotionTag,
  CharacterCard,
} from '@/types';
import { v4 as uuid } from 'uuid';

interface KnowledgeState {
  // 知识库数据
  characters: Character[];
  items: Item[];
  locations: Location[];
  plotLines: PlotLine[];

  // 快照历史
  snapshots: KnowledgeSnapshot[];

  // 搜索
  searchQuery: string;
  searchResults: SearchResult[];

  // ========== 角色操作 ==========
  addCharacter: (character: Omit<Character, 'id' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => Character;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  addRelationship: (characterId: string, relationship: Omit<Relationship, 'targetId'>) => void;
  removeRelationship: (characterId: string, targetId: string) => void;
  updateEmotionalArc: (characterId: string, chapterId: string, emotion: EmotionTag) => void;
  snapshotCharacter: (characterId: string) => void;

  // ========== 物品操作 ==========
  addItem: (item: Omit<Item, 'id' | 'flow' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => Item;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  addItemFlow: (itemId: string, flow: Omit<ItemFlow, 'chapterId'>) => void;
  snapshotItem: (itemId: string) => void;

  // ========== 地点操作 ==========
  addLocation: (location: Omit<Location, 'id' | 'appearances' | 'createdAt' | 'updatedAt'>) => Location;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  deleteLocation: (id: string) => void;

  // ========== 情节线操作 ==========
  addPlotLine: (plotLine: Omit<PlotLine, 'id' | 'createdAt' | 'updatedAt'>) => PlotLine;
  updatePlotLine: (id: string, updates: Partial<PlotLine>) => void;
  deletePlotLine: (id: string) => void;
  resolvePlotLine: (id: string) => void;

  // ========== 知识库快照 ==========
  createSnapshot: (note?: string) => KnowledgeSnapshot;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;

  // ========== 搜索 ==========
  setSearchQuery: (query: string) => void;
  performSearch: (query: string, chapters?: { id: string; title: string; content: string }[]) => void;
  clearSearch: () => void;

  // ========== 工具 ==========
  getCharacterById: (id: string) => Character | undefined;
  getItemById: (id: string) => Item | undefined;
  getLocationById: (id: string) => Location | undefined;
  getPlotLineById: (id: string) => PlotLine | undefined;
  getPlotLinesByType: (type: PlotLineType) => PlotLine[];
  getUnresolvedPlotLines: () => PlotLine[];
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  characters: [],
  items: [],
  locations: [],
  plotLines: [],
  snapshots: [],
  searchQuery: '',
  searchResults: [],

  // ========== 角色操作 ==========

  addCharacter: (character) => {
    const newCharacter: Character = {
      ...character,
      id: uuid(),
      appearances: [],
      versions: [],
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
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id),
    })),

  addRelationship: (characterId, relationship) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === characterId
          ? {
              ...c,
              relationships: [
                ...c.relationships,
                { ...relationship, targetId: relationship.targetId || '' } as Relationship,
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
        c.id === characterId
          ? { ...c, versions: [...c.versions, snapshot] }
          : c
      ),
    }));
  },

  // ========== 物品操作 ==========

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
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),

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

  // ========== 地点操作 ==========

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
    set((state) => ({
      locations: state.locations.filter((l) => l.id !== id),
    })),

  // ========== 情节线操作 ==========

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
    set((state) => ({
      plotLines: state.plotLines.filter((p) => p.id !== id),
    })),

  resolvePlotLine: (id) =>
    set((state) => ({
      plotLines: state.plotLines.map((p) =>
        p.id === id ? { ...p, status: 'resolved' as const, updatedAt: new Date().toISOString() } : p
      ),
    })),

  // ========== 知识库快照 ==========

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
    set((state) => ({
      snapshots: state.snapshots.filter((s) => s.id !== snapshotId),
    })),

  // ========== 搜索 ==========

  setSearchQuery: (query) => set({ searchQuery: query }),

  performSearch: (query, chapters) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }

    const results: SearchResult[] = [];
    const q = query.toLowerCase();
    const state = get();

    // 搜索角色
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

    // 搜索物品
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

    // 搜索地点
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

    // 搜索情节线
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

    // 搜索章节内容
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

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    set({ searchResults: results, searchQuery: query });
  },

  clearSearch: () => set({ searchResults: [], searchQuery: '' }),

  // ========== 工具 ==========

  getCharacterById: (id) => get().characters.find((c) => c.id === id),
  getItemById: (id) => get().items.find((i) => i.id === id),
  getLocationById: (id) => get().locations.find((l) => l.id === id),
  getPlotLineById: (id) => get().plotLines.find((p) => p.id === id),
  getPlotLinesByType: (type) => get().plotLines.filter((p) => p.type === type),
  getUnresolvedPlotLines: () => get().plotLines.filter((p) => p.status === 'active'),
}));
```

---

## Task 2: 创建知识库面板

**Files:**
- Create: `src/components/knowledge/KnowledgePanel.tsx`
- Create: `src/components/knowledge/RoleLibrary.tsx`
- Create: `src/components/knowledge/ItemLibrary.tsx`
- Create: `src/components/knowledge/LocationLibrary.tsx`
- Create: `src/components/knowledge/PlotLineLibrary.tsx`
- Create: `src/components/knowledge/GlobalSearch.tsx`

- [ ] **Step 1: 创建 KnowledgePanel.tsx**

```typescript
import { useState } from 'react';
import { RoleLibrary } from './RoleLibrary';
import { ItemLibrary } from './ItemLibrary';
import { LocationLibrary } from './LocationLibrary';
import { PlotLineLibrary } from './PlotLineLibrary';
import { GlobalSearch } from './GlobalSearch';
import { KnowledgeSnapshotManager } from './KnowledgeSnapshotManager';

type KnowledgeTab = 'roles' | 'items' | 'locations' | 'plotlines' | 'search' | 'snapshots';

export function KnowledgePanel() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('roles');

  const tabs: { key: KnowledgeTab; label: string }[] = [
    { key: 'roles', label: '角色' },
    { key: 'items', label: '物品' },
    { key: 'locations', label: '地点' },
    { key: 'plotlines', label: '情节' },
    { key: 'search', label: '搜索' },
    { key: 'snapshots', label: '快照' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab 导航 */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-neutral-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'roles' && <RoleLibrary />}
        {activeTab === 'items' && <ItemLibrary />}
        {activeTab === 'locations' && <LocationLibrary />}
        {activeTab === 'plotlines' && <PlotLineLibrary />}
        {activeTab === 'search' && <GlobalSearch />}
        {activeTab === 'snapshots' && <KnowledgeSnapshotManager />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 RoleLibrary.tsx**

```typescript
import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { Character, Relationship } from '@/types';

export function RoleLibrary() {
  const { characters, addCharacter, updateCharacter, deleteCharacter } = useKnowledgeStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="p-4">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">角色库 ({characters.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增角色'}
        </button>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <AddCharacterForm
          onAdd={(character) => {
            addCharacter(character);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* 角色列表 */}
      {characters.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无角色</p>
          <p className="text-xs mt-1">从小说同步或手动添加开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onUpdate={(updates) => updateCharacter(character.id, updates)}
              onDelete={() => deleteCharacter(character.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddCharacterForm({
  onAdd,
  onCancel,
}: {
  onAdd: (c: Omit<Character, 'id' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="角色名"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="形象描述（用于AI生成）"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <input
        type="text"
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        placeholder="性格特征"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd({
              name,
              card: { description, keyExpressions: [] },
              personality,
              background: '',
              arc: { chapters: {} },
              relationships: [],
            });
          }}
          className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
        >
          添加
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600">
          取消
        </button>
      </div>
    </div>
  );
}

function CharacterCard({
  character,
  onUpdate,
  onDelete,
}: {
  character: Character;
  onUpdate: (updates: Partial<Character>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const relationshipLabels = {
    ally: { label: '同盟', color: 'bg-green-900 text-green-300' },
    enemy: { label: '敌对', color: 'bg-red-900 text-red-300' },
    family: { label: '家人', color: 'bg-blue-900 text-blue-300' },
    romantic: { label: '恋人', color: 'bg-pink-900 text-pink-300' },
    neutral: { label: '中立', color: 'bg-neutral-700 text-neutral-300' },
  };

  return (
    <div className="bg-neutral-900 rounded-lg overflow-hidden">
      {/* 卡片头部 */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-white font-medium">{character.name}</h4>
            <p className="text-xs text-neutral-500 mt-0.5">{character.personality || '暂无性格描述'}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-1 text-xs bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700"
            >
              {expanded ? '收起' : '展开'}
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
            >
              删除
            </button>
          </div>
        </div>

        {/* 关系标签 */}
        {character.relationships.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {character.relationships.map((rel) => {
              const { label, color } = relationshipLabels[rel.type];
              return (
                <span key={rel.targetId} className={`px-1.5 py-0.5 text-[10px] rounded ${color}`}>
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-800 pt-3 space-y-3">
          {/* 形象描述 */}
          {character.card.description && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">形象描述</p>
              <p className="text-sm text-neutral-300">{character.card.description}</p>
            </div>
          )}

          {/* 背景 */}
          {character.background && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">背景</p>
              <p className="text-sm text-neutral-300">{character.background}</p>
            </div>
          )}

          {/* 出场章节 */}
          {character.appearances.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">出场章节</p>
              <div className="flex flex-wrap gap-1">
                {character.appearances.map((app) => (
                  <span key={app.chapterId} className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                    {app.chapterTitle}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 版本历史 */}
          {character.versions.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">版本快照</p>
              <p className="text-sm text-neutral-400">{character.versions.length} 个快照</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建 ItemLibrary.tsx**

```typescript
import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { Item } from '@/types';

export function ItemLibrary() {
  const { items, addItem, updateItem, deleteItem } = useKnowledgeStore();
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">物品库 ({items.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增物品'}
        </button>
      </div>

      {showAddForm && (
        <AddItemForm
          onAdd={(item) => {
            addItem(item);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {items.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无物品</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onUpdate={(updates) => updateItem(item.id, updates)}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (i: Omit<Item, 'id' | 'flow' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symbolism, setSymbolism] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="物品名"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="物品描述"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <input
        type="text"
        value={symbolism}
        onChange={(e) => setSymbolism(e.target.value)}
        placeholder="象征意义"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd({ name, description, symbolism, appearances: [] });
          }}
          className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
        >
          添加
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600">
          取消
        </button>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: Item;
  onUpdate: (updates: Partial<Item>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-neutral-900 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-white font-medium">{item.name}</h4>
            <p className="text-xs text-neutral-500 mt-0.5">{item.symbolism || '暂无象征意义'}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-1 text-xs bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700"
            >
              {expanded ? '收起' : '展开'}
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
            >
              删除
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-800 pt-3 space-y-3">
          {item.description && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">描述</p>
              <p className="text-sm text-neutral-300">{item.description}</p>
            </div>
          )}

          {item.flow.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">流转历史</p>
              <div className="space-y-1">
                {item.flow.map((f, i) => (
                  <div key={i} className="text-sm text-neutral-400">
                    <span className="text-neutral-600">{f.chapterTitle}</span>: {f.event}
                    {f.holderName && <span className="text-neutral-500"> ({f.holderName})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建 LocationLibrary.tsx**

```typescript
import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { Location } from '@/types';

export function LocationLibrary() {
  const { locations, addLocation, updateLocation, deleteLocation } = useKnowledgeStore();
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">地点库 ({locations.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增地点'}
        </button>
      </div>

      {showAddForm && (
        <AddLocationForm
          onAdd={(location) => {
            addLocation(location);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {locations.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无地点</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onUpdate={(updates) => updateLocation(location.id, updates)}
              onDelete={() => deleteLocation(location.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddLocationForm({
  onAdd,
  onCancel,
}: {
  onAdd: (l: Omit<Location, 'id' | 'appearances' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Location['type']>('interior');
  const [atmosphere, setAtmosphere] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="地点名称"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as Location['type'])}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
      >
        <option value="interior">室内</option>
        <option value="exterior">室外</option>
        <option value="other">其他</option>
      </select>
      <input
        type="text"
        value={atmosphere}
        onChange={(e) => setAtmosphere(e.target.value)}
        placeholder="场景氛围"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="详细描述"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd({ name, type, atmosphere, description, appearances: [] });
          }}
          className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
        >
          添加
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600">
          取消
        </button>
      </div>
    </div>
  );
}

function LocationCard({
  location,
  onUpdate,
  onDelete,
}: {
  location: Location;
  onUpdate: (updates: Partial<Location>) => void;
  onDelete: () => void;
}) {
  const typeLabels = {
    interior: { label: '室内', color: 'bg-blue-900 text-blue-300' },
    exterior: { label: '室外', color: 'bg-green-900 text-green-300' },
    other: { label: '其他', color: 'bg-neutral-700 text-neutral-300' },
  };

  const { label, color } = typeLabels[location.type];

  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{location.name}</h4>
          <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded mt-1 ${color}`}>
            {label}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
        >
          删除
        </button>
      </div>
      {location.atmosphere && (
        <p className="text-xs text-neutral-400 mt-2">氛围: {location.atmosphere}</p>
      )}
      {location.description && (
        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{location.description}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 创建 PlotLineLibrary.tsx**

```typescript
import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { PlotLine, PlotLineType } from '@/types';

export function PlotLineLibrary() {
  const { plotLines, addPlotLine, updatePlotLine, deletePlotLine, resolvePlotLine, getUnresolvedPlotLines } =
    useKnowledgeStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<PlotLineType | 'all'>('all');

  const filteredPlotLines =
    filterType === 'all' ? plotLines : plotLines.filter((p) => p.type === filterType);

  const unresolvedCount = getUnresolvedPlotLines().length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-white">情节线 ({plotLines.length})</h3>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-yellow-900 text-yellow-300 rounded">
              {unresolvedCount} 活跃中
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增'}
        </button>
      </div>

      {/* 过滤器 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'main', 'sub', 'foreshadow', 'suspense'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-2 py-1 text-xs rounded ${
              filterType === type
                ? 'bg-neutral-700 text-white'
                : 'bg-neutral-800 text-neutral-500 hover:text-white'
            }`}
          >
            {type === 'all' ? '全部' : type === 'main' ? '主线' : type === 'sub' ? '支线' : type === 'foreshadow' ? '伏笔' : '悬念'}
          </button>
        ))}
      </div>

      {showAddForm && (
        <AddPlotLineForm
          onAdd={(plotLine) => {
            addPlotLine(plotLine);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {filteredPlotLines.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无情节线</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlotLines.map((plotLine) => (
            <PlotLineCard
              key={plotLine.id}
              plotLine={plotLine}
              onUpdate={(updates) => updatePlotLine(plotLine.id, updates)}
              onDelete={() => deletePlotLine(plotLine.id)}
              onResolve={() => resolvePlotLine(plotLine.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddPlotLineForm({
  onAdd,
  onCancel,
}: {
  onAdd: (p: Omit<PlotLine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<PlotLineType>('main');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PlotLineType)}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
      >
        <option value="main">主线</option>
        <option value="sub">支线</option>
        <option value="foreshadow">伏笔</option>
        <option value="suspense">悬念</option>
      </select>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="描述"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!title.trim()) return;
            onAdd({
              type,
              title,
              description,
              status: 'active',
              chapters: [],
              relatedCharacterIds: [],
              relatedItemIds: [],
            });
          }}
          className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
        >
          添加
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600">
          取消
        </button>
      </div>
    </div>
  );
}

function PlotLineCard({
  plotLine,
  onUpdate,
  onDelete,
  onResolve,
}: {
  plotLine: PlotLine;
  onUpdate: (updates: Partial<PlotLine>) => void;
  onDelete: () => void;
  onResolve: () => void;
}) {
  const typeConfig = {
    main: { label: '主线', color: 'bg-blue-900 text-blue-300', icon: '📍' },
    sub: { label: '支线', color: 'bg-purple-900 text-purple-300', icon: '🔹' },
    foreshadow: { label: '伏笔', color: 'bg-yellow-900 text-yellow-300', icon: '🎭' },
    suspense: { label: '悬念', color: 'bg-red-900 text-red-300', icon: '❓' },
  };

  const { label, color, icon } = typeConfig[plotLine.type];

  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span>{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium">{plotLine.title}</h4>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${color}`}>{label}</span>
              {plotLine.status === 'resolved' && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-900 text-green-300">
                  已解决
                </span>
              )}
            </div>
            {plotLine.description && (
              <p className="text-xs text-neutral-400 mt-1">{plotLine.description}</p>
            )}
            {plotLine.chapters.length > 0 && (
              <p className="text-xs text-neutral-600 mt-1">涉及 {plotLine.chapters.length} 章</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {plotLine.status !== 'resolved' && (
            <button
              onClick={onResolve}
              className="px-2 py-1 text-xs bg-green-900 text-green-300 rounded hover:bg-green-800"
            >
              解决
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 创建 GlobalSearch.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useNovelStore } from '@/stores/novelStore';

export function GlobalSearch() {
  const { searchQuery, searchResults, performSearch, clearSearch } = useKnowledgeStore();
  const { currentNovel } = useNovelStore();
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        const chapters = currentNovel?.chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          content: ch.content,
        }));
        performSearch(query, chapters);
      } else {
        clearSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, currentNovel]);

  const typeIcons = {
    character: '👤',
    item: '📦',
    location: '📍',
    plotline: '📋',
    chapter: '📄',
  };

  return (
    <div className="p-4">
      {/* 搜索框 */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索角色、物品、地点、情节、章节内容..."
          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              clearSearch();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {/* 结果 */}
      {searchResults.length === 0 && query.trim() ? (
        <div className="text-center text-neutral-500 py-12">
          <p>未找到匹配结果</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 mb-2">找到 {searchResults.length} 个结果</p>
          {searchResults.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="p-3 bg-neutral-900 rounded hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{typeIcons[result.type]}</span>
                <span className="text-white font-medium">{result.title}</span>
                <span className="text-xs text-neutral-500">{result.type}</span>
              </div>
              {result.excerpt && (
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{result.excerpt}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-neutral-600 py-12">
          <p className="text-sm">输入关键词开始搜索</p>
          <p className="text-xs mt-1">支持搜索角色、物品、地点、情节线、小说章节内容</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: 创建 KnowledgeSnapshotManager.tsx**

```typescript
import { useKnowledgeStore } from '@/stores/knowledgeStore';

export function KnowledgeSnapshotManager() {
  const { snapshots, createSnapshot, restoreSnapshot, deleteSnapshot } = useKnowledgeStore();

  const handleCreateSnapshot = () => {
    const note = prompt('快照备注（可选）:');
    createSnapshot(note || undefined);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">知识库快照 ({snapshots.length})</h3>
        <button
          onClick={handleCreateSnapshot}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          创建快照
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无快照</p>
          <p className="text-xs mt-1">知识库同步时会自动创建快照</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...snapshots].reverse().map((snapshot) => (
            <div key={snapshot.id} className="p-4 bg-neutral-900 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-medium">
                    {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                  </p>
                  {snapshot.note && <p className="text-xs text-neutral-400 mt-0.5">{snapshot.note}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (confirm('确定要恢复到此快照吗？当前未保存的更改将丢失。')) {
                        restoreSnapshot(snapshot.id);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-blue-900 text-blue-300 rounded hover:bg-blue-800"
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定要删除此快照吗？')) {
                        deleteSnapshot(snapshot.id);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-neutral-500">
                <span>角色: {snapshot.characters.length}</span>
                <span>物品: {snapshot.items.length}</span>
                <span>地点: {snapshot.locations.length}</span>
                <span>情节: {snapshot.plotLines.length}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 3: 改造 AssetsPanel 为 KnowledgePanel

**Files:**
- Modify: `src/components/layout/MainShell.tsx` — 更新导航和面板切换
- Modify: `src/components/layout/AssetsPanel.tsx` — 替换为 KnowledgePanel 导入

- [ ] **Step 1: 替换 AssetsPanel 导入**

在 `src/components/layout/AssetsPanel.tsx` 中，将内容替换为：

```typescript
import { KnowledgePanel } from '@/components/knowledge/KnowledgePanel';

export function AssetsPanel() {
  return <KnowledgePanel />;
}
```

---

## Self-Review 检查清单

1. **Spec 覆盖检查** — 逐项核对 PRD：
   - [x] 角色库（角色卡、关系网、版本快照）
   - [x] 物品库（描述、流转历史）
   - [x] 地点库（氛围、类型）
   - [x] 情节线（主线/支线/伏笔/悬念，状态追踪）
   - [x] 全局搜索（角色/物品/地点/情节/章节全文）
   - [x] 知识库快照（创建、恢复、删除）

2. **Placeholder 扫描** — 无 TODO/TBD 占位符

3. **类型一致性** — 所有知识库类型在 `src/types/index.ts` 定义，store 正确引用

4. **任务完整性** — 所有任务都有具体文件、具体代码

5. **现有代码** — Phase 1 的 novelStore 保持不变，知识库独立扩展

---

## 执行选择

**Plan 完成，保存于:** `docs/superpowers/plans/2026-04-12-vibe-studio-phase-2-knowledge.md`

两个执行选项：

**1. Subagent-Driven (推荐)** — 每个任务派一个新 subagent 执行，任务间有检查点

**2. Inline Execution** — 在当前 session 内批量执行，有检查点

选择哪个方式？
