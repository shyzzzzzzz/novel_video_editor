import { create } from 'zustand';
import { Storyboard, Shot, CameraAngle } from '@/types';
import { v4 as uuid } from 'uuid';
import { loadPersistedData, createDebouncedSave } from '@/lib/persist-client';

const STORAGE_BASE = 'http://localhost:18080/api/storage';
const FFMPEG_BASE = 'http://localhost:18080/ffmpeg';

type StoryboardViewMode = 'grid' | 'timeline';

interface StoryboardState {
  currentStoryboard: Storyboard | null;
  viewMode: StoryboardViewMode;

  createStoryboard: (episodeId: string) => Storyboard;
  loadStoryboard: (storyboard: Storyboard) => void;
  deleteStoryboard: () => void;

  addShot: (storyboardId: string, description: string, cameraAngle: CameraAngle, duration?: number) => Shot;
  updateShot: (shotId: string, updates: Partial<Shot>) => void;
  deleteShot: (shotId: string) => void;
  clearShots: () => void;
  reorderShots: (storyboardId: string, shotIds: string[]) => void;

  uploadVideoToShot: (shotId: string, file: File) => Promise<void>;
  removeVideoFromShot: (shotId: string) => Promise<void>;

  setViewMode: (mode: StoryboardViewMode) => void;

  // 持久化
  load: () => Promise<void>;
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
    set({ currentStoryboard: storyboard });
    return storyboard;
  },

  loadStoryboard: (storyboard) => set({ currentStoryboard: storyboard }),

  deleteStoryboard: () => set({ currentStoryboard: null }),

  addShot: (storyboardId, description, cameraAngle, duration = 5) => {
    const shot: Shot = {
      id: uuid(),
      sequence: get().currentStoryboard?.shots.length || 0,
      description,
      cameraAngle,
      duration,
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

  clearShots: () =>
    set((state) => {
      if (!state.currentStoryboard) return state;
      return {
        currentStoryboard: {
          ...state.currentStoryboard,
          shots: [],
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

  uploadVideoToShot: async (shotId, file) => {
    const { currentStoryboard, updateShot } = get();
    if (!currentStoryboard) return;

    const shot = currentStoryboard.shots.find((s) => s.id === shotId);
    if (!shot) return;

    const serverPath = `videos/${currentStoryboard.id}/${shotId}/${file.name}`;

    // 上传文件到后端
    const formData = new FormData();
    formData.append('file', file);
    const uploadResp = await fetch(`${STORAGE_BASE}/upload?path=${encodeURIComponent(serverPath)}`, {
      method: 'POST',
      body: formData,
    });
    if (!uploadResp.ok) throw new Error(`上传失败: ${uploadResp.status}`);

    // 提取尾帧（使用后端 ffmpeg）
    let lastFrameServerPath: string | undefined;
    try {
      const lastFramePath = `videos/${currentStoryboard.id}/${shotId}/last_frame.jpg`;
      const resp = await fetch(`${FFMPEG_BASE}/extract_last_frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: serverPath,
          output_path: lastFramePath,
        }),
      });
      if (resp.ok) {
        lastFrameServerPath = lastFramePath;
      }
    } catch (err) {
      console.error('提取尾帧失败:', err);
    }

    // 更新镜头
    const updates: Partial<Shot> = {
      videoUrl: serverPath,
      videoFileName: file.name,
    };
    if (lastFrameServerPath) {
      updates.thumbnailUrl = `videos/${currentStoryboard.id}/${shotId}/last_frame.jpg`;
      updates.lastFrameUrl = lastFrameServerPath;
    }
    updateShot(shotId, updates);

    // 自动接续：设置下一个镜头的首帧（使用最新 state）
    if (lastFrameServerPath) {
      const latestStoryboard = get().currentStoryboard;
      if (latestStoryboard) {
        const nextShot = latestStoryboard.shots.find((s) => s.sequence === shot.sequence + 1);
        if (nextShot) {
          updateShot(nextShot.id, { firstFrameUrl: lastFrameServerPath });
        }
      }
    }
  },

  removeVideoFromShot: async (shotId) => {
    const { currentStoryboard, updateShot } = get();
    if (!currentStoryboard) return;

    const shot = currentStoryboard.shots.find((s) => s.id === shotId);
    if (!shot?.videoUrl) return;

    // 尝试从后端删除文件
    try {
      await fetch(`${STORAGE_BASE}/delete?path=${encodeURIComponent(shot.videoUrl)}`, {
        method: 'POST',
      });
      if (shot.thumbnailUrl) {
        await fetch(`${STORAGE_BASE}/delete?path=${encodeURIComponent(shot.thumbnailUrl)}`, {
          method: 'POST',
        });
      }
    } catch (err) {
      console.error('删除服务器文件失败:', err);
    }

    updateShot(shotId, {
      videoUrl: undefined,
      videoFileName: undefined,
      thumbnailUrl: undefined,
      lastFrameUrl: undefined,
    });
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  load: async () => {
    const data = await loadPersistedData<{
      currentStoryboard: Storyboard | null;
    }>('storyboard');
    if (data) {
      set((state) => ({
        currentStoryboard: data.currentStoryboard ?? state.currentStoryboard,
      }));
    }
  },
}));

// 自动保存
const debouncedSaveStoryboard = createDebouncedSave<{ currentStoryboard: Storyboard | null }>('storyboard');
useStoryboardStore.subscribe((state) => {
  debouncedSaveStoryboard({
    currentStoryboard: state.currentStoryboard,
  });
});