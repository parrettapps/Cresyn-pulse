'use client';

import { useSession as useBetterAuthSession } from '../lib/auth-client';

// Thin wrapper so we can add app-layer enrichment later (tenantId, role, etc.)
// For now it re-exports Better Auth's useSession directly.
export function useSession() {
  return useBetterAuthSession();
}
