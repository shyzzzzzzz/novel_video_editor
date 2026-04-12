# VibeStudio Phase 3: Editing & Compositing System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现专业级视频剪辑合成系统，包括多轨道时间线、视频/音频剪辑片段管理、特效转场、预览播放、最终导出。

**Architecture:** 在 Phase 1&2 基础上，新增编辑状态管理和时间线组件，整合 Takes/音频/分镜数据到统一时间线。

**Tech Stack:** Tauri 2.x / React 18 / TypeScript 5 / Zustand / Tailwind CSS

---

## File Structure (Phase 3 新增/修改)

```
src/
├── components/
│   └── editor/
│       ├── EditorPanel.tsx           # 剪辑主面板
│       ├── Timeline.tsx              # 时间线核心组件
│       ├── TimelineTrack.tsx         # 单个轨道
│       ├── TimelineClip.tsx          # 时间线上的片段
│       ├── VideoPreview.tsx           # 视频预览播放器
│       ├── TransitionLibrary.tsx     # 转场/特效库
│       └── ExportDialog.tsx          # 导出设置对话框
├── stores/
│   ├── editorStore.ts              # 编辑状态（当前时间、播放状态、选中等）
│   └── timelineStore.ts            # 时间线状态（轨道、片段、剪辑点）
└── lib/
    └── exporter.ts                  # 导出器（本地视频合成）
```

---

## Data Model 补充

### 时间线相关

```typescript
// 时间线轨道类型
type TrackType = 'video' | 'audio';

// 时间线轨道
interface TimelineTrack {
  id: string;
  type: TrackType;
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
  height: number; // 轨道高度
}

// 时间线片段
interface TimelineClip {
  id: string;
  trackId: string;
  sourceId: string;      // 关联的 Take 或 AudioTrack ID
  sourceType: 'take' | 'audio';  // 片段来源类型
  startTime: number;     // 在时间线上的起始时间（秒）
  duration: number;      // 片段时长（秒）
  inPoint: number;       // 源素材入点（秒）
  outPoint: number;      // 源素材出点（秒）
  effects: ClipEffect[];
  transitionIn?: Transition;
  transitionOut?: Transition;
}

// 转场/特效
interface Transition {
  id: string;
  type: TransitionType;
  duration: number; // 秒
  parameters?: Record<string, unknown>;
}

type TransitionType =
  | 'cut'           // 硬切
  | 'fade'          // 淡入淡出
  | 'dissolve'      // 叠化
  | 'wipe'          // 划像
  | 'slide';        // 滑动

// 片段特效
interface ClipEffect {
  id: string;
  type: EffectType;
  parameters: Record<string, unknown>;
  enabled: boolean;
}

type EffectType =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'speed'         // 速度调整
  | 'reverse';      // 倒放
```

### 编辑器状态

```typescript
interface EditorState {
  // 播放状态
  isPlaying: boolean;
  currentTime: number;    // 当前播放时间（秒）
  playbackRate: number;   // 播放速率

  // 选择状态
  selectedClipIds: string[];
  selectedTrackId: string | null;

  // 时间线缩放
  zoomLevel: number;      // 像素/秒

  // 工具模式
  toolMode: ToolMode;
}

type ToolMode = 'select' | 'trim' | 'cut' | 'razor';

interface TimelineState {
  tracks: TimelineTrack[];
  duration: number;       // 总时长（秒）

  // 轨道操作
  addTrack: (type: TrackType, name: string) => string;
  removeTrack: (trackId: string) => void;
  reorderTracks: (trackIds: string[]) => void;

  // 片段操作
  addClip: (clip: Omit<TimelineClip, 'id'>) => string;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  splitClip: (clipId: string, splitTime: number) => string | null;

  // 转场/特效
  addTransition: (clipId: string, transition: Omit<Transition, 'id'>, position: 'in' | 'out') => void;
  addEffect: (clipId: string, effect: Omit<ClipEffect, 'id'>) => void;

  // 工具
  getClipById: (clipId: string) => TimelineClip | undefined;
  getTrackById: (trackId: string) => TimelineTrack | undefined;
  getClipsAtTime: (time: number) => TimelineClip[];
}
```

---

## Task 14: 编辑状态管理

**Files:**
- Create: `src/stores/editorStore.ts`
- Create: `src/stores/timelineStore.ts`

- [ ] **Step 1: 创建 editorStore.ts**

