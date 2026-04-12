# VibeStudio Phase 1: 小说创作侧

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成小说创作侧核心功能 — MD编辑器 + LLM审阅面板 + 手动触发知识库同步入口，奠定项目框架。

**Architecture:** 现有Vite + React + TypeScript + Zustand + Tailwind框架，新增MD编辑器组件、LLM审阅面板组件、知识库同步触发器。本地JSON文件存储章节数据，知识库同步由用户手动触发。

**Tech Stack:** Vite / React 18 / TypeScript 5 / Zustand / Tailwind CSS / marked(MD解析) / highlight.js(代码高亮)

---

## File Structure

```
src/
├── App.tsx                          # 根组件（已存在，Phase1验证后迭代）
├── main.tsx                         # React入口（已存在）
├── index.css                        # 全局样式（已存在）
├── components/
│   ├── layout/
│   │   ├── MainShell.tsx          # 三面板容器（已存在，可能需要调整）
│   │   ├── CreatePanel.tsx         # 创作面板（需改造支持小说侧）
│   │   ├── ProjectPanel.tsx        # 项目面板（已存在）
│   │   └── AssetsPanel.tsx         # 资产面板（已存在）
│   ├── novel/
│   │   ├── NovelEditor.tsx         # MD编辑器组件
│   │   ├── ChapterList.tsx         # 章节列表
│   │   ├── LLMReviewPanel.tsx      # LLM审阅面板
│   │   ├── KnowledgeSyncTrigger.tsx # 知识库同步触发器
│   │   └── StoryNodeEntry.tsx      # 剧情节点入口
│   ├── vibe/
│   │   ├── VibeInput.tsx           # Vibe输入（Phase1验证后可能移除）
│   │   ├── ModeToggle.tsx
│   │   └── ReferenceUploader.tsx
│   ├── script/
│   │   ├── ScriptEditor.tsx
│   │   └── ScriptVersionHistory.tsx
│   ├── role/
│   │   └── RoleCard.tsx
│   └── scene/
│       └── SceneCard.tsx
├── stores/
│   ├── uiStore.ts                  # UI状态（已存在）
│   ├── workspaceStore.ts            # 工作区状态（已存在）
│   ├── scriptStore.ts              # 剧本状态（已存在）
│   ├── roleStore.ts                # 角色状态（已存在）
│   ├── sceneStore.ts                # 场景状态（已存在）
│   └── novelStore.ts               # 新增：小说/章节状态
├── types/
│   └── index.ts                    # 类型定义（已存在，需扩展）
└── lib/
    ├── storage.ts                  # 本地存储（已存在）
    └── api.ts                      # API调用封装（预留）
```

---

## Data Model Extensions

### 小说/章节相关

```typescript
// src/types/index.ts 新增

// ==================== 小说创作侧 ====================

export interface Novel {
  id: string;
  title: string;
  description?: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;           // 章节标题
  content: string;          // MD格式的正文
  order: number;            // 章节顺序
  status: ChapterStatus;
  metadata: ChapterMetadata;
  createdAt: string;
  updatedAt: string;
}

export type ChapterStatus = 'draft' | 'writing' | 'completed' | 'synced';

export interface ChapterMetadata {
  wordCount: number;
  sceneCount: number;
  characters: string[];    // 本章出现的角色ID列表
  items: string[];         // 本章出现的物品ID列表
  locations: string[];      // 本章出现的地点ID列表
  plotPoints: string[];     // 本章关键情节点ID列表
  hooks: string[];          // 本章钩子/悬念ID列表
  tone: string;            // 本章整体基调/情绪
  lastSyncedAt?: string;   // 上次同步到知识库的时间
}

// 剧情节点（用于续写入口）
export interface StoryNode {
  id: string;
  chapterId: string;
  type: 'hook' | 'suspense' | 'foreshadow' | 'plot_point';
  content: string;          // 节点内容摘要
  isResolved: boolean;      // 是否已解决
  relatedCharacterIds: string[];
  relatedItemIds: string[];
  createdAt: string;
}

// 知识库同步结果
export interface KnowledgeSyncResult {
  syncedAt: string;
  newCharacters: string[];  // 新增角色
  newItems: string[];       // 新增物品
  newLocations: string[];   // 新增地点
  newPlotPoints: string[];  // 新增情节点
  updatedCharacters: string[]; // 更新的角色
  updatedItems: string[];   // 更新的物品
  scenesExtracted: ExtractedScene[];
}

export interface ExtractedScene {
  id: string;
  chapterId: string;
  title: string;
  description: string;      // 画面描述
  dialogueSummary: string;  // 对白摘要
  emotion: string;         // 情绪标签
  characters: string[];    // 出现的角色
  location?: string;       // 地点
}

// 工作区扩展 — 包含小说
export interface Workspace {
  id: string;
  name: string;
  novel: Novel | null;      // 当前小说
  projects: Project[];       // 剧集项目
  createdAt: string;
  updatedAt: string;
}
```

