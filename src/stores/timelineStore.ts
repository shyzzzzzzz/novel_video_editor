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
      const tracksWithoutClip = state.tracks.map((t) => {
        const clip = t.clips.find((c) => c.id === clipId);
        if (clip) {
          clipToMove = clip;
          return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
        }
        return t;
      });
      if (!clipToMove) return state;
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
