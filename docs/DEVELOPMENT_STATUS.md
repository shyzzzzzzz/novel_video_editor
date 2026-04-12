# VibeStudio 开发进度文档

> 最后更新：2026-04-13

## 项目概述

VibeStudio 是一个 AI 视频创作工作站，支持小说创作、知识图谱管理、视频制作全流程。

**技术栈**
- 前端：Vite + React 18 + TypeScript 5 + Zustand + Tailwind CSS + Electron
- 后端：Python FastAPI（路由：`ffmpeg`、`storage`、`generation`、`sync`）
- 同步：GitHub Gist（通过后端代理避免 CORS）

**启动命令**
```bash
# 前端开发（http://localhost:1420）
npm run dev

# 后端 API（http://localhost:18080）
npm run python

# Electron 应用
npm run electron
```

---

## 已完成功能

### Phase 1：基础架构
- [x] Electron + Vite + React 项目初始化
- [x] Tailwind CSS 主题配置（深色模式）
- [x] Zustand 状态管理框架
- [x] 多窗口架构（主窗口 + 设置弹窗）

### Phase 2：创作中心
- [x] 小说面板（创建小说、管理章节）
- [x] 知识面板（角色、物品、地点、剧情线）
- [x] **关系图谱**（SVG 力导向图，5 种关系类型：同盟/敌对/家族/浪漫/中立）
- [x] 编辑器面板（分镜卡片、镜头规划）

### Phase 3：生产流水线
- [x] 视频预览组件
- [x] 分镜时间轴（拖拽排序、镜头时长编辑）
- [x] 音频管线（对话/BGM/SFX/Foley 轨道管理）
- [x] 渲染任务状态追踪

### Phase 4：时间轴 + 音频 + 导出
- [x] `TimelineEditor` 整合 VideoPreview + Timeline
- [x] `AudioPipeline` 整合 AudioEditor（4 轨道：dialogue/bgm/sfx/foley）
- [x] `EpisodeDetail` 集成真实 TimelineEditor + AudioPipeline
- [x] FFmpeg 路由占位（`python/routers/ffmpeg.py`）

### 设置模块重构
- [x] 从单一 API 配置扩展为三类独立配置：文本生成/图像生成/视频生成
- [x] 每个分类独立选择 Provider（Mock/OpenAI/Runway/MiniMax）并填写 API Key 和 API 地址
- [x] API Key 明文/隐藏切换（👁️/🙈）
- [x] Provider 切换时自动填充默认 API 地址
- [x] Electron 启动不再自动打开 DevTools

### 云同步（GitHub Gist）
- [x] `POST /api/sync/push` — 推送工作区数据到 Gist（自动创建或更新）
- [x] `GET /api/sync/pull` — 从 Gist 拉取数据
- [x] `syncStore.ts` — 同步状态管理（PAT/Gist ID/filename 持久化）
- [x] `SyncPanel.tsx` — 同步配置 UI
- [x] 最后写入胜出合并策略（按 `updatedAt` 时间戳）
- [x] 同步范围：小说（含章节）+ 知识库（角色/物品/地点/剧情线）

---

## 待完成功能

### Phase 5：AI 配音 + FFmpeg 渲染 + ProRes 输出
- [ ] AI 配音管线（文本转语音、TTS 提供商对接）
- [ ] FFmpeg 渲染路由实现（`python/routers/ffmpeg.py`）
- [ ] ProRes 格式导出支持
- [ ] 渲染进度实时推送（WebSocket/SSE）
- [ ] 渲染任务队列管理

### 知识库增强
- [ ] 角色关系的多维描述（亲密度、冲突点等）
- [ ] 知识图谱的交互增强（缩放动画、关系筛选）
- [ ] AI 自动从小说章节提取知识条目

### 视频生成集成
- [ ] Runway/MiniMax 视频生成 API 对接
- [ ] 分镜到视频片段的生成流程
- [ ] 生成进度追踪

---

## 数据模型

### 前端 Store 架构
```
settingsStore     — API 配置（text/image/video 三类）
syncStore         — GitHub Gist 同步状态
novelStore       — 当前小说 + 章节（单小说模式）
knowledgeStore    — 角色/物品/地点/剧情线
workspaceStore    — 工作区信息
timelineStore     — 时间轴数据
takesStore       — 镜头数据
reviewStore      — 批注数据
```

### Novel 数据结构
```typescript
interface Novel {
  id: string;
  title: string;
  description?: string;
  chapters: Chapter[];      // 内嵌，非独立数组
  createdAt: string;
  updatedAt: string;
}

interface Chapter {
  id: string;
  novelId: string;
  title: string;
  content: string;
  order: number;
  status: 'draft' | 'completed' | 'synced';
  metadata: ChapterMetadata;
  createdAt: string;
  updatedAt: string;
}
```

### 同步 payload 结构
```json
{
  "workspaceName": "我的工作区",
  "novels": [{ ...novel, chapters: [...] }],
  "knowledge": {
    "characters": [...],
    "items": [...],
    "locations": [...],
    "plotLines": [...]
  }
}
```

---

## API 路由

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/ffmpeg/*` | * | FFmpeg 操作（待实现） |
| `/api/storage/*` | * | 文件存储 |
| `/api/generation/*` | * | AI 生成（文本/图像/视频） |
| `/api/sync/push` | POST | 推送数据到 GitHub Gist |
| `/api/sync/pull` | GET | 从 GitHub Gist 拉取数据 |

---

## 已知问题

1. **TS6133 警告**（不影响运行）：部分文件存在未使用变量警告
   - `Timeline.tsx`：未使用的 `isPlaying`、`setScrollLeft`
   - `SettingsModal.tsx`：未使用的 `activeConfig`、`message`
   - `editorStore.ts`、`scriptStore.ts`：未使用的 `get` 参数
   - `takesStore.ts`：未使用的 `TakeStatus`

---

## 协作指南

### 分支策略
- 功能开发在独立分支进行，完成后合并
- 重要改动先提设计文档讨论

### 代码规范
- TypeScript 严格模式
- 使用 Zustand 管理全局状态
- 组件放在 `src/components/[模块]/` 目录
- Store 放在 `src/stores/` 目录

### 调试
- 前端：`http://localhost:1420`（Vite HMR）
- 后端：`http://localhost:18080`（FastAPI）
- Electron DevTools：从菜单 → View → Toggle DevTools 手动打开

### 云同步测试
1. 启动后端 `npm run python`
2. 启动前端 `npm run dev`
3. 打开设置 → 云同步
4. 填入 GitHub PAT（需要 gist 作用域）和 Gist ID
5. 先推送，修改数据后再拉取验证合并
