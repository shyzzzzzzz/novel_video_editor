# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 项目概述

VibeStudio 是一个 AI 视频创作工作站，将小说转化为剧集化视频内容。核心模块：**小说创作**、**知识库**（中枢）、**剧集制作**。

## 技术栈

- **前端**: Vite + React 18 + TypeScript 5 + Zustand + Tailwind CSS + Electron 33
- **后端**: Python FastAPI（路由：`ffmpeg`、`storage`、`generation`、`sync`、`persist`）
- **同步**: GitHub Gist（通过后端代理避免 CORS）
- **构建**: electron-builder

## 常用命令

```bash
#conda 环境

conda activate nv_ai
# 完整开发环境（前端 + Python 后端 + Electron）
npm run dev

# 仅前端（Vite 开发服务器，http://localhost:1420）
npm run dev:frontend

# 仅后端（FastAPI，http://localhost:18080）
npm run dev:python

# 构建前端生产版本
npm run build

# 构建 Electron 应用
npm run build:electron

# 初始化安装 Python 依赖
npm run setup
```

**端口**: 前端开发服务器: 1420，Python API: 18080。Vite 代理将 `/api/*` 转发到后端。

## 架构

### 前端结构 (`src/`)

- **`components/`** — 按功能域组织：`audio/`、`editor/`、`knowledge/`、`layout/`、`novel/`、`production/`、`render/`、`review/`、`role/`、`scene/`、`script/`、`settings/`、`vibe/`
- **`stores/`** — 16 个 Zustand store。所有 store 支持 `load()` / 持久化模式，数据存于 localStorage
- **`lib/`** — `api-client.ts`（后端通信）、`exporter.ts`、`storage.ts`、`persist-client.ts`

### 后端结构 (`python/`)

- **`main.py`** — FastAPI 应用，CORS 配置允许 `http://localhost:1420`，挂载 `/storage/files` 提供 `D:/vibestudio_data` 静态文件服务
- **`routers/`** — `ffmpeg.py`（视频渲染，待实现）、`storage.py`（文件操作）、`generation.py`（AI 文本/图像/视频生成）、`sync.py`（GitHub Gist 同步）、`persist.py`

### Electron (`electron/`)

- **`main.ts`** — 主进程，创建窗口，路径校验（仅限 `userData`、`documents`、`temp`），文件对话框和文件系统 IPC 处理器
- **`preload.ts`** — 上下文隔离的预加载脚本，通过 `contextBridge` 暴露 IPC
- 开发环境: 加载 `http://localhost:1420`，生产环境: 加载 `dist/index.html`

### 状态持久化

- **设置**: localStorage key `vibestudio_settings`（按 text/image/video 分类存储 API 配置）
- **Store**: `main.tsx` 中 `loadPersistedStores()` 启动时加载所有 store
- **文件**: 后端存储在 `D:/vibestudio_data`，前端通过 `/storage/files/*` 代理访问

## 关键模式

### API 配置 (settingsStore)

三个分类（`text`、`image`、`video`），每个分类有 `provider`（openai/runway/minimax/deepseek/mock）、`apiKey`、`baseUrl`、`model`、`skills`（仅 text 分类）。Skills 包括：`review`、`outline`、`script`、`storyboard`、`image`、`image_desc`。

### 云同步

`syncStore` 管理 GitHub PAT、Gist ID、filename。合并策略：按 `updatedAt` 时间戳以最后写入胜出。同步范围：小说（含章节）+ 知识库（角色/物品/地点/剧情线）。

### 分镜生成

`storyboard` skill 输出的 JSON 数组字段：`shot_no`、`scene_name`、`scene_time`、`framing`、`composition`、`character_action`、`movement`、`lighting`、`atmosphere`、`color_tone`、`transition`、`duration`、`description`。

## 已知问题

`Timeline.tsx`、`SettingsModal.tsx`、`editorStore.ts`、`scriptStore.ts`、`takesStore.ts` 中存在 TS6133 警告（未使用变量），不影响运行。\

## 开发准则
- Think Before Coding： 当你遇到问题时，先静下心 Calm down 去思考，问题的根因是什么，把假设说出来，有歧义时，不要自己默默选一个，如果有更简单的路，就主动指出来，真有困惑时，停下来问。
- 无限Token 你有足够多的Token和时间去解决问题，不需要为了节省token或者时间，跳过步骤，忽略问题
- Simplicity First 不要加没被要求的功能，不要为一次性代码抽象一层，不要为了“灵活性”提前做配置，不要为不可能发生的场景补一堆错误处理，如果 200 行能写成 50 行，就继续收
- Surgical Changes 不要顺手优化旁边的代码，不要改没坏的东西，不要顺手重写注释和格式，遇到无关死代码，可以提一下，但先别删
- Goal-Driven Execution 把任务改成一个可验证的目标，比如：给非法输入写测试，然后让测试通过；先写一个能复现 bug 的测试，再修到通过；重构前后测试都必须通过；Don't tell it what to do, give it success criteria and watch it go.
