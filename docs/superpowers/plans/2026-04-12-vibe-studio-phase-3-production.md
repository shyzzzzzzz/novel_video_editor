# VibeStudio Phase 3: 剧集制作侧

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成剧集制作侧核心功能 — 剧集看板（集视图+场景视图双切换）、集详情面板（含分镜/Takes/音频/剪辑快捷入口）、补充缺失类型定义。

**Architecture:** 在现有 store 体系（workspaceStore、storyboardStore、takesStore、timelineStore、audioStore、editorStore）基础上，新增 productionStore 管理看板状态，改造 ProjectPanel 为剧集制作入口。

**Tech Stack:** 现有 Vite / React 18 / TypeScript 5 / Zustand / Tailwind CSS

---

## File Structure

```
src/
├── stores/
│   └── productionStore.ts              # 新增：看板状态管理
├── components/
│   └── production/
│       ├── ProductionPanel.tsx        # 剧集看板主面板（改造自ProjectPanel）
│       ├── EpisodeKanban.tsx          # 集视图看板
│       ├── SceneView.tsx             # 场景视图
│       ├── EpisodeDetail.tsx         # 集详情面板（整合分镜/Takes/编辑器入口）
│       ├── StoryboardView.tsx        # 分镜可视化面板
│       └── TakesBrowser.tsx          # Takes 对比选择面板
```

---

## Missing Types to Add

```typescript
// ==================== 时间线/剪辑 ====================

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio';
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
  height: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  transitionIn?: Transition;
  transitionOut?: Transition;
  effects: ClipEffect[];
  volume?: number;
  speed?: number;
}

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number;
}

export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide';

export interface ClipEffect {
  id: string;
  type: EffectType;
  parameters: Record<string, number>;
}

export type EffectType = 'brightness' | 'contrast' | 'saturation' | 'speed' | 'reverse';

// ==================== Takes ====================

export interface TakeFilter {
  status?: TakeStatus;
  shotId?: string;
}

// ==================== 剧集制作 ====================

export interface ProductionEpisode {
  id: string;
  name: string;
  novelChapterIds: string[];   // 关联的小说章节
  status: ProductionStatus;
  scenes: ProductionScene[];
  currentScriptId?: string;
  currentStoryboardId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductionStatus = 'outline' | 'scripting' | 'storyboard' | 'takes' | 'rough_cut' | 'final';

export interface ProductionScene {
  id: string;
  episodeId: string;
  title: string;
  description: string;
  extractedFromChapterId?: string;
  shotIds: string[];
  status: SceneStatus;
  emotion?: string;
  location?: string;
  characters: string[];
  order: number;
}

export type SceneStatus = 'pending' | 'storyboarded' | 'takes_generated' | 'edited';
```

---

## Task 1: 补充缺失类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 添加缺失的类型**

在 `src/types/index.ts` 末尾添加：

```typescript
// ==================== 时间线/剪辑 ====================

export interface TimelineTrack {
  id: string;
  type: 'video' | 'audio';
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
  height: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: 'video' | 'audio' | 'image';
  name: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  transitionIn?: Transition;
  transitionOut?: Transition;
  effects: ClipEffect[];
  volume?: number;
  speed?: number;
}

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number;
}

export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide';

export interface ClipEffect {
  id: string;
  type: EffectType;
  parameters: Record<string, number>;
}

export type EffectType = 'brightness' | 'contrast' | 'saturation' | 'speed' | 'reverse';

// ==================== Takes ====================

export interface TakeFilter {
  status?: TakeStatus;
  shotId?: string;
}

// ==================== 剧集制作 ====================

export interface ProductionEpisode {
  id: string;
  name: string;
  novelChapterIds: string[];
  status: ProductionStatus;
  scenes: ProductionScene[];
  currentScriptId?: string;
  currentStoryboardId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProductionStatus = 'outline' | 'scripting' | 'storyboard' | 'takes' | 'rough_cut' | 'final';

export interface ProductionScene {
  id: string;
  episodeId: string;
  title: string;
  description: string;
  extractedFromChapterId?: string;
  shotIds: string[];
  status: SceneStatus;
  emotion?: string;
  location?: string;
  characters: string[];
  order: number;
}

export type SceneStatus = 'pending' | 'storyboarded' | 'takes_generated' | 'edited';
```

