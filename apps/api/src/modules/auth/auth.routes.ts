import type { FastifyInstance } from 'fastify';
import { toNodeHandler } from 'better-auth/node';
import { auth } from '../../lib/auth.js';

// ============================================================
// AUTH ROUTES — Powered by Better Auth
//
// Better Auth handles all auth endpoints natively:
//   POST /api/v1/auth/sign-in/email          — email/password login
//   POST /api/v1/auth/sign-up/email          — email/password signup
//   POST /api/v1/auth/sign-out               — logout
//   GET  /api/v1/auth/get-session            — get current session
//   GET  /api/v1/auth/sign-in/google         — initiate Google OAuth
//   GET  /api/v1/auth/callback/google        — Google OAuth callback
//   POST /api/v1/auth/two-factor/enable      — enable TOTP 2FA
//   POST /api/v1/auth/two-factor/verify-totp — verify TOTP code
//   POST /api/v1/auth/two-factor/disable     — disable 2FA
//   GET  /api/v1/auth/two-factor/generate    — get QR code for setup
//
// These routes are intentionally PUBLIC — Better Auth handles its
// own session validation internally. The authenticate preHandler
// is NOT applied here.
// ============================================================

const betterAuthNodeHandler = toNodeHandler(auth);

export async function authRoutes(app: FastifyInstance) {
  // Better Auth uses better-call/node internally, which reads the body from
  // req.raw. It first checks if req.body is already populated (pre-parsed),
  // and if so, wraps it in a ReadableStream rather than consuming the raw
  // stream again. We must parse the body and attach it to req.raw so Better
  // Auth can find it — otherwise it waits for stream data that never comes.
  // Read the body as a Buffer so Fastify doesn't corrupt it, then attach the
  // raw Buffer to req.raw. better-call's getRequest() checks req.body first —
  // if it's a string it wraps it in a ReadableStream. Since Buffer is not a
  // string, it will serialize it via JSON.stringify, so we convert to string.
  app.addContentTypeParser(
    ['application/json', 'application/x-www-form-urlencoded'],
    { parseAs: 'buffer' },
    function (req, body, done) {
      // Attach the body as a string to req.raw so better-call can find it
      // without re-consuming the already-drained stream.
      if (body && body.length > 0) {
        (req.raw as unknown as Record<string, unknown>)['body'] = body.toString('utf-8');
      }
      done(null, null);
    },
  );

  // Catch-all: forward all /api/v1/auth/* requests to Better Auth.
  app.all('/*', async (request, reply) => {
    // @fastify/cors runs in its onRequest hook and sets CORS headers on the Fastify
    // reply object before we get here. betterAuthNodeHandler writes directly to
    // reply.raw (bypassing Fastify's onSend lifecycle), so those headers are never
    // flushed. We copy all Fastify-managed headers to reply.raw first so they
    // survive the raw write.
    for (const [name, value] of Object.entries(reply.getHeaders())) {
      if (value !== undefined) {
        reply.raw.setHeader(name, Array.isArray(value) ? value.map(String) : String(value));
      }
    }

    await betterAuthNodeHandler(request.raw, reply.raw);
    // Tell Fastify the response has already been sent via reply.raw
    reply.sent = true;
  });
}