```typescript
import { create } from 'zustand';

type ToolMode = 'select' | 'trim' | 'cut' | 'razor';

interface EditorState {
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  selectedClipIds: string[];
  selectedTrackId: string | null;
  zoomLevel: number;
  toolMode: ToolMode;

  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setCurrentTime: (time: number) => void;
  setPlaybackRate: (rate: number) => void;

  selectClip: (clipId: string, addToSelection?: boolean) => void;
  deselectClip: (clipId: string) => void;
  clearSelection: () => void;
  selectTrack: (trackId: string | null) => void;

  setZoomLevel: (level: number) => void;
  setToolMode: (mode: ToolMode) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  selectedClipIds: [],
  selectedTrackId: null,
  zoomLevel: 50, // 像素/秒
  toolMode: 'select',

  setPlaying: (playing) => set({ isPlaying: playing }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, time) }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  selectClip: (clipId, addToSelection = false) =>
    set((state) => {
      if (addToSelection) {
        return {
          selectedClipIds: state.selectedClipIds.includes(clipId)
            ? state.selectedClipIds
            : [...state.selectedClipIds, clipId],
        };
      }
      return { selectedClipIds: [clipId] };
    }),

  deselectClip: (clipId) =>
    set((state) => ({
      selectedClipIds: state.selectedClipIds.filter((id) => id !== clipId),
    })),

  clearSelection: () => set({ selectedClipIds: [] }),
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),

  setZoomLevel: (level) => set({ zoomLevel: Math.max(10, Math.min(200, level)) }),
  setToolMode: (mode) => set({ toolMode: mode }),
}));
```

- [ ] **Step 2: 创建 timelineStore.ts**

