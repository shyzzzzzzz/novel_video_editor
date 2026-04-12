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