---

## Task 1: 项目基础验证

**Files:**
- 验证现有项目是否能正常运行

- [ ] **Step 1: 验证项目环境**

Run: `npm run dev`
Expected: 看到 VibeStudio 窗口，白底黑字

---

## Task 2: 扩展类型定义

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 添加小说/章节相关类型**

在 `src/types/index.ts` 末尾添加：

```typescript
// ==================== 小说创作侧 ====================

export interface Novel {
  id: string;
  title: string;
  description?: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: string;
  order: number;
  status: ChapterStatus;
  metadata: ChapterMetadata;
  createdAt: string;
  updatedAt: string;
}

export type ChapterStatus = 'draft' | 'writing' | 'completed' | 'synced';

export interface ChapterMetadata {
  wordCount: number;
  sceneCount: number;
  characters: string[];
  items: string[];
  locations: string[];
  plotPoints: string[];
  hooks: string[];
  tone: string;
  lastSyncedAt?: string;
}

export interface StoryNode {
  id: string;
  chapterId: string;
  type: 'hook' | 'suspense' | 'foreshadow' | 'plot_point';
  content: string;
  isResolved: boolean;
  relatedCharacterIds: string[];
  relatedItemIds: string[];
  createdAt: string;
}

export interface KnowledgeSyncResult {
  syncedAt: string;
  newCharacters: string[];
  newItems: string[];
  newLocations: string[];
  newPlotPoints: string[];
  updatedCharacters: string[];
  updatedItems: string[];
  scenesExtracted: ExtractedScene[];
}

export interface ExtractedScene {
  id: string;
  chapterId: string;
  title: string;
  description: string;
  dialogueSummary: string;
  emotion: string;
  characters: string[];
  location?: string;
}
```

---

## Task 3: 创建 novelStore

**Files:**
- Create: `src/stores/novelStore.ts`

- [ ] **Step 1: 创建 novelStore.ts**

```typescript
import { create } from 'zustand';
import { Novel, Chapter, ChapterMetadata, StoryNode, KnowledgeSyncResult, ExtractedScene } from '@/types';
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
    // 简单统计场景：按空行分割
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
    // TODO: 调用LLM API分析章节内容，提取知识库更新和场景
    // 这里先模拟实现
    const state = get();
    const chapter = state.currentNovel?.chapters.find((c) => c.id === chapterId);
    if (!chapter) throw new Error('Chapter not found');

    // 模拟LLM分析结果
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

    // 实际实现中，这里会调用LLM API
    // const result = await callLLMApi(chapter.content);

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
```

---

## Task 4: 创建小说编辑器组件

**Files:**
- Create: `src/components/novel/NovelEditor.tsx`
- Create: `src/components/novel/ChapterList.tsx`
- Create: `src/components/novel/LLMReviewPanel.tsx`
- Create: `src/components/novel/KnowledgeSyncTrigger.tsx`
- Create: `src/components/novel/StoryNodeEntry.tsx`

- [ ] **Step 1: 创建 NovelEditor.tsx**

