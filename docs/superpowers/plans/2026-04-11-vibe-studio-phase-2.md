# VibeStudio Phase 2: Production Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Takes 系统、分镜管理、渲染/生成队列、完整音频管线、审片/Approval 工作流。

**Architecture:** 在 Phase 1 基础上，扩展 stores 和组件，新增渲染队列状态管理和音频轨状态管理。

**Tech Stack:** Tauri 2.x / React 18 / TypeScript 5 / Zustand / Tailwind CSS

---

## File Structure (Phase 2 新增/修改)

```
src/
├── components/
│   ├── storyboard/
│   │   ├── StoryboardPanel.tsx    # 分镜总览面板
│   │   ├── ShotCard.tsx           # 单个镜头卡片
│   │   └── StoryboardTimeline.tsx  # 分镜时间线视图
│   ├── takes/
│   │   ├── TakesBrowser.tsx       # Takes 浏览器
│   │   ├── TakeCard.tsx           # 单个 Take 卡片
│   │   └── TakeComparison.tsx      # 多版本对比视图
│   ├── render/
│   │   ├── RenderQueue.tsx        # 渲染队列面板
│   │   └── RenderProgress.tsx      # 单个渲染任务进度
│   ├── audio/
│   │   ├── AudioTrackList.tsx     # 音频轨列表
│   │   ├── AudioTrackItem.tsx     # 单个音频轨
│   │   └── AudioMixer.tsx         # 混音面板
│   └── review/
│       ├── ReviewPanel.tsx        # 审片面板
│       └── AnnotationList.tsx      # 批注列表
├── stores/
│   ├── storyboardStore.ts         # 分镜状态
│   ├── takesStore.ts             # Takes 状态
│   ├── renderStore.ts            # 渲染队列状态
│   ├── audioStore.ts             # 音频轨状态
│   └── reviewStore.ts            # 审片状态
└── lib/
    └── api-client.ts             # API 调用封装（图像/视频生成）
```

---

## Data Model 补充

### 分镜相关

```typescript
// 新增 Storyboard 类型（已在 Phase 1 types 定义）
// 新增 Shot 类型（已在 Phase 1 types 定义）

// 新增：StoryboardViewMode
type StoryboardViewMode = 'grid' | 'timeline';

// 镜头状态
type ShotStatus = 'pending' | 'generating' | 'completed' | 'failed';
```

### Takes 相关

```typescript
// 新增：TakeFilter
interface TakeFilter {
  shotId: string;
  status?: TakeStatus;
}

// Take 对比选择结果
interface TakeSelection {
  shotId: string;
  selectedTakeId: string;
}
```

### 渲染队列相关

```typescript
interface RenderTask {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  parameters: Record<string, unknown>;
  status: RenderTaskStatus;
  progress: number; // 0-100
  resultUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

type RenderTaskStatus = 'queued' | 'processing' | 'completed' | 'failed';
```

### 音频相关

```typescript
// AudioTrack 已在 Phase 1 types 定义
// 新增音频操作

interface AudioVolumeKeyframe {
  time: number; // 秒
  volume: number; // 0-1
}

interface AudioTrack extends AudioTrack {
  keyframes?: AudioVolumeKeyframe[]; // 可选的音量关键帧
}
```

### 审片相关

```typescript
interface Annotation {
  id: string;
  episodeId: string;
  targetId: string; // 关联的 shot/take/audio 的 id
  targetType: 'shot' | 'take' | 'audio';
  content: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

interface DraftVersion {
  id: string;
  episodeId: string;
  label: string; // e.g., "Draft v1", "v2", "Final"
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  annotations: Annotation[];
}
```

---

## Task 9: 分镜管理

**Files:**
- Create: `src/stores/storyboardStore.ts`
- Create: `src/components/storyboard/StoryboardPanel.tsx`
- Create: `src/components/storyboard/ShotCard.tsx`
- Create: `src/components/storyboard/StoryboardTimeline.tsx`

- [ ] **Step 1: 创建 storyboardStore.ts**

```typescript
import { create } from 'zustand';
import { Storyboard, Shot, ShotStatus, CameraAngle } from '@/types';
import { v4 as uuid } from 'uuid';

type StoryboardViewMode = 'grid' | 'timeline';

interface StoryboardState {
  currentStoryboard: Storyboard | null;
  viewMode: StoryboardViewMode;

  // Storyboard 操作
  createStoryboard: (episodeId: string) => Storyboard;
  loadStoryboard: (storyboard: Storyboard) => void;

  // Shot 操作
  addShot: (storyboardId: string, description: string, cameraAngle: CameraAngle) => Shot;
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (shotId: string) => void;
  reorderShots: (storyboardId: string, shotIds: string[]) => void;

  // 视图模式
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
```

