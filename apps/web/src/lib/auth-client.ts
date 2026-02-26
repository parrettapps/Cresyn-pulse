import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';

// ============================================================
// BETTER AUTH REACT CLIENT
// Single source of truth for all client-side auth operations.
// Mirrors the server's betterAuth() config (basePath must match).
// ============================================================

export const authClient = createAuthClient({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001',
  basePath: '/api/v1/auth',
  plugins: [twoFactorClient()],
});

// Re-export hooks and methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