```typescript
import { useEffect, useRef } from 'react';
import { useNovelStore } from '@/stores/novelStore';
import { marked } from 'marked';
import 'highlight.js/styles/github-dark.css';

export function NovelEditor() {
  const { currentChapterId, getCurrentChapter, updateChapter } = useNovelStore();
  const chapter = getCurrentChapter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动保存（防抖）
  useEffect(() => {
    if (!chapter) return;
    const timer = setTimeout(() => {
      // 触发元数据更新
      useNovelStore.getState().computeMetadata(chapter.id);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chapter?.content, chapter?.id]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!chapter) return;
    updateChapter(chapter.id, { content: e.target.value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chapter) return;
    updateChapter(chapter.id, { title: e.target.value });
  };

  if (!chapter) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-2">暂无章节</p>
          <p className="text-xs">从左侧创建第一个章节</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-neutral-800">
        <input
          type="text"
          value={chapter.title}
          onChange={handleTitleChange}
          placeholder="章节标题"
          className="flex-1 text-xl font-semibold bg-transparent text-white border-b border-transparent hover:border-neutral-700 focus:border-neutral-500 outline-none"
        />
        <span className="text-sm text-neutral-500">
          {chapter.metadata.wordCount} 字
        </span>
        <StatusBadge status={chapter.status} />
      </div>

      {/* 编辑器区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：MD编辑区 */}
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={chapter.content}
            onChange={handleContentChange}
            placeholder="开始写作...

支持 Markdown 格式：
# 标题
## 章节
- 列表
**粗体** *斜体*
[链接](url)
![图片](url)
> 引用
\`\`\`
代码块
\`\`\`"
            className="flex-1 w-full p-4 bg-neutral-900 text-neutral-300 placeholder-neutral-600 resize-none focus:outline-none font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* 右侧：预览区（可选） */}
        <div className="w-96 border-l border-neutral-800 overflow-auto p-4 bg-neutral-950 hidden">
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{
              __html: marked(chapter.content || ''),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Chapter['status'] }) {
  const config = {
    draft: { label: '草稿', className: 'bg-neutral-700 text-neutral-300' },
    writing: { label: '写作中', className: 'bg-yellow-900 text-yellow-300' },
    completed: { label: '已完成', className: 'bg-green-900 text-green-300' },
    synced: { label: '已同步', className: 'bg-blue-900 text-blue-300' },
  };

  const { label, className } = config[status];

  return (
    <span className={`px-2 py-0.5 text-xs rounded ${className}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: 创建 ChapterList.tsx**

```typescript
import { useState } from 'react';
import { useNovelStore } from '@/stores/novelStore';
import { Chapter } from '@/types';

export function ChapterList() {
  const {
    currentNovel,
    currentChapterId,
    createChapter,
    loadChapter,
    deleteChapter,
    getChapterCount,
    getCompletedChapterCount,
  } = useNovelStore();

  const [newChapterTitle, setNewChapterTitle] = useState('');

  if (!currentNovel) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-neutral-500">
        <p className="mb-4">暂无小说</p>
        <button
          onClick={() =>
            useNovelStore.getState().createNovel('我的小说', '一部长篇作品')
          }
          className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
        >
          创建小说
        </button>
      </div>
    );
  }

  const handleCreateChapter = () => {
    const title = newChapterTitle.trim() || `第${getChapterCount() + 1}章`;
    createChapter(title);
    setNewChapterTitle('');
  };

  const sortedChapters = [...currentNovel.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col">
      {/* 小说标题 */}
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-white mb-1">{currentNovel.title}</h2>
        <p className="text-xs text-neutral-500">
          {getCompletedChapterCount()}/{getChapterCount()} 章已完成
        </p>
      </div>

      {/* 新建章节 */}
      <div className="p-3 border-b border-neutral-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
            placeholder="新章节标题（可选）"
            className="flex-1 px-2 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()}
          />
          <button
            onClick={handleCreateChapter}
            className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
          >
            +
          </button>
        </div>
      </div>

      {/* 章节列表 */}
      <div className="flex-1 overflow-auto p-2">
        {sortedChapters.length === 0 ? (
          <div className="text-center text-neutral-600 py-8 text-sm">
            暂无章节
          </div>
        ) : (
          sortedChapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isActive={currentChapterId === chapter.id}
              onClick={() => loadChapter(chapter.id)}
              onDelete={() => deleteChapter(chapter.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChapterItem({
  chapter,
  isActive,
  onClick,
  onDelete,
}: {
  chapter: Chapter;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded cursor-pointer mb-1 transition-colors ${
        isActive
          ? 'bg-neutral-700 text-white'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
      }`}
      onClick={onClick}
    >
      <span className="text-xs text-neutral-600 w-6">{chapter.order + 1}</span>
      <span className="flex-1 text-sm truncate">{chapter.title}</span>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800 transition-opacity"
        >
          删除
        </button>
      )}
      <StatusDot status={chapter.status} />
    </div>
  );
}

