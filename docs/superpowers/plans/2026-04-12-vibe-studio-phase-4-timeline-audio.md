# VibeStudio Phase 4: 时间线编辑器 + 音频管线 + 导出

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成时间线剪辑编辑器、音频管线、导出功能 — 替换 Phase 3 的占位符，实现完整的视频编辑工作流。

**Architecture:** 在现有 `timelineStore` / `audioStore` / `editorStore` 基础上，补全缺失类型，修复现有组件的类型错误，将 Timeline 编辑器和音频管线接入 EpisodeDetail，添加导出面板。

**Tech Stack:** 现有 Vite / React 18 / TypeScript 5 / Zustand / Tailwind CSS / Electron

---

## File Structure

```
src/
├── types/index.ts                        # 补充 Annotation, AudioVolumeKeyframe, RenderTask, RenderTaskStatus
├── stores/
│   ├── audioStore.ts                     # 修复：移除 AudioVolumeKeyframe 引用
│   └── reviewStore.ts                    # 修复：移除 Annotation 引用
├── components/
│   ├── editor/
│   │   ├── TimelineClip.tsx              # 修复：移除 sourceType/sourceId 引用
│   │   ├── VideoPreview.tsx              # 修复：移除 sourceType/sourceId 引用
│   │   ├── TransitionLibrary.tsx         # 修复：使用 editorStore 而非 timelineStore
│   │   └── ExportDialog.tsx              # 修复：移除未使用的 settings 变量
│   └── production/
│       ├── EpisodeDetail.tsx             # 修改：替换 TimelinePlaceholder 为真实 Timeline 编辑器
│       ├── TimelineEditor.tsx            # 新建：完整时间线编辑器（VideoPreview + Timeline）
│       ├── AudioPipeline.tsx             # 新建：音频管线面板
│       └── ExportPanel.tsx               # 新建：导出面板（整合 ExportDialog）
└── lib/
    └── exporter.ts                       # 修复：移除 sourceId 引用，添加 duration 参数
```

---

## Missing Types to Add

```typescript
// ==================== 审阅 ====================

export interface Annotation {
  id: string;
  episodeId: string;
  targetId: string;
  targetType: 'shot' | 'scene' | 'audio' | 'timeline';
  content: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

// ==================== 渲染任务 ====================

export interface RenderTask {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  parameters: Record<string, unknown>;
  status: RenderTaskStatus;
  progress: number;
  createdAt: string;
}

export type RenderTaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

// ==================== 音频关键帧 ====================

export interface AudioVolumeKeyframe {
  time: number;
  volume: number;
}

// ==================== TimelineClip 扩展 ====================
// 注意：现有 TimelineClip 类型已有这些字段，无需修改类型定义
// sourceType/sourceId 在 Task 1 中添加到组件引用处（类型扩展）
```

---

## Task 1: 修复现有类型错误

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/stores/audioStore.ts`
- Modify: `src/stores/reviewStore.ts`
- Modify: `src/components/editor/TimelineClip.tsx`
- Modify: `src/components/editor/VideoPreview.tsx`
- Modify: `src/components/editor/TransitionLibrary.tsx`
- Modify: `src/components/editor/ExportDialog.tsx`
- Modify: `src/lib/exporter.ts`

- [ ] **Step 1: 添加缺失类型到 src/types/index.ts**

在文件末尾添加：

```typescript
// ==================== 审阅 ====================

export interface Annotation {
  id: string;
  episodeId: string;
  targetId: string;
  targetType: 'shot' | 'scene' | 'audio' | 'timeline';
  content: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

// ==================== 渲染任务 ====================

export interface RenderTask {
  id: string;
  type: 'image' | 'video';
  prompt: string;
  parameters: Record<string, unknown>;
  status: RenderTaskStatus;
  progress: number;
  createdAt: string;
}

export type RenderTaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

// ==================== 音频关键帧 ====================

export interface AudioVolumeKeyframe {
  time: number;
  volume: number;
}
```

- [ ] **Step 2: 修复 src/stores/audioStore.ts**

将第 2 行改为：
```typescript
import { AudioTrack, AudioType } from '@/types';
```
删除第 14-15 行的 `addVolumeKeyframe` 和 `removeVolumeKeyframe` 方法（AudioTrack 类型没有 keyframes 字段）。

将 `AudioState` 接口改为：
```typescript
interface AudioState {
  tracks: AudioTrack[];