---

## Task 2: 创建 productionStore

**Files:**
- Create: `src/stores/productionStore.ts`

- [ ] **Step 1: 创建 productionStore.ts**

```typescript
import { create } from 'zustand';
import { ProductionEpisode, ProductionScene, ProductionStatus, SceneStatus } from '@/types';
import { v4 as uuid } from 'uuid';

type KanbanView = 'episode' | 'scene';

interface ProductionState {
  // 看板
  kanbanView: KanbanView;
  setKanbanView: (view: KanbanView) => void;

  // 集
  episodes: ProductionEpisode[];
  currentEpisodeId: string | null;
  addEpisode: (name: string, novelChapterIds?: string[]) => ProductionEpisode;
  updateEpisode: (id: string, updates: Partial<ProductionEpisode>) => void;
  deleteEpisode: (id: string) => void;
  setCurrentEpisode: (id: string | null) => void;
  getCurrentEpisode: () => ProductionEpisode | null;
  advanceEpisodeStatus: (id: string) => void;

  // 场景
  addScene: (episodeId: string, title: string, description?: string) => ProductionScene;
  updateScene: (sceneId: string, updates: Partial<ProductionScene>) => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (episodeId: string, sceneIds: string[]) => void;

  // 工具
  getScenesForEpisode: (episodeId: string) => ProductionScene[];
  getEpisodeProgress: (episodeId: string) => { stage: ProductionStatus; completed: number; total: number };
}

export const useProductionStore = create<ProductionState>((set, get) => ({
  kanbanView: 'episode',
  setKanbanView: (view) => set({ kanbanView: view }),

  episodes: [],
  currentEpisodeId: null,

  addEpisode: (name, novelChapterIds = []) => {
    const episode: ProductionEpisode = {
      id: uuid(),
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
      'takes',
      'rough_cut',
      'final',
    ];
    const currentIndex = statusOrder.indexOf(episode.status);
    if (currentIndex < statusOrder.length - 1) {
      const nextStatus = statusOrder[currentIndex + 1];
      get().updateEpisode(id, { status: nextStatus });
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
    if (!episode) return { stage: 'outline' as ProductionStatus, completed: 0, total: 5 };

    const statusOrder: ProductionStatus[] = [
      'outline',
      'scripting',
      'storyboard',
      'takes',
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
}));
```

---

## Task 3: 创建剧集看板组件

**Files:**
- Create: `src/components/production/ProductionPanel.tsx`
- Create: `src/components/production/EpisodeKanban.tsx`
- Create: `src/components/production/SceneView.tsx`
- Create: `src/components/production/EpisodeDetail.tsx`
- Create: `src/components/production/StoryboardView.tsx`
- Create: `src/components/production/TakesBrowser.tsx`