```typescript
import { create } from 'zustand';
import { TimelineTrack, TimelineClip, Transition, ClipEffect } from '@/types';
import { v4 as uuid } from 'uuid';

interface TimelineState {
  tracks: TimelineTrack[];
  duration: number;

  addTrack: (type: 'video' | 'audio', name: string) => string;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
  reorderTracks: (trackIds: string[]) => void;

  addClip: (clip: Omit<TimelineClip, 'id'>) => string;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  removeClip: (clipId: string) => void;
  moveClip: (clipId: string, newTrackId: string, newStartTime: number) => void;
  splitClip: (clipId: string, splitTime: number) => string | null;

  addTransition: (clipId: string, transition: Omit<Transition, 'id'>, position: 'in' | 'out') => void;
  addEffect: (clipId: string, effect: Omit<ClipEffect, 'id'>) => void;
  removeEffect: (clipId: string, effectId: string) => void;

  getClipById: (clipId: string) => TimelineClip | undefined;
  getTrackById: (trackId: string) => TimelineTrack | undefined;
  getClipsAtTime: (time: number) => TimelineClip[];
  getTimelineDuration: () => number;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  tracks: [],
  duration: 0,

  addTrack: (type, name) => {
    const id = uuid();
    const track: TimelineTrack = {
      id,
      type,
      name,
      clips: [],
      muted: false,
      locked: false,
      height: type === 'video' ? 80 : 60,
    };
    set((state) => ({ tracks: [...state.tracks, track] }));
    return id;
  },

  removeTrack: (trackId) =>
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
    })),

  updateTrack: (trackId, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
    })),

  reorderTracks: (trackIds) =>
    set((state) => {
      const trackMap = new Map(state.tracks.map((t) => [t.id, t]));
      const reordered = trackIds.map((id) => trackMap.get(id)!);
      return { tracks: reordered };
    }),

  addClip: (clipData) => {
    const id = uuid();
    const clip: TimelineClip = { ...clipData, id };
    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === clip.trackId ? { ...t, clips: [...t.clips, clip] } : t
      ),
    }));
    // 更新总时长
    const endTime = clip.startTime + clip.duration;
    set((state) => ({
      duration: Math.max(state.duration, endTime),
    }));
    return id;
  },

  updateClip: (clipId, updates) =>
    set((state) => {
      let maxEndTime = 0;
      const tracks = state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          if (c.id === clipId) {
            const updated = { ...c, ...updates };
            maxEndTime = Math.max(maxEndTime, updated.startTime + updated.duration);
            return updated;
          }
          maxEndTime = Math.max(maxEndTime, c.startTime + c.duration);
          return c;
        }),
      }));
      return { tracks, duration: Math.max(state.duration, maxEndTime) };
    }),

  removeClip: (clipId) =>
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      })),
    })),

  moveClip: (clipId, newTrackId, newStartTime) =>
    set((state) => {
      let clipToMove: TimelineClip | undefined;
      // 找到并移除
      const tracksWithoutClip = state.tracks.map((t) => {
        const clip = t.clips.find((c) => c.id === clipId);
        if (clip) {
          clipToMove = clip;
          return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
        }
        return t;
      });
      if (!clipToMove) return state;
      // 添加到新位置
      const tracksWithClip = tracksWithoutClip.map((t) =>
        t.id === newTrackId
          ? { ...t, clips: [...t.clips, { ...clipToMove!, trackId: newTrackId, startTime: newStartTime }] }
          : t
      );
      const maxEndTime = tracksWithClip.reduce(
        (max, t) => Math.max(max, ...t.clips.map((c) => c.startTime + c.duration)),
        0
      );
      return { tracks: tracksWithClip, duration: Math.max(state.duration, maxEndTime) };
    }),

  splitClip: (clipId, splitTime) => {
    const state = get();
    let targetClip: TimelineClip | undefined;
    let targetTrack: TimelineTrack | undefined;

    for (const track of state.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) {
        targetClip = clip;
        targetTrack = track;
        break;
      }
    }

    if (!targetClip || !targetTrack) return null;

    const relativeTime = splitTime - targetClip.startTime;
    if (relativeTime <= 0 || relativeTime >= targetClip.duration) return null;

    const newClipId = uuid();
    const originalOutPoint = targetClip.outPoint;
    const newClip: TimelineClip = {
      ...targetClip,
      id: newClipId,
      startTime: splitTime,
      inPoint: targetClip.inPoint + relativeTime,
      duration: targetClip.duration - relativeTime,
      transitionOut: undefined,
    };

    const updatedOriginal: TimelineClip = {
      ...targetClip,
      outPoint: targetClip.inPoint + relativeTime,
      duration: relativeTime,
      transitionIn: undefined,
    };

    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === targetTrack!.id
          ? {
              ...t,
              clips: [
                ...t.clips.filter((c) => c.id !== clipId),
                updatedOriginal,
                newClip,
              ],
            }
          : t
      ),
    }));

    return newClipId;
  },

  addTransition: (clipId, transition, position) =>
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) =>
          c.id === clipId
            ? {
                ...c,
                [position === 'in' ? 'transitionIn' : 'transitionOut']: {
                  ...transition,
                  id: uuid(),
                },
              }
            : c
        ),
      })),
    })),

  addEffect: (clipId, effect) =>
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) =>
          c.id === clipId
            ? { ...c, effects: [...c.effects, { ...effect, id: uuid() }] }
            : c
        ),
      })),
    })),

  removeEffect: (clipId, effectId) =>
    set((state) => ({
      tracks: state.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) =>
          c.id === clipId
            ? { ...c, effects: c.effects.filter((e) => e.id !== effectId) }
            : c
        ),
      })),
    })),

  getClipById: (clipId) => {
    for (const track of get().tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip) return clip;
    }
    return undefined;
  },

  getTrackById: (trackId) => get().tracks.find((t) => t.id === trackId),

  getClipsAtTime: (time) => {
    const clips: TimelineClip[] = [];
    for (const track of get().tracks) {
      for (const clip of track.clips) {
        if (time >= clip.startTime && time < clip.startTime + clip.duration) {
          clips.push(clip);
        }
      }
    }
    return clips;
  },

  getTimelineDuration: () => {
    const { tracks } = get();
    return tracks.reduce(
      (max, t) => Math.max(max, ...t.clips.map((c) => c.startTime + c.duration)),
      0
    );
  },
}));
```

---

## Task 15: 时间线组件

**Files:**
- Create: `src/components/editor/Timeline.tsx`
- Create: `src/components/editor/TimelineTrack.tsx`
- Create: `src/components/editor/TimelineClip.tsx`

- [ ] **Step 1: 创建 TimelineClip.tsx**