  addTrack: (episodeId: string, type: AudioType, name: string, fileUrl: string, duration?: number) => AudioTrack;
  updateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  removeTrack: (trackId: string) => void;

  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;

  getTracksByEpisode: (episodeId: string) => AudioTrack[];
  getTrackById: (trackId: string) => AudioTrack | undefined;
}
```

`addTrack` 实现改为：
```typescript
addTrack: (episodeId, type, name, fileUrl, duration = 0) => {
  const track: AudioTrack = {
    id: uuid(),
    episodeId,
    type,
    name,
    fileUrl,
    duration,
    startTime: 0,
    volume: 1,
    muted: false,
  };
  set((state) => ({ tracks: [...state.tracks, track] }));
  return track;
},
```

删除 `addVolumeKeyframe` 和 `removeVolumeKeyframe` 方法。

- [ ] **Step 3: 修复 src/stores/reviewStore.ts**

将第 2 行改为：
```typescript
import { DraftVersion } from '@/types';
```
删除第 2 行的 `Annotation` 导入。

第 33 行 `annotations: []` 报错，因为 `DraftVersion` 没有 `annotations` 字段。改为：
```typescript
createDraftVersion: (episodeId, label, notes) => {
  const draft: DraftVersion = {
    id: uuid(),
    episodeId,
    label,
    notes,
    createdAt: new Date().toISOString(),
  };
  set((state) => ({ draftVersions: [...state.draftVersions, draft] }));
  return draft;
},
```

删除整个 `annotations` 相关的方法和状态（`annotations: []`, `addAnnotation`, `resolveAnnotation`, `deleteAnnotation`, `getAnnotationsForEpisode`, `getAnnotationsForTarget`）。

将 `ReviewState` 接口改为：
```typescript
interface ReviewState {
  draftVersions: DraftVersion[];