- [ ] **Step 1: 创建目录 src/components/production/**

- [ ] **Step 2: 创建 ProductionPanel.tsx**

```typescript
import { useState } from 'react';
import { useProductionStore } from '@/stores/productionStore';
import { EpisodeKanban } from './EpisodeKanban';
import { SceneView } from './SceneView';
import { EpisodeDetail } from './EpisodeDetail';

type ProductionTab = 'kanban' | 'detail';

export function ProductionPanel() {
  const { kanbanView, setKanbanView, currentEpisodeId, episodes } = useProductionStore();
  const [activeTab, setActiveTab] = useState<ProductionTab>(currentEpisodeId ? 'detail' : 'kanban');

  const currentEpisode = episodes.find((e) => e.id === currentEpisodeId);

  return (
    <div className="h-full flex flex-col">
      {/* 顶部导航 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab('kanban'); }}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'kanban' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'
            }`}
          >
            看板
          </button>
          {currentEpisode && (
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'detail' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              {currentEpisode.name}
            </button>
          )}
        </div>

        {/* 看板视图切换 */}
        {activeTab === 'kanban' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">视图:</span>
            <button
              onClick={() => setKanbanView('episode')}
              className={`px-2 py-0.5 rounded ${
                kanbanView === 'episode' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
              }`}
            >
              集视图
            </button>
            <button
              onClick={() => setKanbanView('scene')}
              className={`px-2 py-0.5 rounded ${
                kanbanView === 'scene' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
              }`}
            >
              场景视图
            </button>
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'kanban' ? (
          kanbanView === 'episode' ? <EpisodeKanban /> : <SceneView />
        ) : (
          <EpisodeDetail episode={currentEpisode!} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 EpisodeKanban.tsx**

```typescript
import { useProductionStore } from '@/stores/productionStore';
import { ProductionEpisode, ProductionStatus } from '@/types';

const STAGES: { key: ProductionStatus; label: string }[] = [
  { key: 'outline', label: '大纲' },
  { key: 'scripting', label: '剧本' },
  { key: 'storyboard', label: '分镜' },
  { key: 'takes', label: 'Takes' },
  { key: 'rough_cut', label: '粗剪' },
  { key: 'final', label: '成片' },
];

export function EpisodeKanban() {
  const { episodes, addEpisode, setCurrentEpisode } = useProductionStore();

  const [newEpisodeName, setNewEpisodeName] = useState('');

  const handleAddEpisode = () => {
    if (!newEpisodeName.trim()) return;
    const ep = addEpisode(newEpisodeName.trim());
    setNewEpisodeName('');
    setCurrentEpisode(ep.id);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 新建集 */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newEpisodeName}
            onChange={(e) => setNewEpisodeName(e.target.value)}
            placeholder="新集名称"
            className="flex-1 px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEpisode()}
          />
          <button
            onClick={handleAddEpisode}
            className="px-4 py-2 text-sm bg-white text-black rounded hover:bg-neutral-200"
          >
            新建集
          </button>
        </div>
      </div>

      {/* 看板表格 */}
      <div className="flex-1 overflow-auto p-4">
        {episodes.length === 0 ? (
          <div className="text-center text-neutral-500 py-12">
            <p>暂无剧集</p>
            <p className="text-xs mt-1">创建第一个剧集开始</p>
          </div>
        ) : (
          <div className="min-w-[800px]">
            {/* 表头 */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              <div className="col-span-1 text-sm font-medium text-white px-2">集</div>
              {STAGES.map((stage) => (
                <div key={stage.key} className="text-center">
                  <span className="text-xs text-neutral-500">{stage.label}</span>
                </div>
              ))}
            </div>

            {/* 行 */}
            {episodes.map((episode) => (
              <EpisodeRow key={episode.id} episode={episode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EpisodeRow({ episode }: { episode: ProductionEpisode }) {
  const { setCurrentEpisode } = useProductionStore();

  const stageIndex = STAGES.findIndex((s) => s.key === episode.status);

  return (
    <div className="grid grid-cols-7 gap-2 mb-2">
      <div className="flex items-center">
        <button
          onClick={() => setCurrentEpisode(episode.id)}
          className="text-sm text-white hover:text-blue-400 truncate"
        >
          {episode.name}
        </button>
      </div>
      {STAGES.map((stage, idx) => {
        const isComplete = idx < stageIndex;
        const isCurrent = idx === stageIndex;
        return (
          <div key={stage.key} className="flex items-center justify-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                isComplete
                  ? 'bg-green-600 text-white'
                  : isCurrent
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-neutral-950'
                  : 'bg-neutral-800 text-neutral-600'
              }`}
            >
              {isComplete ? '✓' : isCurrent ? '●' : '○'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: 创建 SceneView.tsx**

```typescript
import { useProductionStore } from '@/stores/productionStore';
import { ProductionScene, SceneStatus } from '@/types';

export function SceneView() {
  const { episodes, setCurrentEpisode, getScenesForEpisode } = useProductionStore();

  const [filterEpisodeId, setFilterEpisodeId] = useState<string>('all');

  const filteredEpisodes =
    filterEpisodeId === 'all'
      ? episodes
      : episodes.filter((e) => e.id === filterEpisodeId);

  const allScenes = filteredEpisodes.flatMap((e) =>
    getScenesForEpisode(e.id).map((s) => ({ ...s, episodeName: e.name }))
  );

  return (
    <div className="p-4">
      {/* 过滤器 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-neutral-500">筛选集:</span>
        <select
          value={filterEpisodeId}
          onChange={(e) => setFilterEpisodeId(e.target.value)}
          className="px-3 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
        >
          <option value="all">全部</option>
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* 场景卡片网格 */}
      {allScenes.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无场景</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {allScenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              episodeName={scene.episodeName}
              onClick={() => {
                setCurrentEpisode(scene.episodeId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneCard({
  scene,
  episodeName,
  onClick,
}: {
  scene: ProductionScene & { episodeName: string };
  episodeName: string;
  onClick: () => void;
}) {
  const statusConfig = {
    pending: { label: '待处理', color: 'bg-neutral-700 text-neutral-400' },
    storyboarded: { label: '已分镜', color: 'bg-yellow-900 text-yellow-300' },
    takes_generated: { label: 'Takes完成', color: 'bg-blue-900 text-blue-300' },
    edited: { label: '已剪辑', color: 'bg-green-900 text-green-300' },
  };

  const { label, color } = statusConfig[scene.status];

  return (
    <div
      onClick={onClick}
      className="bg-neutral-900 rounded-lg p-4 hover:bg-neutral-800 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{scene.title}</h4>
          <p className="text-xs text-neutral-600 mt-0.5">{episodeName}</p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] rounded ${color}`}>{label}</span>
      </div>

      {scene.description && (
        <p className="text-xs text-neutral-400 line-clamp-2 mt-2">{scene.description}</p>
      )}

      <div className="flex items-center gap-2 mt-3 text-xs text-neutral-600">
        {scene.location && <span>📍 {scene.location}</span>}
        {scene.emotion && <span>🎭 {scene.emotion}</span>}
        <span>🎬 {scene.shotIds.length} 镜头</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建 EpisodeDetail.tsx**

```typescript
import { useProductionStore } from '@/stores/productionStore';
import { StoryboardView } from './StoryboardView';
import { TakesBrowser } from './TakesBrowser';
import { ProductionStatus } from '@/types';

type DetailTab = 'storyboard' | 'takes' | 'timeline' | 'audio';

export function EpisodeDetail({ episode }: { episode: ProductionEpisode }) {
  const { advanceEpisodeStatus } = useProductionStore();
  const [activeTab, setActiveTab] = useState<DetailTab>('storyboard');

  const statusLabels: Record<ProductionStatus, string> = {
    outline: '大纲',
    scripting: '剧本',
    storyboard: '分镜',
    takes: 'Takes',
    rough_cut: '粗剪',
    final: '成片',
  };

  return (
    <div className="h-full flex flex-col">
      {/* 集信息头部 */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{episode.name}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {episode.scenes.length} 个场景 ·{' '}
              <span className="text-blue-400">{statusLabels[episode.status]}</span>
            </p>
          </div>
          <button
            onClick={() => advanceEpisodeStatus(episode.id)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            推进状态
          </button>
        </div>

        {/* Tab */}
        <div className="flex gap-1 mt-4">
          {(
            [
              { key: 'storyboard', label: '分镜' },
              { key: 'takes', label: 'Takes' },
              { key: 'timeline', label: '时间线' },
              { key: 'audio', label: '音频' },
            ] as { key: DetailTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-sm rounded ${
                activeTab === tab.key
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'storyboard' && <StoryboardView episodeId={episode.id} />}
        {activeTab === 'takes' && <TakesBrowser episodeId={episode.id} />}
        {activeTab === 'timeline' && <TimelinePlaceholder />}
        {activeTab === 'audio' && <AudioPlaceholder />}
      </div>
    </div>
  );
}

function TimelinePlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-neutral-500">
      <div className="text-center">
        <p className="mb-2">时间线编辑</p>
        <p className="text-xs">Phase 4 实现</p>
      </div>
    </div>
  );
}

function AudioPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-neutral-500">
      <div className="text-center">
        <p className="mb-2">音频管线</p>
        <p className="text-xs">Phase 4 实现</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 创建 StoryboardView.tsx**

```typescript
import { useState } from 'react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { useProductionStore } from '@/stores/productionStore';
import { CameraAngle } from '@/types';

export function StoryboardView({ episodeId }: { episodeId: string }) {
  const { currentStoryboard, addShot, updateShot, deleteShot } = useStoryboardStore();
  const { getScenesForEpisode, addScene } = useProductionStore();

  const scenes = getScenesForEpisode(episodeId);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(
    scenes[0]?.id || null
  );
  const [newShotDescription, setNewShotDescription] = useState('');
  const [newShotAngle, setNewShotAngle] = useState<CameraAngle>('medium');

  const handleAddShot = () => {
    if (!newShotDescription.trim() || !currentStoryboard) return;
    addShot(currentStoryboard.id, newShotDescription.trim(), newShotAngle);
    setNewShotDescription('');
  };

  const cameraAngleLabels: Record<CameraAngle, string> = {
    wide: '广角',
    medium: '中景',
    close_up: '特写',
    over_shoulder: '过肩',
    pov: 'POV',
    bird_eye: '鸟瞰',
    low_angle: '低角',
  };

  if (!currentStoryboard) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-4">尚未创建分镜</p>
          <button
            onClick={() => {
              useStoryboardStore.getState().createStoryboard(episodeId);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            创建分镜
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">分镜 ({currentStoryboard.shots.length})</h3>
        <div className="flex gap-2">
          <select
            value={newShotAngle}
            onChange={(e) => setNewShotAngle(e.target.value as CameraAngle)}
            className="px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
          >
            {Object.entries(cameraAngleLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newShotDescription}
            onChange={(e) => setNewShotDescription(e.target.value)}
            placeholder="镜头描述..."
            className="px-3 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 w-48"
            onKeyDown={(e) => e.key === 'Enter' && handleAddShot()}
          />
          <button
            onClick={handleAddShot}
            className="px-3 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
          >
            + 添加镜头
          </button>
        </div>
      </div>

      {/* 分镜网格 */}
      <div className="grid grid-cols-4 gap-4">
        {currentStoryboard.shots.map((shot, idx) => (
          <div key={shot.id} className="bg-neutral-900 rounded-lg overflow-hidden">
            <div className="aspect-video bg-neutral-800 flex items-center justify-center">
              {shot.imageUrl ? (
                <img src={shot.imageUrl} alt={`shot ${idx + 1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-600 text-2xl">🎬</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500">镜头 {idx + 1}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                  {cameraAngleLabels[shot.cameraAngle]}
                </span>
              </div>
              <p className="text-sm text-neutral-300 line-clamp-2">{shot.description}</p>
              <p className="text-xs text-neutral-600 mt-1">{shot.duration}s</p>
              <button
                onClick={() => deleteShot(shot.id)}
                className="mt-2 text-xs text-red-400 hover:text-red-300"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 创建 TakesBrowser.tsx**

```typescript
import { useStoryboardStore } from '@/stores/storyboardStore';
import { useTakesStore } from '@/stores/takesStore';

export function TakesBrowser({ episodeId }: { episodeId: string }) {
  const { currentStoryboard } = useStoryboardStore();
  const { takes, getTakesForShot, selectTake, getSelectedTake, addTake } = useTakesStore();

  if (!currentStoryboard || currentStoryboard.shots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p>暂无镜头</p>
          <p className="text-xs mt-1">请先在分镜中添加镜头</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {currentStoryboard.shots.map((shot, idx) => {
        const shotTakes = getTakesForShot(shot.id);
        const selectedTake = getSelectedTake(shot.id);

        return (
          <div key={shot.id} className="bg-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-white font-medium">镜头 {idx + 1}</h4>
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{shot.description}</p>
              </div>
              <button
                onClick={() => addTake(shot.id, `生成镜头 ${idx + 1}: ${shot.description}`)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                AI 生成 Takes
              </button>
            </div>

            {/* Takes 列表 */}
            {shotTakes.length === 0 ? (
              <div className="text-center text-neutral-600 py-4 text-sm">
                暂无 Takes，点击"AI生成"开始
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {shotTakes.map((take) => {
                  const isSelected = selectedTake?.id === take.id;
                  return (
                    <div
                      key={take.id}
                      onClick={() => selectTake(shot.id, take.id)}
                      className={`rounded overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-900'
                          : 'hover:ring-1 hover:ring-neutral-600'
                      }`}
                    >
                      <div className="aspect-video bg-neutral-800 flex items-center justify-center">
                        {take.imageUrl ? (
                          <img src={take.imageUrl} alt={`take v${take.version}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-neutral-600 text-xl">
                            {take.status === 'completed' ? '✓' : take.status === 'generating' ? '⏳' : '○'}
                          </span>
                        )}
                      </div>
                      <div className="p-2 bg-neutral-800">
                        <p className="text-xs text-neutral-400">v{take.version}</p>
                        <p className="text-[10px] text-neutral-600 capitalize">{take.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Task 4: 改造 ProjectPanel 为 ProductionPanel

**Files:**
- Modify: `src/components/layout/ProjectPanel.tsx` — 改为导入 ProductionPanel

- [ ] **Step 1: 改造 ProjectPanel.tsx**

```typescript
import { ProductionPanel } from '@/components/production/ProductionPanel';

export function ProjectPanel() {
  return <ProductionPanel />;
}
```

---

## Self-Review 检查清单

1. **Spec 覆盖检查** — 逐项核对 PRD Phase 3：
   - [x] 集视图看板（剧本→分镜→Takes→粗剪→成片）
   - [x] 场景视图（可按集筛选，场景卡片）
   - [x] 集详情面板（含分镜/Takes快捷入口）
   - [x] 分镜可视化面板（镜头列表+添加）
   - [x] Takes浏览器（多版本对比+选中）
   - [x] 推进状态按钮
   - [x] 双视图切换

2. **Placeholder 扫描** — TimelinePlaceholder 和 AudioPlaceholder 用占位符明确标注"Phase 4 实现"

3. **类型一致性** — 所有类型在 `src/types/index.ts` 定义

4. **现有代码** — 复用已有的 storyboardStore、takesStore、timelineStore、editorStore

5. **缺失类型补充** — TimelineTrack、TimelineClip、Transition、ClipEffect、TakeFilter、ProductionEpisode、ProductionScene 等

---

## 执行选择

**Plan 完成，保存于:** `docs/superpowers/plans/2026-04-12-vibe-studio-phase-3-production.md`

两个执行选项：

**1. Subagent-Driven (推荐)** — 每个任务派一个新 subagent 执行，任务间有检查点

**2. Inline Execution** — 在当前 session 内批量执行，有检查点

选择哪个方式？
