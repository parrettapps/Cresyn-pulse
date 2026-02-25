import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Connection pool for application queries
const queryClient = postgres(process.env['DATABASE_URL'], {
  max: 20, // max pool connections
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // required for PgBouncer compatibility
});

export const db = drizzle(queryClient, {
  schema,
  logger: process.env['NODE_ENV'] === 'development',
});

export type Database = typeof db;

// Separate connection for migrations (not pooled)
export function createMigrationClient() {
  const migrationClient = postgres(process.env['DATABASE_URL'] as string, {
    max: 1,
    prepare: false,
  });
  return drizzle(migrationClient);
}