  createDraftVersion: (episodeId: string, label: string, notes?: string) => DraftVersion;
  updateDraftVersion: (versionId: string, updates: Partial<DraftVersion>) => void;
  deleteDraftVersion: (versionId: string) => void;
  getDraftVersionsForEpisode: (episodeId: string) => DraftVersion[];
}
```

- [ ] **Step 4: 修复 src/components/editor/TimelineClip.tsx**

第 41 行 `clip.sourceType` 不存在于 TimelineClip 类型。需要：

在 `src/types/index.ts` 的 `TimelineClip` 接口中添加两个可选字段：
```typescript
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
  sourceType?: 'take' | 'audio';   // 新增
  sourceId?: string;                // 新增
}
```

然后 `TimelineClip.tsx` 第 41 行保持不变（因为字段已添加为可选）。

- [ ] **Step 5: 修复 src/components/editor/VideoPreview.tsx**

第 18-26 行引用 `clip.sourceType` 和 `clip.sourceId`，由于已在 Task 4 中添加到 TimelineClip 类型，此文件无需修改。

- [ ] **Step 6: 修复 src/components/editor/TransitionLibrary.tsx**

第 13 行：`selectedClipIds` 不存在于 `timelineStore`。`TransitionLibrary` 使用了 `timelineStore` 但 `selectedClipIds` 在 `editorStore` 中。

将第 1 行改为：
```typescript
import { useEditorStore } from '@/stores/editorStore';
import { useTimelineStore } from '@/stores/timelineStore';
```
将第 13 行改为：
```typescript
const { selectedClipIds } = useEditorStore();
```
删除第 14 行的 `const [selectedClipId] = selectedClipIds;`

- [ ] **Step 7: 修复 src/components/editor/ExportDialog.tsx**

第 29 行 `settings` 未使用（但在 `handleExport` 闭包中有效），第 68 行重新声明了 `settings`。将第 68 行删除（已在内联 JSX 中使用 `qualitySettings[quality].width` 等）。

删除第 68 行：
```typescript
const settings = qualitySettings[quality];
```

- [ ] **Step 8: 修复 src/lib/exporter.ts**

第 2 行 `probeVideo` 未使用，删除该导入。

第 34-35 行引用 `clip.sourceId`（已在 TimelineClip 类型中添加），第 98 行同样引用 `clip.sourceId`。这些引用保持不变（类型已修复）。

第 25 行 `duration` 声明后未直接使用（但通过 `inputPaths` 间接用于时长计算），改为：
```typescript
export async function exportTimeline(
  tracks: TimelineTrack[],
  _duration: number,
  options: ExportOptions,
  onProgress: ProgressCallback
): Promise<Blob> {
```
（保留参数但加下划线前缀表示未使用，因为时长由轨道自己计算）

---

## Task 2: 创建 TimelineEditor 完整时间线编辑器

**Files:**
- Create: `src/components/production/TimelineEditor.tsx`

- [ ] **Step 1: 创建 TimelineEditor.tsx**

```typescript
import { VideoPreview } from '@/components/editor/VideoPreview';
import { Timeline } from '@/components/editor/Timeline';
import { ExportDialog } from '@/components/editor/ExportDialog';
import { useState } from 'react';

export function TimelineEditor() {
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* 上部：视频预览 */}
      <div className="flex-[3] border-b border-neutral-800">
        <VideoPreview />
      </div>

      {/* 下部：时间线 */}
      <div className="flex-[2] flex flex-col">
        {/* 时间线工具栏（含导出按钮） */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800 bg-neutral-900">
          <span className="text-sm text-white font-medium">时间线</span>
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            导出
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Timeline />
        </div>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
```

---

## Task 3: 创建 AudioPipeline 音频管线面板

**Files:**
- Create: `src/components/production/AudioPipeline.tsx`

- [ ] **Step 1: 创建 AudioPipeline.tsx**

```typescript
import { useState } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { AudioType } from '@/types';

type AudioTab = 'dialogue' | 'bgm' | 'sfx' | 'foley';

export function AudioPipeline({ episodeId }: { episodeId: string }) {
  const { getTracksByEpisode, addTrack, setTrackVolume, setTrackMuted, removeTrack } = useAudioStore();
  const [activeTab, setActiveTab] = useState<AudioTab>('dialogue');
  const [showAddTrack, setShowAddTrack] = useState(false);

  const allTracks = getTracksByEpisode(episodeId);
  const filteredTracks = allTracks.filter((t) => t.type === activeTab);

  const tabConfig: { key: AudioTab; label: string; icon: string }[] = [
    { key: 'dialogue', label: '对白', icon: '🎤' },
    { key: 'bgm', label: 'BGM', icon: '🎵' },
    { key: 'sfx', label: '音效', icon: '🔊' },
    { key: 'foley', label: '拟音', icon: '🎧' },
  ];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Tab 导航 */}
      <div className="flex items-center gap-1 mb-4">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === tab.key
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowAddTrack(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          + 添加音轨
        </button>
      </div>

      {/* 音轨列表 */}
      {filteredTracks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          <div className="text-center">
            <p className="mb-1">暂无 {tabConfig.find((t) => t.key === activeTab)?.label}</p>
            <p className="text-xs text-neutral-600">
              {activeTab === 'dialogue'
                ? 'AI 配音将在 Phase 5 实现'
                : `点击"添加音轨"上传音频文件`}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {filteredTracks.map((track) => (
            <AudioTrackRow
              key={track.id}
              track={track}
              onVolumeChange={(v) => setTrackVolume(track.id, v)}
              onMuteChange={(m) => setTrackMuted(track.id, m)}
              onRemove={() => removeTrack(track.id)}
            />
          ))}
        </div>
      )}

      {/* 添加音轨弹窗 */}
      {showAddTrack && (
        <AddTrackModal
          episodeId={episodeId}
          defaultType={activeTab}
          onClose={() => setShowAddTrack(false)}
        />
      )}
    </div>
  );
}