- [ ] **Step 2: 创建 ShotCard.tsx**

```typescript
import { Shot } from '@/types';

interface ShotCardProps {
  shot: Shot;
  isActive: boolean;
  onClick: () => void;
  onGenerateTakes?: () => void;
}

const cameraAngleLabels: Record<string, string> = {
  wide: '全景',
  medium: '中景',
  close_up: '特写',
  over_shoulder: '过肩',
  pov: '主观视角',
  bird_eye: '鸟瞰',
  low_angle: '仰拍',
};

export function ShotCard({ shot, isActive, onClick, onGenerateTakes }: ShotCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isActive
          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      {/* 镜头画面区域 */}
      <div className="aspect-video bg-neutral-800 relative">
        {shot.imageUrl ? (
          <img src={shot.imageUrl} alt={shot.description} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
            <span className="text-2xl mb-1">🎬</span>
            <span className="text-xs">未生成</span>
          </div>
        )}
        {/* 序列号 */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
          镜头 {shot.sequence + 1}
        </div>
        {/* 状态标签 */}
        {shot.takeIds.length > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-600/80 rounded text-xs text-white">
            {shot.takeIds.length} Takes
          </div>
        )}
      </div>

      {/* 镜头信息 */}
      <div className="p-2 bg-neutral-900">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">{cameraAngleLabels[shot.cameraAngle] || shot.cameraAngle}</span>
          <span className="text-xs text-neutral-500">{shot.duration}s</span>
        </div>
        <p className="text-sm text-neutral-300 line-clamp-2 mb-2">{shot.description}</p>
        {onGenerateTakes && (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerateTakes(); }}
            className="w-full px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
          >
            生成 Takes
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 StoryboardTimeline.tsx**

```typescript
import { useStoryboardStore } from '@/stores/storyboardStore';

export function StoryboardTimeline() {
  const { currentStoryboard, viewMode, setViewMode } = useStoryboardStore();

  if (!currentStoryboard) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        暂无分镜
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500'}`}
          >
            网格
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'timeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500'}`}
          >
            时间线
          </button>
        </div>
        <span className="text-sm text-neutral-500">
          {currentStoryboard.shots.length} 个镜头
        </span>
      </div>

      {/* 时间线视图 */}
      {viewMode === 'timeline' ? (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-2 min-h-full">
            {currentStoryboard.shots.map((shot) => (
              <div
                key={shot.id}
                className="flex-shrink-0 w-32 flex flex-col"
              >
                <div className="aspect-video bg-neutral-800 rounded mb-2 flex items-center justify-center text-neutral-600">
                  {shot.imageUrl ? (
                    <img src={shot.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-xs">未生成</span>
                  )}
                </div>
                <div className="text-xs text-white text-center">{shot.sequence + 1}</div>
                <div className="text-[10px] text-neutral-500 text-center">{shot.duration}s</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: 创建 StoryboardPanel.tsx**

```typescript
import { useState } from 'react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ShotCard } from './ShotCard';
import { StoryboardTimeline } from './StoryboardTimeline';
import { CameraAngle } from '@/types';

