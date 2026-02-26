import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { db } from '@cresyn/db';
import * as schema from '@cresyn/db/schema';

// ============================================================
// BETTER AUTH INSTANCE
// Single source of truth for all authentication.
// Handles: Google OAuth, email/password, TOTP 2FA, sessions.
// ============================================================

if (!process.env['BETTER_AUTH_SECRET']) {
  throw new Error('BETTER_AUTH_SECRET environment variable is required');
}
if (!process.env['GOOGLE_CLIENT_ID'] || !process.env['GOOGLE_CLIENT_SECRET']) {
  throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required');
}

export const auth = betterAuth({
  // ---- Base config ----
  // baseURL: full origin (no path)
  // basePath: the URL prefix where Better Auth routes are mounted.
  // This tells Better Auth to strip this prefix when matching routes,
  // so /api/v1/auth/sign-up/email → /sign-up/email internally.
  baseURL: process.env['API_URL'] ?? 'http://localhost:3001',
  basePath: '/api/v1/auth',
  secret: process.env['BETTER_AUTH_SECRET'],
  // Whitelist the web app as a trusted origin so Better Auth accepts requests
  // from it (it does its own origin check independent of @fastify/cors).
  // In dev we also allow 127.0.0.1 since preview tools use that instead of localhost.
  trustedOrigins:
    process.env['NODE_ENV'] === 'production'
      ? [process.env['WEB_URL'] ?? 'http://localhost:3000']
      : [
          process.env['WEB_URL'] ?? 'http://localhost:3000',
          (process.env['WEB_URL'] ?? 'http://localhost:3000').replace('localhost', '127.0.0.1'),
        ],

  // ---- Database ----
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Better Auth uses its own tables (user, session, account, verification).
    // These are separate from our app tables (companies, contacts, etc.)
    // usePlural: false because Better Auth expects singular table names
    // but we'll pass the schema so it can find them.
    schema: {
      user: schema.baUsers,
      session: schema.baSessions,
      account: schema.baAccounts,
      verification: schema.baVerifications,
      twoFactor: schema.baTwoFactors,
    },
    usePlural: false,
  }),

  // ---- Email + password ----
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Allow login before verification during dev
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },

  // ---- Google OAuth ----
  socialProviders: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'],
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    },
  },

  // ---- Plugins ----
  plugins: [
    twoFactor({
      issuer: 'Cresyn Pulse',
      totpOptions: {
        digits: 6,
        period: 30,
      },
    }),
  ],

  // ---- Session config ----
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // Refresh session if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5-minute cache on session cookie
    },
  },

  // ---- Cookie settings ----
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax', // lax allows OAuth redirects; strict would break Google flow
    },
  },
});

export type Auth = typeof auth;