function AudioTrackRow({
  track,
  onVolumeChange,
  onMuteChange,
  onRemove,
}: {
  track: { id: string; name: string; type: AudioType; volume: number; muted: boolean; fileUrl: string };
  onVolumeChange: (v: number) => void;
  onMuteChange: (m: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-neutral-900 rounded-lg p-3 flex items-center gap-4">
      <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center text-neutral-500">
        🎵
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{track.name}</p>
        <p className="text-xs text-neutral-600">{track.fileUrl.split('/').pop()}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 w-8">{Math.round(track.volume * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-20 h-1 bg-neutral-700 rounded"
        />
      </div>
      <button
        onClick={() => onMuteChange(!track.muted)}
        className={`px-2 py-1 text-xs rounded ${
          track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800 text-neutral-400'
        }`}
      >
        {track.muted ? '静音' : '播放'}
      </button>
      <button
        onClick={onRemove}
        className="px-2 py-1 text-xs rounded bg-neutral-800 text-neutral-500 hover:text-red-400"
      >
        删除
      </button>
    </div>
  );
}

function AddTrackModal({
  episodeId,
  defaultType,
  onClose,
}: {
  episodeId: string;
  defaultType: AudioTab;
  onClose: () => void;
}) {
  const { addTrack } = useAudioStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<AudioType>(defaultType === 'dialogue' ? 'dialogue' : defaultType === 'bgm' ? 'bgm' : defaultType === 'sfx' ? 'sfx' : 'foley');
  const [fileUrl, setFileUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !fileUrl.trim()) return;
    addTrack(episodeId, type, name.trim(), fileUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-medium text-white mb-4">添加音轨</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">音轨名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：第1集对白"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AudioType)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            >
              <option value="dialogue">对白</option>
              <option value="bgm">背景音乐</option>
              <option value="sfx">音效</option>
              <option value="foley">拟音</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">文件路径</label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="/path/to/audio.mp3"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-neutral-700 rounded text-neutral-400">
            取消
          </button>
          <button onClick={handleAdd} className="flex-1 py-2 bg-white text-black rounded hover:bg-neutral-200">
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 4: 集成到 EpisodeDetail

**Files:**
- Modify: `src/components/production/EpisodeDetail.tsx`

- [ ] **Step 1: 更新 EpisodeDetail.tsx**

删除 `TimelinePlaceholder` 和 `AudioPlaceholder`，导入真实组件：

将第 1-6 行的导入部分改为：
```typescript
import { useState } from 'react';
import { useProductionStore } from '@/stores/productionStore';
import { ProductionEpisode, ProductionStatus } from '@/types';
import { StoryboardView } from './StoryboardView';
import { TakesBrowser } from './TakesBrowser';
import { TimelineEditor } from './TimelineEditor';
import { AudioPipeline } from './AudioPipeline';
```

删除 `TimelinePlaceholder` 函数（第 75-84 行）和 `AudioPlaceholder` 函数（第 86-94 行）。

第 68-69 行的渲染部分改为：
```typescript
{activeTab === 'storyboard' && <StoryboardView episodeId={episode.id} />}
{activeTab === 'takes' && <TakesBrowser episodeId={episode.id} />}
{activeTab === 'timeline' && <TimelineEditor />}
{activeTab === 'audio' && <AudioPipeline episodeId={episode.id} />}
```

---

## Task 5: 验证 TypeScript 编译

**Files:**
- (no file changes — verification only)

- [ ] **Step 1: 运行 TypeScript 检查**

Run: `cd D:/claude_dev/ai_vedio && npx tsc --noEmit 2>&1`

Expected: 无 Phase 4 相关错误。剩余错误应为 Phase 5 相关（AI 配音 API、生成任务等）。

---

## Self-Review 检查清单

1. **Spec 覆盖检查** — 逐项核对 PRD Phase 4：
   - [x] 时间线编辑器（VideoPreview + Timeline）已集成
   - [x] 音频管线（dialogue/bgm/sfx/foley 轨道管理）已实现
   - [x] 导出面板（ExportDialog）已集成
   - [x] 音频轨道静音/音量控制
   - [x] 多轨道支持

2. **Placeholder 扫描** — 所有 "Phase X 实现" 占位符已替换为真实组件

3. **类型一致性** — 所有新增字段（sourceType, sourceId）在 TimelineClip 中定义为可选；Annotation、AudioVolumeKeyframe、RenderTask、RenderTaskStatus 已添加到 types/index.ts

4. **现有代码** — 修复了 TransitionLibrary（使用 editorStore 而非 timelineStore）、删除了 reviewStore 中的 annotations 引用、删除了 audioStore 中的 keyframes 引用

5. **未涵盖范围（Phase 5）**：
   - AI 配音合成（云端 API 调用）
   - AI 生成 BGM / 音效
   - FFmpeg 渲染管线集成
   - ProRes MOV 导出格式

---

## 执行选择

**Plan 完成，保存于:** `docs/superpowers/plans/2026-04-12-vibe-studio-phase-4-timeline-audio.md`

两个执行选项：

**1. Subagent-Driven (推荐)** — 每个任务派一个新 subagent 执行，任务间有检查点

**2. Inline Execution** — 在当前 session 内批量执行，有检查点

选择哪个方式？
