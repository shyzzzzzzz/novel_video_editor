import { create } from 'zustand';
import { AudioTrack, AudioType } from '@/types';
import { v4 as uuid } from 'uuid';
import { loadPersistedData, createDebouncedSave } from '@/lib/persist-client';

interface AudioState {
  tracks: AudioTrack[];

  addTrack: (episodeId: string, type: AudioType, name: string, fileUrl: string) => AudioTrack;
  updateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  removeTrack: (trackId: string) => void;

  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;

  getTracksByEpisode: (episodeId: string) => AudioTrack[];
  getTrackById: (trackId: string) => AudioTrack | undefined;

  // 持久化
  load: () => Promise<void>;
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

  getTracksByEpisode: (episodeId) =>
    get().tracks.filter((t) => t.episodeId === episodeId),

  getTrackById: (trackId) => get().tracks.find((t) => t.id === trackId),

  load: async () => {
    const data = await loadPersistedData<{
      tracks: AudioTrack[];
    }>('audio_tracks');
    if (data) {
      set((state) => ({ tracks: data.tracks ?? state.tracks }));
    }
  },
}));

// 自动保存
const debouncedSaveAudio = createDebouncedSave<{ tracks: AudioTrack[] }>('audio_tracks');
useAudioStore.subscribe((state) => {
  debouncedSaveAudio({
    tracks: state.tracks,
  });
});