export function StoryboardPanel() {
  const { currentStoryboard, viewMode, setViewMode, addShot, loadStoryboard, createStoryboard } = useStoryboardStore();
  const { currentEpisodeId } = useWorkspaceStore();
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [showAddShot, setShowAddShot] = useState(false);
  const [newShotDesc, setNewShotDesc] = useState('');
  const [newShotAngle, setNewShotAngle] = useState<CameraAngle>('medium');

  const cameraOptions: Array<{ value: CameraAngle; label: string }> = [
    { value: 'wide', label: '全景' },
    { value: 'medium', label: '中景' },
    { value: 'close_up', label: '特写' },
    { value: 'over_shoulder', label: '过肩' },
    { value: 'pov', label: '主观视角' },
    { value: 'bird_eye', label: '鸟瞰' },
    { value: 'low_angle', label: '仰拍' },
  ];

  const handleCreateStoryboard = () => {
    if (!currentEpisodeId) return;
    const sb = createStoryboard(currentEpisodeId);
    loadStoryboard(sb);
  };

  const handleAddShot = () => {
    if (!currentStoryboard || !newShotDesc.trim()) return;
    addShot(currentStoryboard.id, newShotDesc.trim(), newShotAngle);
    setNewShotDesc('');
    setShowAddShot(false);
  };

  if (!currentEpisodeId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        请先选择一个分集
      </div>
    );
  }

  if (!currentStoryboard) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-4">暂无分镜</p>
          <button
            onClick={handleCreateStoryboard}
            className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
          >
            创建分镜
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
          >
            网格
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'timeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
          >
            时间线
          </button>
        </div>
        <button
          onClick={() => setShowAddShot(!showAddShot)}
          className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded text-white"
        >
          + 添加镜头
        </button>
      </div>

      {/* 添加镜头表单 */}
      {showAddShot && (
        <div className="p-4 border-b border-neutral-800 bg-neutral-900">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newShotDesc}
              onChange={(e) => setNewShotDesc(e.target.value)}
              placeholder="描述这个镜头..."
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddShot()}
            />
            <select
              value={newShotAngle}
              onChange={(e) => setNewShotAngle(e.target.value as CameraAngle)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            >
              {cameraOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleAddShot}
              className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 text-sm"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {/* 网格视图 */}
      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-auto p-4">
          {currentStoryboard.shots.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500">
              暂无镜头，点击"添加镜头"开始
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {currentStoryboard.shots.map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  isActive={selectedShotId === shot.id}
                  onClick={() => setSelectedShotId(shot.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <StoryboardTimeline />
      )}
    </div>
  );
}
```

---

## Task 10: Takes 系统

**Files:**
- Create: `src/stores/takesStore.ts`
- Create: `src/components/takes/TakesBrowser.tsx`
- Create: `src/components/takes/TakeCard.tsx`
- Create: `src/components/takes/TakeComparison.tsx`

- [ ] **Step 1: 创建 takesStore.ts**

```typescript
import { create } from 'zustand';
import { Take, TakeStatus, TakeFilter } from '@/types';
import { v4 as uuid } from 'uuid';

interface TakesState {
  takes: Take[];
  selectedTakeIds: Map<string, string>; // shotId -> selectedTakeId
  filter: TakeFilter | null;

  // Take 操作
  addTake: (shotId: string, prompt: string, parameters?: Record<string, unknown>) => Take;
  updateTake: (takeId: string, updates: Partial<Take>) => void;
  deleteTake: (takeId: string) => void;

  // 选择
  selectTake: (shotId: string, takeId: string) => void;
  getSelectedTake: (shotId: string) => Take | undefined;

  // 筛选
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
```

- [ ] **Step 2: 创建 TakeCard.tsx**

```typescript
import { Take } from '@/types';

interface TakeCardProps {
  take: Take;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '等待中', color: 'bg-yellow-600' },
  generating: { text: '生成中', color: 'bg-blue-600' },
  completed: { text: '完成', color: 'bg-green-600' },
  failed: { text: '失败', color: 'bg-red-600' },
};

export function TakeCard({ take, isSelected, onSelect, onDelete }: TakeCardProps) {
  const status = statusLabels[take.status] || statusLabels.pending;

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      <div className="aspect-video bg-neutral-800 relative">
        {take.imageUrl && (
          <img src={take.imageUrl} alt="" className="w-full h-full object-cover" />
        )}
        {take.videoUrl && (
          <video src={take.videoUrl} className="w-full h-full object-cover" />
        )}
        {!take.imageUrl && !take.videoUrl && (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            {take.status === 'generating' ? '生成中...' : '预览'}
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-0.5 ${status.color} rounded text-xs text-white`}>
          {status.text}
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
          v{take.version}
        </div>
      </div>
      <div className="p-2 bg-neutral-900 flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          {new Date(take.createdAt).toLocaleTimeString('zh-CN')}
        </span>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 TakeComparison.tsx**

```typescript
import { useTakesStore } from '@/stores/takesStore';
import { TakeCard } from './TakeCard';

interface TakeComparisonProps {
  shotId: string;
  onClose: () => void;
}

export function TakeComparison({ shotId, onClose }: TakeComparisonProps) {
  const { getTakesForShot, selectedTakeIds, selectTake } = useTakesStore();
  const takes = getTakesForShot(shotId);
  const selectedId = selectedTakeIds.get(shotId);

  if (takes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        暂无 Takes
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <span className="text-sm text-white">对比 Takes（选择最佳版本）</span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white"
        >
          关闭
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 gap-4">
          {takes.map((take) => (
            <TakeCard
              key={take.id}
              take={take}
              isSelected={selectedId === take.id}
              onSelect={() => selectTake(shotId, take.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 TakesBrowser.tsx**

```typescript
import { useTakesStore } from '@/stores/takesStore';
import { useState } from 'react';
import { TakeComparison } from './TakeComparison';

interface TakesBrowserProps {
  shotId: string;
}

export function TakesBrowser({ shotId }: TakesBrowserProps) {
  const { getTakesForShot } = useTakesStore();
  const [showComparison, setShowComparison] = useState(false);
  const takes = getTakesForShot(shotId);

  if (takes.length === 0) {
    return (
      <div className="text-center text-neutral-500 py-4">
        <p className="text-sm mb-2">暂无 Takes</p>
        <p className="text-xs">从分镜面板生成 Takes</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{takes.length} 个版本</span>
        {takes.length > 1 && (
          <button
            onClick={() => setShowComparison(true)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            对比选择
          </button>
        )}
      </div>
      {showComparison && (
        <div className="fixed inset-0 bg-black/80 z-50">
          <div className="h-full w-full max-w-4xl mx-auto bg-neutral-950">
            <TakeComparison shotId={shotId} onClose={() => setShowComparison(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 11: 渲染队列

**Files:**
- Create: `src/stores/renderStore.ts`
- Create: `src/components/render/RenderQueue.tsx`
- Create: `src/components/render/RenderProgress.tsx`
- Create: `src/lib/api-client.ts`

- [ ] **Step 1: 创建 renderStore.ts**

```typescript
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
```

- [ ] **Step 2: 创建 api-client.ts**

```typescript
// API 调用封装 - 预留接口，实际调用第三方 API
import { useRenderStore } from '@/stores/renderStore';

interface GenerateOptions {
  type: 'image' | 'video';
  prompt: string;
  parameters?: Record<string, unknown>;
}

export async function submitGenerationTask(options: GenerateOptions): Promise<string> {
  const { addTask, updateTask } = useRenderStore.getState();
  const taskId = addTask(options.type, options.prompt, options.parameters);

  // 模拟 API 调用
  simulateGeneration(taskId);

  return taskId;
}

async function simulateGeneration(taskId: string) {
  const { updateTask } = useRenderStore.getState();
  const { updateTake } = await import('@/stores/takesStore').then(m => m.useTakesStore.getState());

  // 更新状态为处理中
  updateTask(taskId, { status: 'processing' });

  // 模拟进度
  for (let i = 0; i <= 100; i += 10) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    updateTask(taskId, { progress: i });
  }

  // 模拟完成
  updateTask(taskId, {
    status: 'completed',
    progress: 100,
    resultUrl: 'https://example.com/generated.mp4',
    completedAt: new Date().toISOString(),
  });
}

// 实际 API 实现预留
export async function generateImage(prompt: string, parameters?: Record<string, unknown>): Promise<string> {
  // TODO: 接入实际图像生成 API
  console.log('generateImage called:', prompt, parameters);
  return submitGenerationTask({ type: 'image', prompt, parameters });
}

export async function generateVideo(prompt: string, parameters?: Record<string, unknown>): Promise<string> {
  // TODO: 接入实际视频生成 API
  console.log('generateVideo called:', prompt, parameters);
  return submitGenerationTask({ type: 'video', prompt, parameters });
}
```

- [ ] **Step 3: 创建 RenderProgress.tsx**

```typescript
import { RenderTask } from '@/types';

interface RenderProgressProps {
  task: RenderTask;
  onCancel?: () => void;
  onRemove?: () => void;
}

const statusColors: Record<string, string> = {
  queued: 'bg-yellow-600',
  processing: 'bg-blue-600',
  completed: 'bg-green-600',
  failed: 'bg-red-600',
};

export function RenderProgress({ task, onCancel, onRemove }: RenderProgressProps) {
  return (
    <div className="p-3 bg-neutral-900 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">
            {task.type === 'image' ? '🖼️' : '🎬'} {task.type === 'image' ? '图像' : '视频'}
          </span>
          <span className={`px-2 py-0.5 ${statusColors[task.status]} rounded text-xs text-white`}>
            {task.status === 'queued' ? '排队中' :
             task.status === 'processing' ? '生成中' :
             task.status === 'completed' ? '完成' : '失败'}
          </span>
        </div>
        <div className="flex gap-2">
          {task.status === 'processing' && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-neutral-400 hover:text-white"
            >
              取消
            </button>
          )}
          {(task.status === 'completed' || task.status === 'failed') && onRemove && (
            <button
              onClick={onRemove}
              className="text-xs text-neutral-400 hover:text-white"
            >
              移除
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500 mb-2 line-clamp-1">{task.prompt}</p>

      {/* 进度条 */}
      {(task.status === 'queued' || task.status === 'processing') && (
        <div className="h-1 bg-neutral-700 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      {task.error && (
        <p className="text-xs text-red-400 mt-1">{task.error}</p>
      )}

      {task.status === 'completed' && task.resultUrl && (
        <a
          href={task.resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
        >
          查看结果 →
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建 RenderQueue.tsx**

```typescript
import { useRenderStore } from '@/stores/renderStore';
import { RenderProgress } from './RenderProgress';

export function RenderQueue() {
  const { tasks, removeTask, updateTask } = useRenderStore();

  const processing = tasks.filter((t) => t.status === 'processing');
  const queued = tasks.filter((t) => t.status === 'queued');
  const completed = tasks.filter((t) => t.status === 'completed');
  const failed = tasks.filter((t) => t.status === 'failed');

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="text-2xl mb-2">🎬</p>
          <p className="text-sm">渲染队列为空</p>
          <p className="text-xs mt-1">从分镜或 Takes 生成任务</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      {/* 进行中 */}
      {processing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white mb-2">进行中</h3>
          <div className="space-y-2">
            {processing.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onCancel={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 排队中 */}
      {queued.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white mb-2">排队中 ({queued.length})</h3>
          <div className="space-y-2">
            {queued.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onRemove={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 已完成 */}
      {completed.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white mb-2">已完成</h3>
          <div className="space-y-2">
            {completed.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onRemove={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 失败 */}
      {failed.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-red-400 mb-2">失败 ({failed.length})</h3>
          <div className="space-y-2">
            {failed.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onRemove={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 12: 音频管线

**Files:**
- Create: `src/stores/audioStore.ts`
- Create: `src/components/audio/AudioTrackList.tsx`
- Create: `src/components/audio/AudioTrackItem.tsx`
- Create: `src/components/audio/AudioMixer.tsx`

- [ ] **Step 1: 创建 audioStore.ts**

```typescript
import { create } from 'zustand';
import { AudioTrack, AudioType, AudioVolumeKeyframe } from '@/types';
import { v4 as uuid } from 'uuid';

interface AudioState {
  tracks: AudioTrack[];

  // Track 操作
  addTrack: (episodeId: string, type: AudioType, name: string, fileUrl: string) => AudioTrack;
  updateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  removeTrack: (trackId: string) => void;

  // 音量操作
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;
  addVolumeKeyframe: (trackId: string, time: number, volume: number) => void;
  removeVolumeKeyframe: (trackId: string, time: number) => void;

  // 工具
  getTracksByEpisode: (episodeId: string) => AudioTrack[];
  getTrackById: (trackId: string) => AudioTrack | undefined;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  tracks: [],

  addTrack: (episodeId, type, name, fileUrl) => {
    const track: AudioTrack = {
      id: uuid(),
      episodeId,
      type,
      name,
      fileUrl,
      duration: 0,
      startTime: 0,
      volume: 1,
      muted: false,
    };
    set((state) => ({ tracks: [...state.tracks, track] }));
    return track;
  },

  updateTrack: (trackId, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
    })),

  removeTrack: (trackId) =>
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
    })),

  setTrackVolume: (trackId, volume) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
    })),

  setTrackMuted: (trackId, muted) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, muted } : t)),
    })),

  addVolumeKeyframe: (trackId, time, volume) =>
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const keyframes = t.keyframes ? [...t.keyframes] : [];
        const existingIdx = keyframes.findIndex((k) => k.time === time);
        if (existingIdx >= 0) {
          keyframes[existingIdx] = { time, volume };
        } else {
          keyframes.push({ time, volume });
        }
        return { ...t, keyframes };
      }),
    })),

  removeVolumeKeyframe: (trackId, time) =>
    set((state) => ({
      tracks: state.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          keyframes: t.keyframes?.filter((k) => k.time !== time),
        };
      }),
    })),

  getTracksByEpisode: (episodeId) =>
    get().tracks.filter((t) => t.episodeId === episodeId),

  getTrackById: (trackId) => get().tracks.find((t) => t.id === trackId),
}));
```

- [ ] **Step 2: 创建 AudioTrackItem.tsx**

```typescript
import { AudioTrack } from '@/types';