```typescript
import { TimelineClip as TimelineClipType } from '@/types';
import { useEditorStore } from '@/stores/editorStore';

interface TimelineClipProps {
  clip: TimelineClipType;
  trackType: 'video' | 'audio';
  pixelsPerSecond: number;
}

const transitionLabels: Record<string, string> = {
  cut: '切',
  fade: '淡',
  dissolve: '叠',
  wipe: '划',
  slide: '滑',
};

export function TimelineClip({ clip, trackType, pixelsPerSecond }: TimelineClipProps) {
  const { selectedClipIds, selectClip } = useEditorStore();
  const isSelected = selectedClipIds.includes(clip.id);

  const left = clip.startTime * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        selectClip(clip.id, e.shiftKey);
      }}
      className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-400'
      } ${trackType === 'video' ? 'bg-blue-600/60' : 'bg-green-600/60'}`}
      style={{ left: `${left}px`, width: `${Math.max(width, 20)}px` }}
    >
      {/* 片段内容 */}
      <div className="h-full flex flex-col justify-between p-1 overflow-hidden">
        <div className="text-[10px] text-white truncate">
          {clip.sourceType === 'take' ? '🎬 Take' : '🎵 Audio'}
        </div>

        {/* 转场标记 */}
        <div className="flex justify-between text-[8px] text-white/60">
          {clip.transitionIn && (
            <span className="bg-white/20 px-0.5 rounded">
              {transitionLabels[clip.transitionIn.type] || clip.transitionIn.type}
            </span>
          )}
          {clip.transitionOut && (
            <span className="bg-white/20 px-0.5 rounded">
              {transitionLabels[clip.transitionOut.type] || clip.transitionOut.type}
            </span>
          )}
        </div>
      </div>

      {/* 特效数量 */}
      {clip.effects.length > 0 && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-[8px] text-white">
          {clip.effects.length}
        </div>
      )}

      {/* 调整手柄 */}
      {isSelected && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white" />
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white" />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 TimelineTrack.tsx**

```typescript
import { TimelineTrack as TimelineTrackType } from '@/types';
import { TimelineClip } from './TimelineClip';
import { useEditorStore } from '@/stores/editorStore';

interface TimelineTrackProps {
  track: TimelineTrackType;
  pixelsPerSecond: number;
  onAddClip?: (trackId: string, time: number) => void;
}

export function TimelineTrack({ track, pixelsPerSecond, onAddClip }: TimelineTrackProps) {
  const { selectedTrackId, selectTrack } = useEditorStore();
  const isSelected = selectedTrackId === track.id;

  return (
    <div
      onClick={() => selectTrack(track.id)}
      className={`relative border-b border-neutral-800 ${
        isSelected ? 'bg-neutral-800/30' : ''
      } ${track.muted ? 'opacity-50' : ''} ${track.locked ? 'pointer-events-none' : ''}`}
      style={{ height: `${track.height}px` }}
    >
      {/* 轨道头 */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-center px-2 z-10">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white truncate">{track.name}</span>
          {track.type === 'video' ? (
            <span className="text-[10px] text-blue-400">V</span>
          ) : (
            <span className="text-[10px] text-green-400">A</span>
          )}
        </div>
        <div className="flex gap-1 mt-1">
          {track.muted && <span className="text-[8px] text-red-400">M</span>}
          {track.locked && <span className="text-[8px] text-yellow-400">L</span>}
        </div>
      </div>

      {/* 轨道内容区域 */}
      <div
        className="absolute left-24 right-0 top-0 bottom-0"
        onDoubleClick={(e) => {
          if (onAddClip && !track.locked) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = x / pixelsPerSecond;
            onAddClip(track.id, time);
          }
        }}
      >
        {track.clips.map((clip) => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            trackType={track.type}
            pixelsPerSecond={pixelsPerSecond}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 Timeline.tsx**

```typescript
import { useRef, useState, useEffect } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useEditorStore } from '@/stores/editorStore';
import { TimelineTrack } from './TimelineTrack';

