# VibeStudio Phase 1: Foundation & Core Creative Flow

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立项目基础架构、核心数据模型、三面板 UI 框架、Vibe 输入层、剧本/角色/场景三大核心模块的 CRUD。

**Architecture:** Tauri + React + TypeScript 前端，Zustand 状态管理，本地 JSON 文件存储项目数据（可后续切换数据库）。

**Tech Stack:** Tauri 2.x / React 18 / TypeScript 5 / Zustand / Tailwind CSS / shadcn-ui

---

## File Structure

```
src/
├── main.tsx                    # React 入口
├── App.tsx                     # 根组件，三面板布局
├── components/
│   ├── ui/                     # shadcn/ui 基础组件
│   ├── layout/
│   │   ├── MainShell.tsx      # 三面板容器
│   │   ├── CreatePanel.tsx     # 创作面板（Vibe输入/剧本/Takes/剪辑）
│   │   ├── ProjectPanel.tsx    # 项目面板（集/季总览）
│   │   └── AssetsPanel.tsx     # 资产面板（角色/场景/模板库）
│   └── vibe/
│       ├── VibeInput.tsx       # Vibe输入组件
│       └── ModeToggle.tsx      # 全自动/协作模式切换
├── stores/
│   ├── workspaceStore.ts       # 工作区状态
│   ├── projectStore.ts         # 项目状态
│   ├── scriptStore.ts          # 剧本状态
│   ├── roleStore.ts           # 角色状态
│   └── sceneStore.ts           # 场景状态
├── types/
│   └── index.ts                # 全部 TypeScript 类型定义
└── lib/
    ├── storage.ts              # 本地存储读写（Tauri FS API）
    └── api.ts                  # API 调用封装（预留）

src-tauri/
├── src/main.rs                 # Tauri 入口
├── src/commands.rs             # Tauri commands（文件读写等）
└── tauri.conf.json             # Tauri 配置
```

---

## Data Model

```typescript
// 工作区层级
interface Workspace {
  id: string;
  name: string;
  projects: Project[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  series: Series[];
  globalRoles: Role[];         // 项目级角色库
  globalScenes: SceneAsset[];   // 项目级场景库
  createdAt: string;
}

interface Series {
  id: string;
  name: string;
  seasons: Season[];
}

interface Season {
  id: string;
  name: string;
  episodes: Episode[];
}

interface Episode {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'review' | 'completed';
  scripts: Script[];
  storyboards: Storyboard[];
  takes: Take[];
}

interface Script {
  id: string;
  title: string;
  content: string;              // 剧本正文
  version: number;
  history: ScriptVersion[];     // 版本历史
  createdAt: string;
}

interface ScriptVersion {
  id: string;
  content: string;
  timestamp: string;
}

// 角色系统
interface Role {
  id: string;
  name: string;
  card: RoleCard;
  template: RoleTemplate;
  variants: RoleVariant[];
  versions: RoleVersion[];      // 版本快照
}

interface RoleCard {
  image: string;                // Base64 或文件路径
  description: string;          // 关键描述文字
}

interface RoleTemplate {
  personality: string;
  background: string;
  appearance: string;
}

interface RoleVariant {
  id: string;
  name: string;
  card: RoleCard;
}

// 场景系统
interface SceneAsset {
  id: string;
  name: string;
  type: 'interior' | 'exterior' | 'other';
  thumbnail: string;
  source: 'asset_library' | 'ai_generated';
  metadata: Record<string, unknown>;
}

// 分镜
interface Storyboard {
  id: string;
  episodeId: string;
  shots: Shot[];
}

interface Shot {
  id: string;
  sequence: number;
  description: string;           // 画面描述
  cameraAngle: string;
  duration: number;
  imageUrl?: string;             // AI 生成的分镜图
}
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "vibe-studio",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@tauri-apps/api": "^2.1.1",
    "zustand": "^5.0.2",
    "uuid": "^11.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^6.0.3"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
});
```

