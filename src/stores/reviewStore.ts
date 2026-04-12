import { create } from 'zustand';
import { DraftVersion, Annotation } from '@/types';
import { v4 as uuid } from 'uuid';

interface ReviewState {
  draftVersions: DraftVersion[];
  annotations: Annotation[];

  createDraftVersion: (episodeId: string, label: string, notes?: string) => DraftVersion;
  updateDraftVersion: (versionId: string, updates: Partial<DraftVersion>) => void;
  deleteDraftVersion: (versionId: string) => void;
  getDraftVersionsForEpisode: (episodeId: string) => DraftVersion[];

  addAnnotation: (episodeId: string, targetId: string, targetType: Annotation['targetType'], content: string, author: string) => Annotation;
  resolveAnnotation: (annotationId: string) => void;
  deleteAnnotation: (annotationId: string) => void;
  getAnnotationsForEpisode: (episodeId: string) => Annotation[];
  getAnnotationsForTarget: (targetId: string) => Annotation[];
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  draftVersions: [],
  annotations: [],

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

  updateDraftVersion: (versionId, updates) =>
    set((state) => ({
      draftVersions: state.draftVersions.map((d) =>
        d.id === versionId ? { ...d, ...updates } : d
      ),
    })),

  deleteDraftVersion: (versionId) =>
    set((state) => ({
      draftVersions: state.draftVersions.filter((d) => d.id !== versionId),
    })),

  getDraftVersionsForEpisode: (episodeId) =>
    get().draftVersions.filter((d) => d.episodeId === episodeId),

  addAnnotation: (episodeId, targetId, targetType, content, author) => {
    const annotation: Annotation = {
      id: uuid(),
      episodeId,
      targetId,
      targetType,
      content,
      author,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    set((state) => ({ annotations: [...state.annotations, annotation] }));
    return annotation;
  },

  resolveAnnotation: (annotationId) =>
    set((state) => ({
      annotations: state.annotations.map((a) =>
        a.id === annotationId ? { ...a, resolved: true } : a
      ),
    })),

  deleteAnnotation: (annotationId) =>
    set((state) => ({
      annotations: state.annotations.filter((a) => a.id !== annotationId),
    })),

  getAnnotationsForEpisode: (episodeId) =>
    get().annotations.filter((a) => a.episodeId === episodeId),

  getAnnotationsForTarget: (targetId) =>
    get().annotations.filter((a) => a.targetId === targetId),
}));