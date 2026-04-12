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
