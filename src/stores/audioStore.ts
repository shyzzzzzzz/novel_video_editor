import { create } from 'zustand';
import { AudioTrack, AudioType } from '@/types';
import { v4 as uuid } from 'uuid';

interface AudioState {
  tracks: AudioTrack[];

  addTrack: (episodeId: string, type: AudioType, name: string, fileUrl: string) => AudioTrack;
  updateTrack: (trackId: string, updates: Partial<AudioTrack>) => void;
  removeTrack: (trackId: string) => void;

  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackMuted: (trackId: string, muted: boolean) => void;

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

  getTracksByEpisode: (episodeId) =>
    get().tracks.filter((t) => t.episodeId === episodeId),

  getTrackById: (trackId) => get().tracks.find((t) => t.id === trackId),
}));
