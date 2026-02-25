import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import {
  signupSchema,
  loginSchema,
  verifyEmailSchema,
  resetPasswordRequestSchema,
} from '@cresyn/validation';
import { AuthService } from './auth.service.js';
import { RATE_LIMITS } from '@cresyn/config';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'strict' as const,
  path: '/api/v1/auth/refresh',
  maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
};

export async function authRoutes(app: FastifyInstance) {
  // ---- SIGNUP ----
  app.post('/signup', {
    config: {
      rateLimit: {
        max: RATE_LIMITS.AUTH_SIGNUP_MAX,
        timeWindow: RATE_LIMITS.AUTH_SIGNUP_WINDOW_MS,
        keyGenerator: (req) => req.ip,
      },
    },
    handler: async (request, reply) => {
      const body = signupSchema.parse(request.body);
      const result = await AuthService.signup(body, request.ip);

      return reply.code(201).send({
        message: 'Account created. Please check your email to verify your address.',
        userId: result.userId,
        tenantId: result.tenantId,
      });
    },
  });

  // ---- LOGIN ----
  app.post('/login', {
    config: {
      rateLimit: {
        max: RATE_LIMITS.AUTH_LOGIN_MAX,
        timeWindow: RATE_LIMITS.AUTH_LOGIN_WINDOW_MS,
        keyGenerator: (req) => req.ip,
      },
    },
    handler: async (request, reply) => {
      const body = loginSchema.parse(request.body);
      const { accessToken, refreshToken, tenantId } = await AuthService.login(
        body,
        request.ip,
        request.headers['user-agent'],
      );

      // Set refresh token as httpOnly cookie
      void reply.setCookie('refresh_token', refreshToken, COOKIE_OPTIONS);

      return reply.send({
        accessToken,
        tenantId,
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    },
  });

  // ---- REFRESH TOKEN ----
  app.post('/refresh', {
    config: { rateLimit: { max: 60, timeWindow: 60_000 } },
    handler: async (request, reply) => {
      const refreshToken = (request.cookies as Record<string, string>)?.['refresh_token'];
      if (!refreshToken) {
        return reply.code(401).send({
          type: 'https://api.cresyn.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Missing refresh token',
        });
      }

      const { accessToken, refreshToken: newRefreshToken } =
        await AuthService.refreshToken(refreshToken);

      void reply.setCookie('refresh_token', newRefreshToken, COOKIE_OPTIONS);

      return reply.send({
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    },
  });

  // ---- LOGOUT ----
  app.post('/logout', {
    handler: async (request, reply) => {
      void reply.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
      return reply.code(204).send();
    },
  });

  // ---- VERIFY EMAIL ----
  app.post('/verify-email', {
    handler: async (request, reply) => {
      const { token } = verifyEmailSchema.parse(request.body);
      await AuthService.verifyEmail(token);
      return reply.send({ message: 'Email verified successfully' });
    },
  });

  // ---- REQUEST PASSWORD RESET ----
  app.post('/reset-password/request', {
    config: {
      rateLimit: {
        max: RATE_LIMITS.AUTH_RESET_MAX,
        timeWindow: RATE_LIMITS.AUTH_RESET_WINDOW_MS,
        keyGenerator: (req) => {
          const body = req.body as { email?: string } | undefined;
          return body?.email ?? req.ip;
        },
      },
    },
    handler: async (request, reply) => {
      const { email } = resetPasswordRequestSchema.parse(request.body);
      // Always return 200 — never reveal whether email exists
      // TODO: Implement reset email via Resend in Week 3
      void email; // used in service call
      return reply.send({
        message: 'If an account exists for that email, a reset link has been sent.',
      });
    },
  });
}