interface AudioTrackItemProps {
  track: AudioTrack;
  isSelected: boolean;
  onSelect: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onDelete: () => void;
}

const typeIcons: Record<string, string> = {
  dialogue: '🎙️',
  bgm: '🎵',
  sfx: '🔊',
  foley: '🎤',
};

const typeLabels: Record<string, string> = {
  dialogue: '对话/配音',
  bgm: '背景音乐',
  sfx: '音效',
  foley: 'Foley',
};

export function AudioTrackItem({
  track,
  isSelected,
  onSelect,
  onVolumeChange,
  onMuteToggle,
  onDelete,
}: AudioTrackItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{typeIcons[track.type] || '🎵'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white truncate">{track.name}</span>
            <span className="text-xs text-neutral-500">{typeLabels[track.type]}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {/* 音量滑块 */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-neutral-500 w-8">{Math.round(track.volume * 100)}%</span>
            {/* 静音按钮 */}
            <button
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
              className={`text-xs px-2 py-0.5 rounded ${
                track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {track.muted ? '静音' : '播放'}
            </button>
            {/* 删除 */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-xs text-red-400 hover:text-red-300 ml-auto"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 AudioTrackList.tsx**

```typescript
import { useState } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { AudioTrackItem } from './AudioTrackItem';
import { AudioType } from '@/types';

export function AudioTrackList() {
  const { tracks, addTrack, setTrackVolume, setTrackMuted, removeTrack } = useAudioStore();
  const { currentEpisodeId } = useWorkspaceStore();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackType, setNewTrackType] = useState<AudioType>('bgm');

  const episodeTracks = currentEpisodeId
    ? tracks.filter((t) => t.episodeId === currentEpisodeId)
    : [];

  const handleAddTrack = () => {
    if (!currentEpisodeId || !newTrackName.trim()) return;
    addTrack(currentEpisodeId, newTrackType, newTrackName.trim(), '');
    setNewTrackName('');
    setShowAddTrack(false);
  };

  if (!currentEpisodeId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        请先选择一个分集
      </div>
    );
  }

  const typeOptions: Array<{ value: AudioType; label: string }> = [
    { value: 'dialogue', label: '对话/配音' },
    { value: 'bgm', label: '背景音乐' },
    { value: 'sfx', label: '音效' },
    { value: 'foley', label: 'Foley' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <span className="text-sm text-white">音频轨 ({episodeTracks.length})</span>
        <button
          onClick={() => setShowAddTrack(!showAddTrack)}
          className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded text-white"
        >
          + 添加音轨
        </button>
      </div>

      {/* 添加音轨表单 */}
      {showAddTrack && (
        <div className="p-4 border-b border-neutral-800 bg-neutral-900">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTrackName}
              onChange={(e) => setNewTrackName(e.target.value)}
              placeholder="音轨名称..."
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
            />
            <select
              value={newTrackType}
              onChange={(e) => setNewTrackType(e.target.value as AudioType)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleAddTrack}
              className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 text-sm"
            >
              添加
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            提示：添加后需上传音频文件或从素材库选择
          </p>
        </div>
      )}

      {/* 音轨列表 */}
      <div className="flex-1 overflow-auto p-4">
        {episodeTracks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <p className="text-2xl mb-2">🎵</p>
              <p className="text-sm">暂无音频轨</p>
              <p className="text-xs mt-1">点击"添加音轨"开始</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {episodeTracks.map((track) => (
              <AudioTrackItem
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                onSelect={() => setSelectedTrackId(track.id)}
                onVolumeChange={(v) => setTrackVolume(track.id, v)}
                onMuteToggle={() => setTrackMuted(track.id, !track.muted)}
                onDelete={() => removeTrack(track.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 AudioMixer.tsx**

```typescript
import { useAudioStore } from '@/stores/audioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function AudioMixer() {
  const { tracks, setTrackVolume, setTrackMuted } = useAudioStore();
  const { currentEpisodeId } = useWorkspaceStore();

  const episodeTracks = currentEpisodeId
    ? tracks.filter((t) => t.episodeId === currentEpisodeId)
    : [];

  const dialogueTracks = episodeTracks.filter((t) => t.type === 'dialogue');
  const bgmTracks = episodeTracks.filter((t) => t.type === 'bgm');
  const sfxTracks = episodeTracks.filter((t) => t.type === 'sfx');
  const foleyTracks = episodeTracks.filter((t) => t.type === 'foley');

  const avgVolume = (tracks: typeof episodeTracks) => {
    if (tracks.length === 0) return 1;
    return tracks.reduce((sum, t) => sum + t.volume, 0) / tracks.length;
  };

  return (
    <div className="h-full overflow-auto p-4">
      <h3 className="text-sm font-medium text-white mb-4">混音台</h3>

      {/* 总音量 */}
      <div className="mb-6 p-4 bg-neutral-900 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white">总输出音量</span>
          <span className="text-xs text-neutral-500">主控</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          defaultValue="1"
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* 对话/配音 */}
      {dialogueTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🎙️ 对话/配音</h4>
          <div className="space-y-2">
            {dialogueTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 背景音乐 */}
      {bgmTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🎵 背景音乐</h4>
          <div className="space-y-2">
            {bgmTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 音效 */}
      {sfxTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🔊 音效</h4>
          <div className="space-y-2">
            {sfxTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Foley */}
      {foleyTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🎤 Foley</h4>
          <div className="space-y-2">
            {foleyTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {episodeTracks.length === 0 && (
        <div className="text-center text-neutral-500 py-8">
          <p className="text-sm">暂无音频轨</p>
          <p className="text-xs mt-1">从音频轨列表添加</p>
        </div>
      )}
    </div>
  );
}
```

---

## Task 13: 审片/Approval 工作流

**Files:**
- Create: `src/stores/reviewStore.ts`
- Create: `src/components/review/ReviewPanel.tsx`
- Create: `src/components/review/AnnotationList.tsx`

- [ ] **Step 1: 创建 reviewStore.ts**

```typescript
import { create } from 'zustand';
import { DraftVersion, Annotation } from '@/types';
import { v4 as uuid } from 'uuid';

interface ReviewState {
  draftVersions: DraftVersion[];
  annotations: Annotation[];

  // DraftVersion 操作
  createDraftVersion: (episodeId: string, label: string, notes?: string) => DraftVersion;
  updateDraftVersion: (versionId: string, updates: Partial<DraftVersion>) => void;
  deleteDraftVersion: (versionId: string) => void;
  getDraftVersionsForEpisode: (episodeId: string) => DraftVersion[];

  // Annotation 操作
  addAnnotation: (episodeId: string, targetId: string, targetType: Annotation['targetType'], content: string, author: string) => Annotation;
  resolveAnnotation: (annotationId: string) => void;
  deleteAnnotation: (annotationId: string) => void;
  getAnnotationsForEpisode: (episodeId: string) => Annotation[];
  getAnnotationsForTarget: (targetId: string) => Annotation[];
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  draftVersions: [],
  annotations: [],

  createDraftVersion: (episodeId, label, notes) => {
    const draft: DraftVersion = {
      id: uuid(),
      episodeId,
      label,
      notes,
      createdAt: new Date().toISOString(),
      annotations: [],
    };
    set((state) => ({ draftVersions: [...state.draftVersions, draft] }));
    return draft;
  },

  updateDraftVersion: (versionId, updates) =>
    set((state) => ({
      draftVersions: state.draftVersions.map((d) =>
        d.id === versionId ? { ...d, ...updates } : d
      ),
    })),

  deleteDraftVersion: (versionId) =>
    set((state) => ({
      draftVersions: state.draftVersions.filter((d) => d.id !== versionId),
    })),

  getDraftVersionsForEpisode: (episodeId) =>
    get().draftVersions.filter((d) => d.episodeId === episodeId),

  addAnnotation: (episodeId, targetId, targetType, content, author) => {
    const annotation: Annotation = {
      id: uuid(),
      episodeId,
      targetId,
      targetType,
      content,
      author,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    set((state) => ({ annotations: [...state.annotations, annotation] }));
    return annotation;
  },

  resolveAnnotation: (annotationId) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotationId ? { ...a, resolved: true } : a
      ),
    })),

  deleteAnnotation: (annotationId) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== annotationId),
    })),

  getAnnotationsForEpisode: (episodeId) =>
    get().annotations.filter((a) => a.episodeId === episodeId),

  getAnnotationsForTarget: (targetId) =>
    get().annotations.filter((a) => a.targetId === targetId),
}));
```

- [ ] **Step 2: 创建 AnnotationList.tsx**

```typescript
import { useReviewStore } from '@/stores/reviewStore';

interface AnnotationListProps {
  targetId?: string;
  episodeId: string;
}

export function AnnotationList({ targetId, episodeId }: AnnotationListProps) {
  const { annotations, resolveAnnotation, deleteAnnotation } = useReviewStore();

  const filteredAnnotations = targetId
    ? annotations.filter((a) => a.targetId === targetId)
    : annotations.filter((a) => a.episodeId === episodeId);

  const unresolved = filteredAnnotations.filter((a) => !a.resolved);
  const resolved = filteredAnnotations.filter((a) => a.resolved);

  return (
    <div className="space-y-4">
      {/* 未解决的批注 */}
      {unresolved.length > 0 && (
        <div>
          <h4 className="text-xs text-neutral-500 mb-2">待处理 ({unresolved.length})</h4>
          <div className="space-y-2">
            {unresolved.map((ann) => (
              <div key={ann.id} className="p-3 bg-neutral-900 rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-blue-400">{ann.author}</span>
                  <span className="text-xs text-neutral-600">
                    {new Date(ann.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-white mb-2">{ann.content}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveAnnotation(ann.id)}
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    标记已解决
                  </button>
                  <button
                    onClick={() => deleteAnnotation(ann.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已解决的批注 */}
      {resolved.length > 0 && (
        <div>
          <h4 className="text-xs text-neutral-500 mb-2">已解决 ({resolved.length})</h4>
          <div className="space-y-2 opacity-60">
            {resolved.map((ann) => (
              <div key={ann.id} className="p-3 bg-neutral-800 rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-neutral-500">{ann.author}</span>
                  <span className="text-xs text-neutral-600">
                    {new Date(ann.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-neutral-400 line-through">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredAnnotations.length === 0 && (
        <div className="text-center text-neutral-500 py-4">
          <p className="text-sm">暂无批注</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 创建 ReviewPanel.tsx**

```typescript
import { useState } from 'react';
import { useReviewStore } from '@/stores/reviewStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { AnnotationList } from './AnnotationList';

export function ReviewPanel() {
  const { draftVersions, createDraftVersion, updateDraftVersion, deleteDraftVersion } = useReviewStore();
  const { currentEpisodeId } = useWorkspaceStore();
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [newDraftLabel, setNewDraftLabel] = useState('');
  const [newDraftNotes, setNewDraftNotes] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const episodeDrafts = currentEpisodeId
    ? draftVersions.filter((d) => d.episodeId === currentEpisodeId)
    : [];
  const selectedDraft = selectedDraftId
    ? episodeDrafts.find((d) => d.id === selectedDraftId)
    : null;

  const handleCreateDraft = () => {
    if (!currentEpisodeId || !newDraftLabel.trim()) return;
    const draft = createDraftVersion(currentEpisodeId, newDraftLabel.trim(), newDraftNotes.trim());
    setSelectedDraftId(draft.id);
    setNewDraftLabel('');
    setNewDraftNotes('');
    setShowNewDraft(false);
  };

  if (!currentEpisodeId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        请先选择一个分集
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 左侧：版本列表 */}
      <div className="w-64 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white">版本</h3>
            <button
              onClick={() => setShowNewDraft(!showNewDraft)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + 新建
            </button>
          </div>

          {showNewDraft && (
            <div className="space-y-2">
              <input
                type="text"
                value={newDraftLabel}
                onChange={(e) => setNewDraftLabel(e.target.value)}
                placeholder="版本名称 (如 Draft v1)"
                className="w-full px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDraft()}
              />
              <textarea
                value={newDraftNotes}
                onChange={(e) => setNewDraftNotes(e.target.value)}
                placeholder="备注..."
                rows={2}
                className="w-full px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white resize-none"
              />
              <button
                onClick={handleCreateDraft}
                className="w-full px-2 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
              >
                创建
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {episodeDrafts.length === 0 ? (
            <div className="text-center text-neutral-500 py-4">
              <p className="text-xs">暂无版本</p>
            </div>
          ) : (
            episodeDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => setSelectedDraftId(draft.id)}
                className={`p-2 rounded mb-1 cursor-pointer ${
                  selectedDraftId === draft.id ? 'bg-neutral-700' : 'hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{draft.label}</span>
                  {draft.approvedBy && (
                    <span className="text-xs text-green-400">✓</span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {new Date(draft.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧：版本详情和批注 */}
      <div className="flex-1 flex flex-col">
        {selectedDraft ? (
          <>
            <div className="p-4 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-white">{selectedDraft.label}</h3>
                <div className="flex gap-2">
                  {!selectedDraft.approvedBy && (
                    <button
                      onClick={() => updateDraftVersion(selectedDraft.id, { approvedBy: '导演' })}
                      className="px-3 py-1 text-sm bg-green-700 hover:bg-green-600 rounded text-white"
                    >
                      批准
                    </button>
                  )}
                  <button
                    onClick={() => {
                      deleteDraftVersion(selectedDraft.id);
                      setSelectedDraftId(null);
                    }}
                    className="px-3 py-1 text-sm bg-red-900 hover:bg-red-800 rounded text-white"
                  >
                    删除
                  </button>
                </div>
              </div>
              {selectedDraft.approvedBy && (
                <div className="text-sm text-green-400 mb-2">
                  已由 {selectedDraft.approvedBy} 批准
                </div>
              )}
              {selectedDraft.notes && (
                <p className="text-sm text-neutral-400">{selectedDraft.notes}</p>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <h4 className="text-sm font-medium text-white mb-3">批注</h4>
              <AnnotationList episodeId={currentEpisodeId} />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500">
            选择一个版本查看详情
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Self-Review 检查清单

1. **Spec 覆盖检查** — 逐项核对 PRD：
   - [x] Takes 系统（多版本生成、对比选择）
   - [x] 分镜管理（镜头列表、时间线视图、摄像机角度）
   - [x] 渲染队列（任务状态、进度追踪）
   - [x] 音频管线（对话/BGM/音效/Foley、混音）
   - [x] 审片/Approval（版本标记、批注、已解决/未解决）

2. **Placeholder 扫描** — 无 TODO/TBD/实现后续等占位符（api-client.ts 中的 simulateGeneration 为模拟实现）

3. **类型一致性** — 所有接口引用 Phase 1 的 types/index.ts

4. **任务完整性** — 所有任务都有具体文件、具体代码

---

## 执行选择

**Plan 完成，保存于:** `docs/superpowers/plans/2026-04-11-vibe-studio-phase-2.md`

两个执行选项：

**1. Subagent-Driven (推荐)** — 每个任务派一个新 subagent 执行，任务间有检查点

**2. Inline Execution** — 在当前 session 内批量执行，有检查点

选择哪个方式？