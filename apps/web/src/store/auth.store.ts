import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JWTPayload } from '@cresyn/types';
import type { ModuleKey, Permission, Role } from '@cresyn/config';

interface AuthState {
  accessToken: string | null;
  tenantId: string | null;
  userId: string | null;
  role: Role | null;
  permissions: Permission[];
  modules: ModuleKey[];
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  // Actions
  setAuth: (token: string, payload: JWTPayload) => void;
  clearAuth: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasModule: (moduleKey: ModuleKey) => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      tenantId: null,
      userId: null,
      role: null,
      permissions: [],
      modules: [],
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (token, payload) =>
        set({
          accessToken: token,
          tenantId: payload.tenant_id,
          userId: payload.sub,
          role: payload.role,
          permissions: payload.permissions,
          modules: payload.modules,
          isAuthenticated: true,
        }),

      clearAuth: () =>
        set({
          accessToken: null,
          tenantId: null,
          userId: null,
          role: null,
          permissions: [],
          modules: [],
          isAuthenticated: false,
        }),

      hasPermission: (permission) => get().permissions.includes(permission),
      hasModule: (moduleKey) => get().modules.includes(moduleKey),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'cresyn-auth',
      // Persist all auth state including accessToken
      partialize: (state) => ({
        accessToken: state.accessToken,
        tenantId: state.tenantId,
        userId: state.userId,
        role: state.role,
        permissions: state.permissions,
        modules: state.modules,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
