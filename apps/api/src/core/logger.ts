import pino from 'pino';

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  ...(process.env['NODE_ENV'] === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Production: structured JSON for Railway log aggregation
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
  redact: {
    // Never log sensitive fields
    paths: ['req.headers.authorization', 'body.password', 'body.passwordHash', '*.mfaSecret'],
    censor: '[REDACTED]',
  },
});
