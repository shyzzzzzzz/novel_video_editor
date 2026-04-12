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