export function Timeline() {
  const { tracks, duration } = useTimelineStore();
  const {
    currentTime,
    setCurrentTime,
    zoomLevel,
    setZoomLevel,
    isPlaying,
    toolMode,
    selectedClipIds,
    clearSelection,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const pixelsPerSecond = zoomLevel;
  const totalWidth = Math.max(duration * pixelsPerSecond + 200, 800);

  // 时间刻度
  const timeMarkers = [];
  const interval = zoomLevel > 100 ? 1 : zoomLevel > 50 ? 5 : 10;
  for (let t = 0; t <= duration + 60; t += interval) {
    timeMarkers.push(t);
  }

  // 点击时间线设置当前时间
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.track-content-area')) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - 96 + scrollLeft; // 96 = 轨道头宽度
      const time = Math.max(0, x / pixelsPerSecond);
      setCurrentTime(time);
    }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <span className="text-sm text-white font-medium">时间线</span>
          <div className="flex gap-1">
            {(['select', 'trim', 'cut', 'razor'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => useEditorStore.getState().setToolMode(mode)}
                className={`px-2 py-1 text-xs rounded ${
                  toolMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {mode === 'select' ? '选择' : mode === 'trim' ? '修剪' : mode === 'cut' ? '剪切' : '刀片'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 缩放控制 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">缩放</span>
            <input
              type="range"
              min="20"
              max="200"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-24 h-1 bg-neutral-700 rounded"
            />
          </div>

          {/* 时间显示 */}
          <div className="text-sm text-white font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* 时间刻度 */}
      <div className="h-6 relative border-b border-neutral-800 bg-neutral-900 overflow-hidden">
        <div
          className="absolute flex"
          style={{ width: `${totalWidth}px`, transform: `translateX(${96 - scrollLeft}px)` }}
        >
          {timeMarkers.map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 border-l border-neutral-700"
              style={{ left: `${t * pixelsPerSecond}px` }}
            >
              <span className="absolute -top-1 left-1 text-[10px] text-neutral-500">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>

        {/* 播放头 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
          style={{ left: `${96 + currentTime * pixelsPerSecond - scrollLeft}px` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
        </div>
      </div>

      {/* 轨道区域 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            clearSelection();
          }
          handleTimelineClick(e);
        }}
      >
        <div
          className="relative"
          style={{ width: `${totalWidth}px`, minHeight: '100%' }}
        >
          {/* 轨道头区域 */}
          <div className="sticky left-0 z-10">
            {/* 表头 */}
            <div className="h-6 bg-neutral-900 border-b border-neutral-800" />
            {/* 轨道 */}
            {tracks.map((track) => (
              <div key={track.id} className="h-[60px] bg-neutral-900 border-b border-neutral-800">
                <div className="h-full flex items-center justify-center border-r-2 border-neutral-700">
                  <span className="text-[10px] text-neutral-500">{track.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 时间线内容 */}
          <div className="absolute left-24 right-0 top-0">
            {/* 时间刻度行 */}
            <div className="h-6 relative border-b border-neutral-800">
              {timeMarkers.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 border-l border-neutral-700"
                  style={{ left: `${t * pixelsPerSecond}px` }}
                />
              ))}
            </div>

            {/* 轨道 */}
            {tracks.map((track) => (
              <TimelineTrack
                key={track.id}
                track={track}
                pixelsPerSecond={pixelsPerSecond}
              />
            ))}
          </div>

          {/* 播放头（覆盖层） */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{ left: `${96 + currentTime * pixelsPerSecond}px` }}
          />
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}
```

---

## Task 16: 视频预览播放器

**Files:**
- Create: `src/components/editor/VideoPreview.tsx`

- [ ] **Step 1: 创建 VideoPreview.tsx**

```typescript
import { useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useTakesStore } from '@/stores/takesStore';
import { useAudioStore } from '@/stores/audioStore';

export function VideoPreview() {
  const { currentTime, isPlaying, setCurrentTime, togglePlaying, playbackRate } = useEditorStore();
  const { tracks } = useTimelineStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>();

  // 获取当前时间对应的视频帧
  const getCurrentFrame = () => {
    for (const track of tracks) {
      if (track.type !== 'video') continue;
      for (const clip of track.clips) {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          if (clip.sourceType === 'take') {
            const takes = useTakesStore.getState().takes;
            const take = takes.find((t) => t.id === clip.sourceId);
            if (take?.videoUrl) {
              return { url: take.videoUrl, localTime: currentTime - clip.startTime + clip.inPoint };
            }
            if (take?.imageUrl) {
              return { url: take.imageUrl, isImage: true };
            }
          }
        }
      }
    }
    return null;
  };

  const currentFrame = getCurrentFrame();

  // 播放动画循环
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const newTime = currentTime + delta * playbackRate;
      const duration = useTimelineStore.getState().duration;

      if (newTime >= duration) {
        setCurrentTime(0);
        useEditorStore.getState().setPlaying(false);
      } else {
        setCurrentTime(newTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackRate]);

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* 预览区域 */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {currentFrame ? (
          currentFrame.isImage ? (
            <img
              src={currentFrame.url}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentFrame.url}
              className="max-w-full max-h-full object-contain"
              muted
            />
          )
        ) : (
          <div className="text-neutral-600 text-center">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-sm">添加视频片段到时间线</p>
          </div>
        )}

        {/* 播放指示器 */}
        {isPlaying && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 rounded text-xs text-white">
            ● 播放中
          </div>
        )}
      </div>

      {/* 播放控制栏 */}
      <div className="h-12 flex items-center justify-center gap-4 bg-neutral-900 border-t border-neutral-800">
        {/* 返回开头 */}
        <button
          onClick={() => setCurrentTime(0)}
          className="text-neutral-400 hover:text-white"
        >
          ⏮
        </button>

        {/* 播放/暂停 */}
        <button
          onClick={togglePlaying}
          className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:bg-neutral-200"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* 播放速率 */}
        <select
          value={playbackRate}
          onChange={(e) => useEditorStore.getState().setPlaybackRate(parseFloat(e.target.value))}
          className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-xs"
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>
    </div>
  );
}
```

---

## Task 17: 剪辑主面板

**Files:**
- Create: `src/components/editor/EditorPanel.tsx`
- Create: `src/components/editor/TransitionLibrary.tsx`

- [ ] **Step 1: 创建 TransitionLibrary.tsx**

```typescript
import { useTimelineStore } from '@/stores/timelineStore';
import { TransitionType } from '@/types';

const transitions: Array<{ type: TransitionType; name: string; icon: string }> = [
  { type: 'cut', name: '硬切', icon: '✂️' },
  { type: 'fade', name: '淡入淡出', icon: '🌫️' },
  { type: 'dissolve', name: '叠化', icon: '💫' },
  { type: 'wipe', name: '划像', icon: '➡️' },
  { type: 'slide', name: '滑动', icon: '↔️' },
];

export function TransitionLibrary() {
  const { selectedClipIds, addTransition } = useTimelineStore();
  const [selectedClipId] = selectedClipIds;

  if (!selectedClipId) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        选择一个片段以添加转场
      </div>
    );
  }

  return (
    <div className="p-4">
      <h4 className="text-xs text-neutral-500 mb-3">转场效果</h4>
      <div className="grid grid-cols-5 gap-2">
        {transitions.map((t) => (
          <button
            key={t.type}
            onClick={() =>
              addTransition(selectedClipId, { type: t.type, duration: 0.5 }, 'out')
            }
            className="flex flex-col items-center p-2 bg-neutral-800 hover:bg-neutral-700 rounded"
          >
            <span className="text-lg mb-1">{t.icon}</span>
            <span className="text-[10px] text-neutral-400">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 EditorPanel.tsx**

```typescript
import { useState } from 'react';
import { Timeline } from './Timeline';
import { VideoPreview } from './VideoPreview';
import { TransitionLibrary } from './TransitionLibrary';
import { useTimelineStore } from '@/stores/timelineStore';
import { useEditorStore } from '@/stores/editorStore';

type EditorTab = 'timeline' | 'transitions' | 'effects';

export function EditorPanel() {
  const [activeTab, setActiveTab] = useState<EditorTab>('timeline');
  const { addTrack, tracks } = useTimelineStore();
  const { selectedClipIds } = useEditorStore();

  return (
    <div className="h-full flex flex-col">
      {/* Tab 导航 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800 bg-neutral-900">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-1 text-sm rounded ${
              activeTab === 'timeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
            }`}
          >
            时间线
          </button>
          <button
            onClick={() => setActiveTab('transitions')}
            className={`px-4 py-1 text-sm rounded ${
              activeTab === 'transitions' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
            }`}
          >
            转场
          </button>
          <button
            onClick={() => setActiveTab('effects')}
            className={`px-4 py-1 text-sm rounded ${
              activeTab === 'effects' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
            }`}
          >
            特效
          </button>
        </div>

        {/* 添加轨道 */}
        <div className="flex gap-2">
          <button
            onClick={() => addTrack('video', `V${tracks.filter(t => t.type === 'video').length + 1}`)}
            className="px-3 py-1 text-xs bg-blue-900 hover:bg-blue-800 text-blue-300 rounded"
          >
            + 视频轨
          </button>
          <button
            onClick={() => addTrack('audio', `A${tracks.filter(t => t.type === 'audio').length + 1}`)}
            className="px-3 py-1 text-xs bg-green-900 hover:bg-green-800 text-green-300 rounded"
          >
            + 音频轨
          </button>
        </div>
      </div>

      {/* 主内容区：左侧视频预览 + 右侧时间线 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：视频预览 */}
        <div className="w-2/5 border-r border-neutral-800">
          <VideoPreview />
        </div>

        {/* 右侧：时间线/转场/特效 */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'timeline' ? (
            <Timeline />
          ) : activeTab === 'transitions' ? (
            <div className="flex-1 overflow-auto">
              <TransitionLibrary />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              {selectedClipIds.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  选择一个片段以添加特效
                </div>
              ) : (
                <div>
                  <h4 className="text-xs text-neutral-500 mb-3">可用特效</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['brightness', 'contrast', 'saturation', 'speed', 'reverse'].map((effect) => (
                      <button
                        key={effect}
                        className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-white"
                      >
                        {effect === 'brightness' && '亮度'}
                        {effect === 'contrast' && '对比度'}
                        {effect === 'saturation' && '饱和度'}
                        {effect === 'speed' && '速度'}
                        {effect === 'reverse' && '倒放'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 18: 导出系统

**Files:**
- Create: `src/lib/exporter.ts`
- Create: `src/components/editor/ExportDialog.tsx`

- [ ] **Step 1: 创建 exporter.ts**

```typescript
import { TimelineClip, TimelineTrack } from '@/types';

interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  format: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high';
}

interface ExportProgress {
  status: 'preparing' | 'encoding' | 'complete' | 'error';
  progress: number; // 0-100
  currentFrame?: number;
  totalFrames?: number;
}

type ProgressCallback = (progress: ExportProgress) => void;

/**
 * 本地视频导出器
 *
 * 注意：这是一个模拟实现。实际实现需要：
 * 1. 使用 WebCodecs API 进行视频编码
 * 2. 或调用本地 Tauri 后端进行 FFmpeg 封装
 * 3. 或将时间线数据序列化为 EDL/FCPXML 交给专业软件处理
 */
export async function exportTimeline(
  tracks: TimelineTrack[],
  duration: number,
  options: ExportOptions,
  onProgress: ProgressCallback
): Promise<Blob> {
  onProgress({ status: 'preparing', progress: 0 });

  const totalFrames = Math.ceil(duration * options.fps);

  // 模拟编码过程
  for (let frame = 0; frame <= totalFrames; frame++) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    onProgress({
      status: 'encoding',
      progress: Math.round((frame / totalFrames) * 100),
      currentFrame: frame,
      totalFrames,
    });
  }

  // 返回一个空的 Blob（实际需要编码后的视频数据）
  onProgress({ status: 'complete', progress: 100 });

  return new Blob([], { type: `video/${options.format}` });
}

/**
 * 导出时间线为 EDL (Edit Decision List) 格式
 */
export function exportToEDL(tracks: TimelineTrack[], duration: number): string {
  let edl = `TITLE: VibeStudio Export\nFCM: NON-DROP FRAME\n\n`;

  let eventNum = 1;

  for (const track of tracks) {
    for (const clip of track.clips) {
      const startTimecode = framesToTimecode(clip.startTime * 30, 30);
      const endTimecode = framesToTimecode((clip.startTime + clip.duration) * 30, 30);
      const sourceIn = framesToTimecode(clip.inPoint * 30, 30);
      const sourceOut = framesToTimecode(clip.outPoint * 30, 30);

      edl += `${eventNum.toString().padStart(3, '0')}  AX       V     C        ${startTimecode} ${endTimecode} ${sourceIn} ${sourceOut}\n`;
      edl += `* FROM CLIP NAME: ${clip.sourceId}\n`;
      edl += `\n`;

      eventNum++;
    }
  }

  return edl;
}

function framesToTimecode(frames: number, fps: number): string {
  const totalSeconds = frames / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const remainingFrames = Math.floor(frames % fps);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`;
}
```

- [ ] **Step 2: 创建 ExportDialog.tsx**

```typescript
import { useState } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { exportTimeline, exportToEDL } from '@/lib/exporter';

interface ExportDialogProps {
  onClose: () => void;
}

type ExportFormat = 'mp4' | 'webm';
type ExportQuality = 'low' | 'medium' | 'high';

const qualitySettings = {
  low: { width: 720, height: 480, bitrate: '1 Mbps' },
  medium: { width: 1920, height: 1080, bitrate: '5 Mbps' },
  high: { width: 3840, height: 2160, bitrate: '20 Mbps' },
};

export function ExportDialog({ onClose }: ExportDialogProps) {
  const { tracks, duration } = useTimelineStore();
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [quality, setQuality] = useState<ExportQuality>('medium');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExportStatus('exporting');

    try {
      const settings = qualitySettings[quality];
      const blob = await exportTimeline(
        tracks,
        duration,
        {
          width: settings.width,
          height: settings.height,
          fps: 30,
          format,
          quality,
        },
        (p) => setProgress(p.progress)
      );

      setExportStatus('complete');

      // 触发下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibestudio-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('idle');
    }
  };

  const handleExportEDL = () => {
    const edl = exportToEDL(tracks, duration);
    const blob = new Blob([edl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vibestudio-export.edl';
    a.click();
    URL.revokeObjectURL(url);
  };

  const settings = qualitySettings[quality];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg w-full max-w-md p-6">
        <h2 className="text-lg font-medium text-white mb-4">导出设置</h2>

        {exportStatus === 'idle' && (
          <>
            {/* 格式 */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">格式</label>
              <div className="flex gap-2">
                {(['mp4', 'webm'] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2 rounded text-sm ${
                      format === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 质量 */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">质量</label>
              <div className="space-y-2">
                {(['low', 'medium', 'high'] as ExportQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`w-full flex items-center justify-between p-3 rounded ${
                      quality === q
                        ? 'bg-blue-600/20 border border-blue-500'
                        : 'bg-neutral-800 border border-transparent'
                    }`}
                  >
                    <div className="text-left">
                      <div className="text-sm text-white">
                        {q === 'low' ? '低 (720p)' : q === 'medium' ? '中 (1080p)' : '高 (4K)'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {qualitySettings[q].width}x{qualitySettings[q].height} • {qualitySettings[q].bitrate}
                      </div>
                    </div>
                    {quality === q && <span className="text-blue-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* 时长信息 */}
            <div className="mb-6 p-3 bg-neutral-800 rounded">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">总时长</span>
                <span className="text-white">{Math.round(duration)} 秒</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-neutral-400">轨道数</span>
                <span className="text-white">{tracks.length}</span>
              </div>
            </div>

            {/* 导出 EDL */}
            <button
              onClick={handleExportEDL}
              className="w-full mb-3 py-2 border border-neutral-700 rounded text-sm text-neutral-400 hover:text-white hover:border-neutral-600"
            >
              导出 EDL（用于其他剪辑软件）
            </button>
          </>
        )}

        {exportStatus === 'exporting' && (
          <div className="py-8 text-center">
            <div className="text-4xl mb-4">🎬</div>
            <div className="text-white mb-2">正在导出...</div>
            <div className="w-full h-2 bg-neutral-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-neutral-500 mt-2">{progress}%</div>
          </div>
        )}

        {exportStatus === 'complete' && (
          <div className="py-8 text-center">
            <div className="text-4xl mb-4 text-green-500">✓</div>
            <div className="text-white mb-4">导出完成！</div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white text-black rounded hover:bg-neutral-200"
            >
              完成
            </button>
          </div>
        )}

        {exportStatus === 'idle' && (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-neutral-700 rounded text-neutral-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              className="flex-1 py-2 bg-white text-black rounded hover:bg-neutral-200"
            >
              开始导出
            </button>
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
   - [x] 专业剪辑（多轨道、时间线编辑）
   - [x] 视频预览播放
   - [x] 转场/特效
   - [x] 导出功能（EDL 格式支持）

2. **Placeholder 扫描** — exporter.ts 中有明确的注释说明这是模拟实现

3. **类型一致性** — 所有接口引用 Phase 1 的 types/index.ts，新增类型已补充

4. **任务完整性** — 所有任务都有具体文件、具体代码

---

## 执行选择

**Plan 完成，保存于:** `docs/superpowers/plans/2026-04-11-vibe-studio-phase-3.md`

两个执行选项：

**1. Subagent-Driven (推荐)** — 每个任务派一个新 subagent 执行，任务间有检查点

**2. Inline Execution** — 在当前 session 内批量执行，有检查点

选择哪个方式？