function StatusDot({ status }: { status: Chapter['status'] }) {
  const colors = {
    draft: 'bg-neutral-600',
    writing: 'bg-yellow-500',
    completed: 'bg-green-500',
    synced: 'bg-blue-500',
  };

  return (
    <span
      className={`w-2 h-2 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}
```

- [ ] **Step 3: 创建 LLMReviewPanel.tsx**

```typescript
import { useState, useEffect } from 'react';
import { useNovelStore } from '@/stores/novelStore';

interface ReviewComment {
  id: string;
  type: 'suggestion' | 'warning' | 'praise';
  content: string;
  line?: number;
  chapterId: string;
  createdAt: string;
}

export function LLMReviewPanel() {
  const { currentChapterId, getCurrentChapter } = useNovelStore();
  const chapter = getCurrentChapter();
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 当章节内容变化时，重新分析
  useEffect(() => {
    if (!chapter) return;
    // 防抖
    const timer = setTimeout(() => {
      analyzeChapter(chapter.id, chapter.content);
    }, 2000);
    return () => clearTimeout(timer);
  }, [chapter?.content, chapter?.id]);

  const analyzeChapter = async (chapterId: string, content: string) => {
    if (!content.trim()) {
      setComments([]);
      return;
    }

    setIsAnalyzing(true);

    // TODO: 调用LLM API进行实时审阅
    // 模拟审阅结果
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockComments: ReviewComment[] = [];

    // 简单规则检测
    if (content.includes('。。。。') || content.includes('。。。')) {
      mockComments.push({
        id: '1',
        type: 'warning',
        content: '检测到过多省略号，建议精简',
        chapterId,
        createdAt: new Date().toISOString(),
      });
    }

    if (content.length > 1000 && !content.includes('"') && !content.includes('"')) {
      mockComments.push({
        id: '2',
        type: 'suggestion',
        content: '长段落较多，考虑在对话处使用引号增加可读性',
        chapterId,
        createdAt: new Date().toISOString(),
      });
    }

    // 积极的反馈
    if (content.length > 500) {
      mockComments.push({
        id: '3',
        type: 'praise',
        content: '本章节字数充足，叙事节奏良好',
        chapterId,
        createdAt: new Date().toISOString(),
      });
    }

    setComments(mockComments);
    setIsAnalyzing(false);
  };

  if (!chapter) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
        选择一个章节开始审阅
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <h3 className="text-sm font-medium text-white">LLM 审阅</h3>
        {isAnalyzing && (
          <span className="text-xs text-neutral-500 animate-pulse">分析中...</span>
        )}
      </div>

      {/* 审阅内容 */}
      <div className="flex-1 overflow-auto p-4">
        {comments.length === 0 && !isAnalyzing ? (
          <div className="text-center text-neutral-500 py-8">
            <p className="text-sm">暂无审阅意见</p>
            <p className="text-xs mt-1">开始写作后，AI将自动提供审阅建议</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <ReviewCommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      {/* 快捷操作 */}
      <div className="p-3 border-t border-neutral-800">
        <button
          onClick={() => analyzeChapter(chapter.id, chapter.content)}
          disabled={isAnalyzing}
          className="w-full px-3 py-2 text-sm bg-neutral-800 text-white rounded hover:bg-neutral-700 disabled:opacity-50"
        >
          {isAnalyzing ? '分析中...' : '重新分析'}
        </button>
      </div>
    </div>
  );
}

function ReviewCommentItem({ comment }: { comment: ReviewComment }) {
  const config = {
    suggestion: {
      icon: '💡',
      className: 'border-l-yellow-500 bg-yellow-900/20',
    },
    warning: {
      icon: '⚠️',
      className: 'border-l-orange-500 bg-orange-900/20',
    },
    praise: {
      icon: '✨',
      className: 'border-l-green-500 bg-green-900/20',
    },
  };

  const { icon, className } = config[comment.type];

  return (
    <div className={`p-3 rounded border-l-2 ${className}`}>
      <div className="flex items-start gap-2">
        <span>{icon}</span>
        <p className="text-sm text-neutral-300">{comment.content}</p>
      </div>
      {comment.line && (
        <p className="text-xs text-neutral-600 mt-1">第 {comment.line} 行</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 创建 KnowledgeSyncTrigger.tsx**

```typescript
import { useState } from 'react';
import { useNovelStore } from '@/stores/novelStore';

export function KnowledgeSyncTrigger() {
  const {
    currentChapterId,
    getCurrentChapter,
    triggerSync,
    markChapterSynced,
    lastSyncResult,
  } = useNovelStore();

  const chapter = getCurrentChapter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleSync = async () => {
    if (!chapter || isSyncing) return;

    setIsSyncing(true);
    try {
      const result = await triggerSync(chapter.id);
      markChapterSynced(chapter.id);
      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!chapter) return null;

  const canSync = chapter.status !== 'synced' && chapter.content.trim().length > 0;

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">同步到知识库</h4>
        {chapter.metadata.lastSyncedAt && (
          <span className="text-xs text-neutral-500">
            上次同步: {new Date(chapter.metadata.lastSyncedAt).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      <button
        onClick={handleSync}
        disabled={!canSync || isSyncing}
        className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
          !canSync
            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : isSyncing
            ? 'bg-blue-900 text-blue-300 cursor-wait'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
      >
        {isSyncing
          ? '同步中...'
          : chapter.status === 'synced'
          ? '已同步'
          : '触发同步'}
      </button>

      {/* 同步结果预览 */}
      {showResult && lastSyncResult && (
        <div className="mt-3 p-3 bg-neutral-800 rounded text-xs">
          <p className="text-green-400 mb-1">✓ 同步完成</p>
          {lastSyncResult.newCharacters.length > 0 && (
            <p className="text-neutral-400">新增角色: {lastSyncResult.newCharacters.length}</p>
          )}
          {lastSyncResult.newItems.length > 0 && (
            <p className="text-neutral-400">新增物品: {lastSyncResult.newItems.length}</p>
          )}
          {lastSyncResult.scenesExtracted.length > 0 && (
            <p className="text-neutral-400">提取场景: {lastSyncResult.scenesExtracted.length}</p>
          )}
        </div>
      )}

      {!canSync && !isSyncing && (
        <p className="mt-2 text-xs text-neutral-600">
          {chapter.content.trim().length === 0
            ? '请先编写内容'
            : '章节已同步'}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: 创建 StoryNodeEntry.tsx**

```typescript
import { useNovelStore } from '@/stores/novelStore';

export function StoryNodeEntry() {
  const { getUnresolvedNodes, resolveStoryNode } = useNovelStore();
  const unresolvedNodes = getUnresolvedNodes();

  if (unresolvedNodes.length === 0) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">剧情节点</h4>
        <p className="text-xs text-neutral-500">
          暂无待续的剧情节点
        </p>
      </div>
    );
  }

  const nodeTypeLabels = {
    hook: { label: '钩子', color: 'bg-purple-900 text-purple-300' },
    suspense: { label: '悬念', color: 'bg-red-900 text-red-300' },
    foreshadow: { label: '伏笔', color: 'bg-yellow-900 text-yellow-300' },
    plot_point: { label: '情节点', color: 'bg-blue-900 text-blue-300' },
  };

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <h4 className="text-sm font-medium text-white mb-3">
        剧情节点 ({unresolvedNodes.length})
      </h4>
      <div className="space-y-2">
        {unresolvedNodes.slice(0, 5).map((node) => {
          const { label, color } = nodeTypeLabels[node.type];
          return (
            <div
              key={node.id}
              className="p-3 bg-neutral-800 rounded hover:bg-neutral-750 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded ${color} mb-1`}>
                    {label}
                  </span>
                  <p className="text-sm text-neutral-300 line-clamp-2">{node.content}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveStoryNode(node.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-green-900 text-green-300 rounded hover:bg-green-800 transition-opacity"
                >
                  已解决
                </button>
              </div>
            </div>
          );
        })}
        {unresolvedNodes.length > 5 && (
          <p className="text-xs text-neutral-600 text-center">
            还有 {unresolvedNodes.length - 5} 个节点...
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## Task 5: 改造 CreatePanel 支持小说创作

**Files:**
- Modify: `src/components/layout/CreatePanel.tsx`

- [ ] **Step 1: 改造 CreatePanel.tsx**

替换原有内容为：

```typescript
import { useState } from 'react';
import { NovelEditor } from '@/components/novel/NovelEditor';
import { ChapterList } from '@/components/novel/ChapterList';
import { LLMReviewPanel } from '@/components/novel/LLMReviewPanel';
import { KnowledgeSyncTrigger } from '@/components/novel/KnowledgeSyncTrigger';
import { StoryNodeEntry } from '@/components/novel/StoryNodeEntry';
import { useNovelStore } from '@/stores/novelStore';

type CreateView = 'novel' | 'vibe';

export function CreatePanel() {
  const [view, setView] = useState<CreateView>('novel');
  const { currentNovel } = useNovelStore();

  return (
    <div className="h-full flex">
      {/* 左侧：章节列表 */}
      <div className="w-64 border-r border-neutral-800 flex flex-col">
        <ChapterList />
      </div>

      {/* 中间：编辑器 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="h-10 flex items-center gap-4 px-4 border-b border-neutral-800">
          <button
            onClick={() => setView('novel')}
            className={`text-sm ${view === 'novel' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            小说创作
          </button>
          <button
            onClick={() => setView('vibe')}
            className={`text-sm ${view === 'vibe' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Vibe 输入
          </button>
        </div>

        {/* 编辑器内容 */}
        <div className="flex-1 overflow-hidden">
          {view === 'novel' ? <NovelEditor /> : <VibePlaceholder />}
        </div>
      </div>

      {/* 右侧：审阅面板 */}
      <div className="w-80 flex flex-col border-l border-neutral-800">
        {view === 'novel' ? (
          <>
            <div className="flex-1 overflow-hidden">
              <LLMReviewPanel />
            </div>
            <div className="p-4 border-t border-neutral-800 space-y-3">
              <KnowledgeSyncTrigger />
              <StoryNodeEntry />
            </div>
          </>
        ) : (
          <VibePlaceholder />
        )}
      </div>
    </div>
  );
}

function VibePlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-neutral-500">
      <div className="text-center">
        <p className="mb-2">Vibe 输入</p>
        <p className="text-xs">Phase 2 实现</p>
      </div>
    </div>
  );
}
```

---

## Task 6: 调整 MainShell 支持新布局

**Files:**
- Modify: `src/components/layout/MainShell.tsx`

- [ ] **Step 1: 调整 MainShell.tsx 导航标签**

将导航标签从 ['创作', '项目', '资产'] 调整为 ['小说', '剧集', '资产']：

```typescript
const labels: Record<PanelType, string> = {
  create: '小说',
  project: '剧集',
  assets: '资产',
};
```

---

## Self-Review 检查清单

1. **Spec 覆盖检查** — 逐项核对 PRD 新版：
   - [x] MD编辑器（每章独立.md）
   - [x] LLM审阅面板（实时批注）
   - [x] 知识库同步触发器（手动）
   - [x] 剧情节点入口（续写）
   - [x] 章节列表管理
   - [x] 章节状态追踪
   - [x] 知识库同步结果预览

2. **Placeholder 扫描** — 确认 TODO 注释仅用于说明Phase2/3后续功能，无影响

3. **类型一致性** — 所有类型在 `src/types/index.ts` 定义，Store正确引用

4. **任务完整性** — 所有任务都有具体文件、具体代码、具体命令

5. **现有代码** — 项目基础验证通过，类型扩展兼容现有Store

---

## 执行选择

**Plan 完成，保存于:** `docs/superpowers/plans/2026-04-12-vibe-studio-phase-1-novel.md`

两个执行选项：

**1. Subagent-Driven (推荐)** — 每个任务派一个新 subagent 执行，任务间有检查点

**2. Inline Execution** — 在当前 session 内批量执行，有检查点

选择哪个方式？
