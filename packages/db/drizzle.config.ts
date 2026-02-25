import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from the monorepo root (two levels up from packages/db)
config({ path: resolve(__dirname, '../../.env') });

const url = process.env['DATABASE_URL'];
if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Make sure .env exists in the repo root with DATABASE_URL defined.',
  );
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
