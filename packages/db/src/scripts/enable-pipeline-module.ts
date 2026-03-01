/**
 * Enable pipeline module for all tenants
 *
 * Run with: pnpm tsx src/scripts/enable-pipeline-module.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { tenants, tenantModules } from '../schema';
import { isNull, eq, and } from 'drizzle-orm';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from repo root
config({ path: resolve(__dirname, '../../../.env') });

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(databaseUrl);
const db = drizzle(client);

async function main() {
  console.log('🚀 Enabling pipeline module for all tenants...\n');

  // Get all active tenants
  const allTenants = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(isNull(tenants.deletedAt));

  console.log(`📊 Found ${allTenants.length} tenant(s)\n`);

  for (const tenant of allTenants) {
    console.log(`\n📦 Processing tenant: ${tenant.name} (${tenant.id})`);

    // Check if pipeline module already exists
    const existingModule = await db
      .select()
      .from(tenantModules)
      .where(
        and(
          eq(tenantModules.tenantId, tenant.id),
          eq(tenantModules.moduleKey, 'pipeline')
        )
      );

    if (existingModule.length > 0) {
      console.log(`  ⏭️  Pipeline module already enabled, skipping...`);
      continue;
    }

    // Add pipeline module
    await db.insert(tenantModules).values({
      tenantId: tenant.id,
      moduleKey: 'pipeline',
      enabled: true,
      enabledAt: new Date(),
    });

    console.log(`  ✅ Pipeline module enabled`);
  }

  console.log('\n\n✨ Pipeline module enabled for all tenants!\n');

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
