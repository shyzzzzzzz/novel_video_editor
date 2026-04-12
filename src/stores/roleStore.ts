import { create } from 'zustand';
import { Role, RoleCard, RoleTemplate, RoleVariant, RoleVersion } from '@/types';
import { v4 as uuid } from 'uuid';

interface RoleState {
  currentRole: Role | null;
  createRole: (name: string, card: RoleCard, template: RoleTemplate) => Role;
  loadRole: (role: Role) => void;
  updateRole: (id: string, updates: Partial<Pick<Role, 'name' | 'card' | 'template'>>) => void;
  addVariant: (roleId: string, name: string, card: RoleCard) => void;
  saveVersion: (roleId: string) => void;
  deleteRole: (roleId: string) => void;
}

export const useRoleStore = create<RoleState>((set) => ({
  currentRole: null,

  createRole: (name, card, template) => ({
    id: uuid(),
    name,
    card,
    template,
    variants: [],
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),

  loadRole: (role) => set({ currentRole: role }),

  updateRole: (id, updates) =>
    set((state) => {
      if (!state.currentRole || state.currentRole.id !== id) return state;
      return {
        currentRole: {
          ...state.currentRole,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  addVariant: (roleId, name, card) =>
    set((state) => {
      if (!state.currentRole || state.currentRole.id !== roleId) return state;
      const variant: RoleVariant = { id: uuid(), name, card };
      return {
        currentRole: {
          ...state.currentRole,
          variants: [...state.currentRole.variants, variant],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  saveVersion: (roleId) =>
    set((state) => {
      if (!state.currentRole || state.currentRole.id !== roleId) return state;
      const version: RoleVersion = {
        id: uuid(),
        card: state.currentRole.card,
        template: state.currentRole.template,
        timestamp: new Date().toISOString(),
      };
      return {
        currentRole: {
          ...state.currentRole,
          versions: [...state.currentRole.versions, version],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  deleteRole: (_roleId) => set({ currentRole: null }),
}));