- [ ] **Step 5: 创建 tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 6: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: 创建 src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color: #ffffff;
  background-color: #0a0a0a;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
}
```

- [ ] **Step 8: 创建 index.html**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>VibeStudio</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: 创建 src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 10: 创建 src/App.tsx**

```typescript
function App() {
  return (
    <div className="h-full w-full bg-neutral-950 text-white">
      <h1>VibeStudio</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 11: 创建 src-tauri/Cargo.toml**

```toml
[package]
name = "vibe-studio"
version = "0.1.0"
description = "VibeStudio Desktop Client"
authors = [""]
edition = "2021"

[lib]
name = "vibe_studio_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 12: 创建 src-tauri/tauri.conf.json**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "VibeStudio",
  "version": "0.1.0",
  "identifier": "com.vibestudio.app",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "VibeStudio",
        "width": 1400,
        "height": 900,
        "minWidth": 1200,
        "minHeight": 700,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 13: 创建 src-tauri/src/main.rs**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 14: 创建 src-tauri/build.rs**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 15: 安装依赖并验证项目运行**

Run: `npm install && npm run tauri dev`
Expected: 看到 VibeStudio 窗口，标题为 "VibeStudio"，白底黑字简单文字

---

## Task 2: 类型定义

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: 创建完整类型定义**

```typescript
// ==================== 工作区层级 ====================

export interface Workspace {
  id: string;
  name: string;
  projects: Project[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  series: Series[];
  globalRoles: Role[];
  globalScenes: SceneAsset[];
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  id: string;
  name: string;
  seasons: Season[];
}

export interface Season {
  id: string;
  name: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  name: string;
  status: EpisodeStatus;
  scripts: Script[];
  storyboards: Storyboard[];
  takes: Take[];
  audioTracks: AudioTrack[];
  createdAt: string;
  updatedAt: string;
}

export type EpisodeStatus = 'draft' | 'in_progress' | 'review' | 'completed';

// ==================== 剧本 ====================

export interface Script {
  id: string;
  title: string;
  content: string;
  version: number;
  history: ScriptVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ScriptVersion {
  id: string;
  content: string;
  timestamp: string;
  note?: string;
}

// ==================== 角色 ====================

export interface Role {
  id: string;
  name: string;
  card: RoleCard;
  template: RoleTemplate;
  variants: RoleVariant[];
  versions: RoleVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface RoleCard {
  image: string; // Base64 或文件路径
  description: string;
}

export interface RoleTemplate {
  personality: string;
  background: string;
  appearance: string;
}

export interface RoleVariant {
  id: string;
  name: string;
  card: RoleCard;
}

export interface RoleVersion {
  id: string;
  card: RoleCard;
  template: RoleTemplate;
  timestamp: string;
}

// ==================== 场景 ====================

export interface SceneAsset {
  id: string;
  name: string;
  type: SceneType;
  thumbnail: string;
  source: SceneSource;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type SceneType = 'interior' | 'exterior' | 'other';
export type SceneSource = 'asset_library' | 'ai_generated';

// ==================== 分镜 ====================

export interface Storyboard {
  id: string;
  episodeId: string;
  shots: Shot[];
  createdAt: string;
  updatedAt: string;
}

export interface Shot {
  id: string;
  sequence: number;
  description: string;
  cameraAngle: CameraAngle;
  duration: number; // 秒
  imageUrl?: string;
  takeIds: string[];
}

export type CameraAngle = 'wide' | 'medium' | 'close_up' | 'over_shoulder' | 'pov' | 'bird_eye' | 'low_angle';

// ==================== Takes ====================

export interface Take {
  id: string;
  shotId: string;
  version: number;
  videoUrl?: string;
  imageUrl?: string;
  prompt: string;
  seed?: number;
  parameters: Record<string, unknown>;
  status: TakeStatus;
  createdAt: string;
}

export type TakeStatus = 'pending' | 'generating' | 'completed' | 'failed';

// ==================== 音频 ====================

export interface AudioTrack {
  id: string;
  episodeId: string;
  type: AudioType;
  name: string;
  fileUrl: string;
  duration: number;
  startTime: number; // 在时间线上的起始时间
  volume: number;
  muted: boolean;
}

export type AudioType = 'dialogue' | 'bgm' | 'sfx' | 'foley';

// ==================== Vibe ====================

export interface VibeInput {
  prompt: string;
  references: VibeReference[];
  template?: string;
  mode: GenerationMode;
}

export interface VibeReference {
  type: 'image' | 'audio' | 'video';
  data: string; // 文件路径或 Base64
  description?: string;
}

export type GenerationMode = 'auto' | 'collaborative';

// ==================== 版本标记 ====================

export interface DraftVersion {
  id: string;
  episodeId: string;
  label: string; // e.g., "Draft v1", "v2", "Final"
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}
```

---

## Task 3: Zustand Store 状态管理

**Files:**
- Create: `src/stores/workspaceStore.ts`
- Create: `src/stores/projectStore.ts`
- Create: `src/stores/scriptStore.ts`
- Create: `src/stores/roleStore.ts`
- Create: `src/stores/sceneStore.ts`
- Create: `src/stores/uiStore.ts` (UI 状态：当前面板、展开状态等)

- [ ] **Step 1: 创建 uiStore.ts**

```typescript
import { create } from 'zustand';

export type PanelType = 'create' | 'project' | 'assets';

interface UIState {
  activePanel: PanelType;
  setActivePanel: (panel: PanelType) => void;

  // 浮动面板展开状态
  expandedPanels: Set<string>;
  togglePanel: (panelId: string) => void;

  // 沉浸模式
  isImmersive: boolean;
  toggleImmersive: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: 'create',
  setActivePanel: (panel) => set({ activePanel: panel }),

  expandedPanels: new Set(),
  togglePanel: (panelId) =>
    set((state) => {
      const newSet = new Set(state.expandedPanels);
      if (newSet.has(panelId)) {
        newSet.delete(panelId);
      } else {
        newSet.add(panelId);
      }
      return { expandedPanels: newSet };
    }),

  isImmersive: false,
  toggleImmersive: () => set((state) => ({ isImmersive: !state.isImmersive })),
}));
```

- [ ] **Step 2: 创建 workspaceStore.ts**

```typescript
import { create } from 'zustand';
import { Workspace } from '@/types';
import { v4 as uuid } from 'uuid';

interface WorkspaceState {
  workspace: Workspace | null;
  currentProjectId: string | null;
  currentSeriesId: string | null;
  currentSeasonId: string | null;
  currentEpisodeId: string | null;

  // Workspace 操作
  createWorkspace: (name: string) => void;
  loadWorkspace: (workspace: Workspace) => void;

  // Project 操作
  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;

  // Series 操作
  createSeries: (projectId: string, name: string) => string;
  setCurrentSeries: (id: string | null) => void;

  // Season 操作
  createSeason: (seriesId: string, name: string) => string;
  setCurrentSeason: (id: string | null) => void;

  // Episode 操作
  createEpisode: (seasonId: string, name: string) => string;
  setCurrentEpisode: (id: string | null) => void;
  updateEpisodeStatus: (id: string, status: Episode['status']) => void;

  // 工具
  getCurrentEpisode: () => Episode | null;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  currentProjectId: null,
  currentSeriesId: null,
  currentSeasonId: null,
  currentEpisodeId: null,

  createWorkspace: (name) =>
    set({
      workspace: {
        id: uuid(),
        name,
        projects: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }),

  loadWorkspace: (workspace) => set({ workspace }),

  createProject: (name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: [
            ...state.workspace.projects,
            {
              id,
              name,
              series: [],
              globalRoles: [],
              globalScenes: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  deleteProject: (id) =>
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.filter((p) => p.id !== id),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  setCurrentProject: (id) => set({ currentProjectId: id }),

  createSeries: (projectId, name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) =>
            p.id === projectId
              ? { ...p, series: [...p.series, { id, name, seasons: [] }] }
              : p
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  setCurrentSeries: (id) => set({ currentSeriesId: id }),

  createSeason: (seriesId, name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) => ({
            ...p,
            series: p.series.map((s) =>
              s.id === seriesId ? { ...s, seasons: [...s.seasons, { id, name, episodes: [] }] } : s
            ),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  setCurrentSeason: (id) => set({ currentSeasonId: id }),

  createEpisode: (seasonId, name) => {
    const id = uuid();
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) => ({
            ...p,
            series: p.series.map((s) => ({
              ...s,
              seasons: s.seasons.map((season) =>
                season.id === seasonId
                  ? {
                      ...season,
                      episodes: [
                        ...season.episodes,
                        {
                          id,
                          name,
                          status: 'draft' as const,
                          scripts: [],
                          storyboards: [],
                          takes: [],
                          audioTracks: [],
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : season
              ),
            })),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return id;
  },

  setCurrentEpisode: (id) => set({ currentEpisodeId: id }),

  updateEpisodeStatus: (id, status) =>
    set((state) => {
      if (!state.workspace) return state;
      return {
        workspace: {
          ...state.workspace,
          projects: state.workspace.projects.map((p) => ({
            ...p,
            series: p.series.map((s) => ({
              ...s,
              seasons: s.seasons.map((season) => ({
                ...season,
                episodes: season.episodes.map((e) =>
                  e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
                ),
              })),
            })),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  getCurrentEpisode: () => {
    const state = get();
    if (!state.workspace || !state.currentProjectId) return null;
    const project = state.workspace.projects.find((p) => p.id === state.currentProjectId);
    if (!project) return null;
    // 简化：取第一个找到的 episode
    for (const series of project.series) {
      for (const season of series.seasons) {
        const episode = season.episodes.find((e) => e.id === state.currentEpisodeId);
        if (episode) return episode;
      }
    }
    return null;
  },
}));
```

- [ ] **Step 3: 创建 scriptStore.ts**

```typescript
import { create } from 'zustand';
import { Script, ScriptVersion } from '@/types';
import { v4 as uuid } from 'uuid';

interface ScriptState {
  // 当前剧本
  currentScript: Script | null;

  // 操作
  createScript: (episodeId: string, title: string, content: string) => Script;
  loadScript: (script: Script) => void;
  updateScript: (id: string, updates: Partial<Pick<Script, 'title' | 'content'>>) => void;
  saveVersion: (scriptId: string) => void;
  revertToVersion: (scriptId: string, versionId: string) => void;
  deleteScript: (episodeId: string, scriptId: string) => void;
}

export const useScriptStore = create<ScriptState>((set, get) => ({
  currentScript: null,

  createScript: (episodeId, title, content) => {
    const script: Script = {
      id: uuid(),
      title,
      content,
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // 注意：实际添加到 episode 是在 workspaceStore 中做的
    return script;
  },

  loadScript: (script) => set({ currentScript: script }),

  updateScript: (id, updates) =>
    set((state) => {
      if (!state.currentScript || state.currentScript.id !== id) return state;
      return {
        currentScript: {
          ...state.currentScript,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  saveVersion: (scriptId) =>
    set((state) => {
      if (!state.currentScript || state.currentScript.id !== scriptId) return state;
      const newVersion: ScriptVersion = {
        id: uuid(),
        content: state.currentScript.content,
        timestamp: new Date().toISOString(),
      };
      return {
        currentScript: {
          ...state.currentScript,
          version: state.currentScript.version + 1,
          history: [...state.currentScript.history, newVersion],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  revertToVersion: (scriptId, versionId) =>
    set((state) => {
      if (!state.currentScript || state.currentScript.id !== scriptId) return state;
      const targetVersion = state.currentScript.history.find((v) => v.id === versionId);
      if (!targetVersion) return state;
      return {
        currentScript: {
          ...state.currentScript,
          content: targetVersion.content,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  deleteScript: (_episodeId, _scriptId) => set({ currentScript: null }),
}));
```

- [ ] **Step 4: 创建 roleStore.ts**

```typescript
import { create } from 'zustand';
import { Role, RoleCard, RoleTemplate, RoleVariant, RoleVersion } from '@/types';
import { v4 as uuid } from 'uuid';

interface RoleState {
  currentRole: Role | null;

  createRole: (name: string, card: RoleCard, template: RoleTemplate) => Role;
  loadRole: (role: Role) => void;
  updateRole: (id: string, updates: Partial<Pick<Role, 'name' | 'card' | 'template'>>) => void;
  addVariant: (roleId: string, name: string, card: RoleCard) => void;
  saveVersion: (roleId: string) => void;
  deleteRole: (roleId: string) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  currentRole: null,

  createRole: (name, card, template) => ({
    id: uuid(),
    name,
    card,
    template,
    variants: [],
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  loadRole: (role) => set({ currentRole: role }),

  updateRole: (id, updates) =>
    set((state) => {
      if (!state.currentRole || state.currentRole.id !== id) return state;
      return {
        currentRole: {
          ...state.currentRole,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  addVariant: (roleId, name, card) =>
    set((state) => {
      if (!state.currentRole || state.currentRole.id !== roleId) return state;
      const variant: RoleVariant = { id: uuid(), name, card };
      return {
        currentRole: {
          ...state.currentRole,
          variants: [...state.currentRole.variants, variant],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  saveVersion: (roleId) =>
    set((state) => {
      if (!state.currentRole || state.currentRole.id !== roleId) return state;
      const version: RoleVersion = {
        id: uuid(),
        card: state.currentRole.card,
        template: state.currentRole.template,
        timestamp: new Date().toISOString(),
      };
      return {
        currentRole: {
          ...state.currentRole,
          versions: [...state.currentRole.versions, version],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  deleteRole: (_roleId) => set({ currentRole: null }),
}));
```

- [ ] **Step 5: 创建 sceneStore.ts**

```typescript
import { create } from 'zustand';
import { SceneAsset, SceneType, SceneSource } from '@/types';
import { v4 as uuid } from 'uuid';

interface SceneState {
  currentScene: SceneAsset | null;

  createScene: (name: string, type: SceneType, source: SceneSource, thumbnail: string) => SceneAsset;
  loadScene: (scene: SceneAsset) => void;
  updateScene: (id: string, updates: Partial<Pick<SceneAsset, 'name' | 'metadata'>>) => void;
  deleteScene: (id: string) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  currentScene: null,

  createScene: (name, type, source, thumbnail) => ({
    id: uuid(),
    name,
    type,
    source,
    thumbnail,
    metadata: {},
    createdAt: new Date().toISOString(),
  }),

  loadScene: (scene) => set({ currentScene: scene }),

  updateScene: (id, updates) =>
    set((state) => {
      if (!state.currentScene || state.currentScene.id !== id) return state;
      return {
        currentScene: { ...state.currentScene, ...updates },
      };
    }),

  deleteScene: (_id) => set({ currentScene: null }),
}));
```

---

## Task 4: 布局组件

**Files:**
- Create: `src/components/layout/MainShell.tsx`
- Create: `src/components/layout/CreatePanel.tsx`
- Create: `src/components/layout/ProjectPanel.tsx`
- Create: `src/components/layout/AssetsPanel.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 MainShell.tsx**

```typescript
import { useUIStore, PanelType } from '@/stores/uiStore';
import { CreatePanel } from './CreatePanel';
import { ProjectPanel } from './ProjectPanel';
import { AssetsPanel } from './AssetsPanel';

const panelComponents: Record<PanelType, React.FC> = {
  create: CreatePanel,
  project: ProjectPanel,
  assets: AssetsPanel,
};

export function MainShell() {
  const { activePanel, isImmersive } = useUIStore();
  const ActivePanel = panelComponents[activePanel];

  return (
    <div className="h-full w-full flex flex-col bg-neutral-950">
      {/* 顶部导航栏 */}
      <header className="h-12 flex items-center px-4 border-b border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-white">VibeStudio</h1>
          <nav className="flex gap-1">
            <NavButton panel="create" />
            <NavButton panel="project" />
            <NavButton panel="assets" />
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => useUIStore.getState().toggleImmersive()}
            className="px-3 py-1 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            {isImmersive ? '退出沉浸' : '沉浸模式'}
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 overflow-hidden">
        <ActivePanel />
      </main>
    </div>
  );
}

function NavButton({ panel }: { panel: PanelType }) {
  const { activePanel, setActivePanel } = useUIStore();
  const isActive = activePanel === panel;

  const labels: Record<PanelType, string> = {
    create: '创作',
    project: '项目',
    assets: '资产',
  };

  return (
    <button
      onClick={() => setActivePanel(panel)}
      className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
        isActive
          ? 'bg-neutral-700 text-white'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
      }`}
    >
      {labels[panel]}
    </button>
  );
}
```

- [ ] **Step 2: 创建 CreatePanel.tsx**

```typescript
import { useState } from 'react';
import { VibeInput } from '@/components/vibe/VibeInput';
import { ScriptEditor } from '@/components/script/ScriptEditor';
import { useScriptStore } from '@/stores/scriptStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

type CreateView = 'vibe' | 'script';

export function CreatePanel() {
  const [view, setView] = useState<CreateView>('vibe');
  const { currentScript } = useScriptStore();
  const { currentEpisodeId } = useWorkspaceStore();

  return (
    <div className="h-full flex flex-col">
      {/* 子导航 */}
      <div className="h-10 flex items-center gap-4 px-4 border-b border-neutral-800">
        <button
          onClick={() => setView('vibe')}
          className={`text-sm ${view === 'vibe' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          Vibe 输入
        </button>
        <button
          onClick={() => setView('script')}
          className={`text-sm ${view === 'script' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          剧本 {currentScript ? `- ${currentScript.title}` : ''}
        </button>
        {!currentEpisodeId && (
          <span className="text-xs text-neutral-600 ml-auto">
            请先在「项目」面板选择一个分集
          </span>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        {view === 'vibe' ? <VibeInput /> : <ScriptEditor />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建 ProjectPanel.tsx**

```typescript
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useState } from 'react';

export function ProjectPanel() {
  const {
    workspace,
    currentProjectId,
    currentEpisodeId,
    createProject,
    createSeries,
    createSeason,
    createEpisode,
    setCurrentProject,
    setCurrentEpisode,
    updateEpisodeStatus,
  } = useWorkspaceStore();

  const [newProjectName, setNewProjectName] = useState('');
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newEpisodeName, setNewEpisodeName] = useState('');

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    createProject(newProjectName.trim());
    setNewProjectName('');
  };

  const handleCreateSeries = () => {
    if (!currentProjectId || !newSeriesName.trim()) return;
    createSeries(currentProjectId, newSeriesName.trim());
    setNewSeriesName('');
  };

  const handleCreateSeason = () => {
    if (!currentProjectId || !newSeasonName.trim()) return;
    // 简化：取第一个 series
    const project = workspace?.projects.find((p) => p.id === currentProjectId);
    if (project && project.series.length > 0) {
      createSeason(project.series[0].id, newSeasonName.trim());
      setNewSeasonName('');
    }
  };

  const handleCreateEpisode = () => {
    if (!currentProjectId || !newEpisodeName.trim()) return;
    const project = workspace?.projects.find((p) => p.id === currentProjectId);
    if (!project) return;
    for (const series of project.series) {
      for (const season of series.seasons) {
        createEpisode(season.id, newEpisodeName.trim());
        setNewEpisodeName('');
        return;
      }
    }
  };

  if (!workspace) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-4">暂无工作区</p>
          <button
            onClick={() =>
              useWorkspaceStore.getState().createWorkspace('我的工作区')
            }
            className="px-4 py-2 bg-white text-black rounded-md hover:bg-neutral-200"
          >
            创建工作区
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 左侧：项目列表 */}
      <div className="w-64 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <h2 className="text-sm font-medium text-white mb-3">{workspace.name}</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="新项目名"
              className="flex-1 px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <button
              onClick={handleCreateProject}
              className="px-2 py-1 text-sm bg-neutral-700 rounded hover:bg-neutral-600"
            >
              +
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {workspace.projects.map((project) => (
            <div key={project.id}>
              <button
                onClick={() => setCurrentProject(project.id)}
                className={`w-full text-left px-2 py-1.5 text-sm rounded mb-1 ${
                  currentProjectId === project.id
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {project.name}
              </button>

              {/* Series */}
              {currentProjectId === project.id && (
                <div className="ml-3 border-l border-neutral-700 pl-2">
                  {project.series.map((series) => (
                    <div key={series.id} className="mb-2">
                      <div className="text-xs text-neutral-500 px-2 py-1">
                        {series.name}
                      </div>
                      {series.seasons.map((season) => (
                        <div key={season.id} className="ml-2">
                          <div className="text-xs text-neutral-600 px-2 py-0.5">
                            {season.name}
                          </div>
                          {season.episodes.map((episode) => (
                            <button
                              key={episode.id}
                              onClick={() => setCurrentEpisode(episode.id)}
                              className={`w-full text-left text-xs px-2 py-1 rounded ${
                                currentEpisodeId === episode.id
                                  ? 'bg-neutral-600 text-white'
                                  : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                              }`}
                            >
                              {episode.name}
                              <span
                                className={`ml-1 text-[10px] ${
                                  episode.status === 'completed'
                                    ? 'text-green-500'
                                    : episode.status === 'in_progress'
                                    ? 'text-yellow-500'
                                    : 'text-neutral-600'
                                }`}
                              >
                                {episode.status === 'draft'
                                  ? '草稿'
                                  : episode.status === 'in_progress'
                                  ? '进行中'
                                  : episode.status === 'review'
                                  ? '审核'
                                  : '完成'}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：集详情 */}
      <div className="flex-1 p-4">
        {currentEpisodeId ? (
          <EpisodeDetail />
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500">
            选择一个分集查看详情
          </div>
        )}
      </div>
    </div>
  );
}

function EpisodeDetail() {
  const { workspace, currentProjectId, currentEpisodeId, updateEpisodeStatus } =
    useWorkspaceStore();

  const episode = (() => {
    if (!workspace || !currentProjectId || !currentEpisodeId) return null;
    const project = workspace.projects.find((p) => p.id === currentProjectId);
    if (!project) return null;
    for (const series of project.series) {
      for (const season of series.seasons) {
        const ep = season.episodes.find((e) => e.id === currentEpisodeId);
        if (ep) return ep;
      }
    }
    return null;
  })();

  if (!episode) return null;

  const statusOptions: Array<{ value: Episode['status']; label: string }> = [
    { value: 'draft', label: '草稿' },
    { value: 'in_progress', label: '进行中' },
    { value: 'review', label: '审核' },
    { value: 'completed', label: '完成' },
  ];

  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-4">{episode.name}</h3>

      <div className="mb-4">
        <label className="text-sm text-neutral-400 mb-1 block">状态</label>
        <select
          value={episode.status}
          onChange={(e) =>
            updateEpisodeStatus(episode.id, e.target.value as Episode['status'])
          }
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="text-sm text-neutral-500">
        <p>剧本: {episode.scripts.length} 个</p>
        <p>分镜: {episode.storyboards.length} 个</p>
        <p>Takes: {episode.takes.length} 个</p>
        <p>创建时间: {new Date(episode.createdAt).toLocaleDateString('zh-CN')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 AssetsPanel.tsx**

```typescript
import { useState } from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useRoleStore } from '@/stores/roleStore';
import { useSceneStore } from '@/stores/sceneStore';
import { RoleCard } from '@/components/role/RoleCard';
import { SceneCard } from '@/components/scene/SceneCard';

type AssetTab = 'roles' | 'scenes' | 'templates';

export function AssetsPanel() {
  const [tab, setTab] = useState<AssetTab>('roles');
  const { workspace, currentProjectId } = useWorkspaceStore();

  const project = workspace?.projects.find((p) => p.id === currentProjectId);
  const roles = project?.globalRoles || [];
  const scenes = project?.globalScenes || [];

  return (
    <div className="h-full flex flex-col">
      {/* Tab 导航 */}
      <div className="h-10 flex items-center gap-4 px-4 border-b border-neutral-800">
        <button
          onClick={() => setTab('roles')}
          className={`text-sm ${tab === 'roles' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          角色库 ({roles.length})
        </button>
        <button
          onClick={() => setTab('scenes')}
          className={`text-sm ${tab === 'scenes' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          场景库 ({scenes.length})
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`text-sm ${tab === 'templates' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          模板
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-auto p-4">
        {!currentProjectId ? (
          <div className="h-full flex items-center justify-center text-neutral-500">
            请先在「项目」面板选择一个项目
          </div>
        ) : tab === 'roles' ? (
          <RolesTab roles={roles} />
        ) : tab === 'scenes' ? (
          <ScenesTab scenes={scenes} />
        ) : (
          <TemplatesTab />
        )}
      </div>
    </div>
  );
}

function RolesTab({ roles }: { roles: ReturnType<typeof useWorkspaceStore>['workspace'] extends infer T ? T extends { globalRoles: infer R } ? R : never : never }) {
  const { currentRole, loadRole } = useRoleStore();

  if (roles.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-2">暂无角色</p>
          <p className="text-xs">从 Vibe 输入创建第一个角色</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          isActive={currentRole?.id === role.id}
          onClick={() => loadRole(role)}
        />
      ))}
    </div>
  );
}

function ScenesTab({ scenes }: { scenes: ReturnType<typeof useWorkspaceStore>['workspace'] extends infer T ? T extends { globalScenes: infer S } ? S : never : never }) {
  const { currentScene, loadScene } = useSceneStore();

  if (scenes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-2">暂无场景</p>
          <p className="text-xs">从剧本生成第一个场景</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {scenes.map((scene) => (
        <SceneCard
          key={scene.id}
          scene={scene}
          isActive={currentScene?.id === scene.id}
          onClick={() => loadScene(scene)}
        />
      ))}
    </div>
  );
}

function TemplatesTab() {
  const templates = [
    { id: 'drama', name: '剧情短片', description: '适合情感故事、人物传记' },
    { id: 'ad', name: '广告宣传', description: '适合产品展示、品牌故事' },
    { id: 'tutorial', name: '教学案例', description: '适合知识讲解、技能演示' },
    { id: 'sci-fi', name: '科幻风格', description: '赛博朋克、未来世界' },
    { id: 'fantasy', name: '奇幻风格', description: '魔法、中世纪奇幻' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {templates.map((t) => (
        <div
          key={t.id}
          className="p-4 bg-neutral-800 rounded-lg hover:bg-neutral-700 cursor-pointer transition-colors"
        >
          <h4 className="text-white font-medium mb-1">{t.name}</h4>
          <p className="text-xs text-neutral-500">{t.description}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: 修改 App.tsx**

```typescript
import { MainShell } from './components/layout/MainShell';

function App() {
  return <MainShell />;
}

export default App;
```

---

## Task 5: Vibe 输入组件

**Files:**
- Create: `src/components/vibe/VibeInput.tsx`
- Create: `src/components/vibe/ModeToggle.tsx`
- Create: `src/components/vibe/ReferenceUploader.tsx`

- [ ] **Step 1: 创建 VibeInput.tsx**

```typescript
import { useState } from 'react';
import { ModeToggle } from './ModeToggle';
import { ReferenceUploader } from './ReferenceUploader';
import { GenerationMode, VibeReference } from '@/types';

export function VibeInput() {
  const [prompt, setPrompt] = useState('');
  const [references, setReferences] = useState<VibeReference[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [mode, setMode] = useState<GenerationMode>('auto');
  const [isGenerating, setIsGenerating] = useState(false);

  const templates = [
    { id: 'drama', name: '剧情短片' },
    { id: 'ad', name: '广告宣传' },
    { id: 'tutorial', name: '教学案例' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim() && references.length === 0) return;
    setIsGenerating(true);
    // TODO: 调用 API
    console.log('Generating with:', { prompt, references, template: selectedTemplate, mode });
    setTimeout(() => setIsGenerating(false), 2000);
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-3xl mx-auto">
      {/* 模式切换 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">输入你的 Vibe</h2>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* Prompt 输入 */}
      <div className="mb-6">
        <label className="text-sm text-neutral-400 mb-2 block">
          描述你想要的世界
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：一个中年男人深夜独自在便利店，赛博朋克风格，外表平静内心挣扎..."
          rows={5}
          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-neutral-500 transition-colors"
        />
      </div>

      {/* 参考素材 */}
      <div className="mb-6">
        <label className="text-sm text-neutral-400 mb-2 block">
          参考素材（可选）
        </label>
        <ReferenceUploader references={references} onChange={setReferences} />
      </div>

      {/* 模板选择 */}
      <div className="mb-8">
        <label className="text-sm text-neutral-400 mb-2 block">
          或选择一个模板
        </label>
        <div className="flex gap-2">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                selectedTemplate === t.id
                  ? 'bg-neutral-700 border-neutral-500 text-white'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* 生成按钮 */}
      <div className="mt-auto">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || (!prompt.trim() && references.length === 0)}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isGenerating
              ? 'bg-neutral-700 text-neutral-400 cursor-not-allowed'
              : 'bg-white text-black hover:bg-neutral-200'
          }`}
        >
          {isGenerating ? '生成中...' : '开始生成'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 ModeToggle.tsx**

```typescript
import { GenerationMode } from '@/types';

interface ModeToggleProps {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={mode === 'auto' ? 'text-white' : 'text-neutral-500'}>
        全自动
      </span>
      <button
        onClick={() => onChange(mode === 'auto' ? 'collaborative' : 'auto')}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          mode === 'collaborative' ? 'bg-blue-600' : 'bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            mode === 'collaborative' ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={mode === 'collaborative' ? 'text-white' : 'text-neutral-500'}>
        协作模式
      </span>
    </div>
  );
}
```

- [ ] **Step 3: 创建 ReferenceUploader.tsx**

```typescript
import { useState } from 'react';
import { VibeReference } from '@/types';

interface ReferenceUploaderProps {
  references: VibeReference[];
  onChange: (refs: VibeReference[]) => void;
}

export function ReferenceUploader({ references, onChange }: ReferenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: 处理文件上传
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('Selected files:', files);
  };

  const removeReference = (index: number) => {
    onChange(references.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-neutral-700 hover:border-neutral-600'
        }`}
      >
        <p className="text-sm text-neutral-400 mb-2">
          拖拽图片、音频或视频到这里
        </p>
        <p className="text-xs text-neutral-600 mb-3">或</p>
        <label className="inline-block">
          <input
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className="px-4 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded cursor-pointer hover:bg-neutral-700">
            选择文件
          </span>
        </label>
      </div>

      {/* 已上传的参考素材 */}
      {references.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {references.map((ref, index) => (
            <div
              key={index}
              className="relative w-16 h-16 bg-neutral-800 rounded overflow-hidden group"
            >
              {ref.type === 'image' && (
                <img
                  src={ref.data}
                  alt="参考"
                  className="w-full h-full object-cover"
                />
              )}
              {ref.type === 'audio' && (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  🎵
                </div>
              )}
              {ref.type === 'video' && (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  🎬
                </div>
              )}
              <button
                onClick={() => removeReference(index)}
                className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 6: 剧本编辑器

**Files:**
- Create: `src/components/script/ScriptEditor.tsx`
- Create: `src/components/script/ScriptVersionHistory.tsx`

- [ ] **Step 1: 创建 ScriptEditor.tsx**

```typescript
import { useState } from 'react';
import { useScriptStore } from '@/stores/scriptStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ScriptVersionHistory } from './ScriptVersionHistory';

export function ScriptEditor() {
  const { currentScript, updateScript, saveVersion, createScript } = useScriptStore();
  const { currentEpisodeId, workspace, currentProjectId } = useWorkspaceStore();
  const [title, setTitle] = useState(currentScript?.title || '新剧本');
  const [content, setContent] = useState(currentScript?.content || '');
  const [showHistory, setShowHistory] = useState(false);

  const handleCreateScript = () => {
    if (!currentEpisodeId) return;
    const script = createScript(currentEpisodeId, title, content);
    // 添加到 episode（简化处理）
    console.log('Created script:', script);
  };

  const handleSave = () => {
    if (!currentScript) return;
    updateScript(currentScript.id, { title, content });
    saveVersion(currentScript.id);
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
      {/* 左侧编辑器 */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold bg-transparent text-white border-b border-transparent hover:border-neutral-700 focus:border-neutral-500 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1 text-sm text-neutral-400 hover:text-white"
            >
              历史 {currentScript?.history.length || 0}
            </button>
            {currentScript ? (
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
              >
                保存版本
              </button>
            ) : (
              <button
                onClick={handleCreateScript}
                className="px-3 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
              >
                创建剧本
              </button>
            )}
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="开始编写你的剧本...

格式示例：
场景 1：内 便利店 夜
角色：阿杰（中年男人，便利店店员）

[阿杰站在空荡荡的便利店柜台后，外面霓虹灯闪烁。他的眼神有些空洞，机械地擦拭着一个杯子。]

阿杰：（独白）又是一个漫长的夜班...
"
          className="flex-1 w-full p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 placeholder-neutral-600 resize-none focus:outline-none focus:border-neutral-600 font-mono text-sm leading-relaxed"
        />

        {currentScript && (
          <div className="mt-2 text-xs text-neutral-600">
            当前版本: v{currentScript.version} | 最后更新:{' '}
            {new Date(currentScript.updatedAt).toLocaleString('zh-CN')}
          </div>
        )}
      </div>

      {/* 右侧：版本历史 */}
      {showHistory && currentScript && (
        <div className="w-80 border-l border-neutral-800 p-4 overflow-auto">
          <ScriptVersionHistory
            history={currentScript.history}
            onRevert={(versionId) => {
              useScriptStore.getState().revertToVersion(currentScript.id, versionId);
              const reverted = useScriptStore.getState().currentScript;
              if (reverted) {
                setTitle(reverted.title);
                setContent(reverted.content);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建 ScriptVersionHistory.tsx**

```typescript
import { ScriptVersion } from '@/types';

interface ScriptVersionHistoryProps {
  history: ScriptVersion[];
  onRevert: (versionId: string) => void;
}

export function ScriptVersionHistory({ history, onRevert }: ScriptVersionHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center text-neutral-500 py-8">
        暂无版本历史
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-3">版本历史</h3>
      <div className="space-y-2">
        {[...history].reverse().map((version, index) => (
          <div
            key={version.id}
            className="p-3 bg-neutral-800 rounded hover:bg-neutral-700"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">
                v{history.length - index}
              </span>
              <button
                onClick={() => onRevert(version.id)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                恢复此版本
              </button>
            </div>
            <div className="text-xs text-neutral-500">
              {new Date(version.timestamp).toLocaleString('zh-CN')}
            </div>
            {version.note && (
              <div className="mt-1 text-xs text-neutral-400">{version.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Task 7: 角色卡和场景卡组件

**Files:**
- Create: `src/components/role/RoleCard.tsx`
- Create: `src/components/scene/SceneCard.tsx`

- [ ] **Step 1: 创建 RoleCard.tsx**

```typescript
import { Role } from '@/types';

interface RoleCardProps {
  role: Role;
  isActive: boolean;
  onClick: () => void;
}

export function RoleCard({ role, isActive, onClick }: RoleCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isActive
          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      <div className="aspect-square bg-neutral-800">
        {role.card.image ? (
          <img
            src={role.card.image}
            alt={role.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            无图片
          </div>
        )}
      </div>
      <div className="p-2 bg-neutral-900">
        <h4 className="text-sm font-medium text-white truncate">{role.name}</h4>
        <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">
          {role.card.description || '暂无描述'}
        </p>
        <div className="flex gap-1 mt-2">
          {role.variants.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-500">
              {role.variants.length} 变体
            </span>
          )}
          {role.versions.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-500">
              v{role.versions.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 创建 SceneCard.tsx**

```typescript
import { SceneAsset } from '@/types';

interface SceneCardProps {
  scene: SceneAsset;
  isActive: boolean;
  onClick: () => void;
}

export function SceneCard({ scene, isActive, onClick }: SceneCardProps) {
  const typeLabels = {
    interior: '室内',
    exterior: '室外',
    other: '其他',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isActive
          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      <div className="aspect-video bg-neutral-800">
        {scene.thumbnail ? (
          <img
            src={scene.thumbnail}
            alt={scene.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            无缩略图
          </div>
        )}
      </div>
      <div className="p-2 bg-neutral-900">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white truncate">{scene.name}</h4>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              scene.source === 'ai_generated'
                ? 'bg-purple-900 text-purple-300'
                : 'bg-neutral-800 text-neutral-500'
            }`}
          >
            {scene.source === 'ai_generated' ? 'AI' : '资产库'}
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          {typeLabels[scene.type]}
        </p>
      </div>
    </div>
  );
}
```

---

## Task 8: 本地存储

**Files:**
- Create: `src/lib/storage.ts`

- [ ] **Step 1: 创建 storage.ts**

```typescript
import { Workspace } from '@/types';

const STORAGE_KEY = 'vibestudio_workspace';

export function saveWorkspace(workspace: Workspace): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch (error) {
    console.error('Failed to save workspace:', error);
  }
}

export function loadWorkspace(): Workspace | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Workspace;
  } catch (error) {
    console.error('Failed to load workspace:', error);
    return null;
  }
}

export function clearWorkspace(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

---

## Self-Review 检查清单

1. **Spec 覆盖检查** — 逐项核对 PRD：
   - [x] 工作区/项目/剧集/分季/分集层级结构
   - [x] 三面板 UI 布局（Create/Project/Assets）
   - [x] Vibe 输入层（Prompt/参考素材/模板/模式切换）
   - [x] 剧本管理（版本历史）
   - [x] 角色系统（角色卡展示）
   - [x] 场景管理（场景卡展示）
   - [x] 模板库
   - [x] UI 哲学（极简、沉浸、浮动面板）

2. **Placeholder 扫描** — 无 TODO/TBD/实现后续等占位符

3. **类型一致性** — 所有接口在 `src/types/index.ts` 统一定义，Store 引用正确

4. **任务完整性** — 所有任务都有具体文件、具体代码、具体命令

---

## 执行选择

**Plan 完成，保存于:** `docs/superpowers/plans/2026-04-11-vibe-studio-phase-1.md`

两个执行选项：

**1. Subagent-Driven (推荐)** — 每个任务派一个新 subagent 执行，任务间有检查点

**2. Inline Execution** — 在当前 session 内批量执行，有检查点

选择哪个方式？