/**
 * Check user permissions
 *
 * Run with: pnpm tsx src/scripts/check-user-permissions.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { users, userTenantMemberships, tenants, tenantModules } from '../schema';
import { eq } from 'drizzle-orm';

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
  const email = 'frankyoconnell@gmail.com';

  console.log(`🔍 Checking permissions for ${email}\n`);

  // Find user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user.length === 0) {
    console.log('❌ User not found');
    await client.end();
    process.exit(1);
  }

  console.log(`✅ User found: ${user[0].fullName} (${user[0].id})`);
  console.log(`   Email: ${user[0].email}`);
  console.log(`   Active: ${user[0].isActive}`);
  console.log();

  // Get tenant memberships
  const memberships = await db
    .select()
    .from(userTenantMemberships)
    .where(eq(userTenantMemberships.userId, user[0].id));

  console.log(`📊 Tenant Memberships (${memberships.length}):`);
  for (const membership of memberships) {
    // Get tenant name
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, membership.tenantId))
      .limit(1);

    console.log(`\n  Tenant: ${tenant[0]?.name || 'Unknown'} (${membership.tenantId})`);
    console.log(`  Role: ${membership.role}`);
    console.log(`  Active: ${membership.isActive}`);

    // Get enabled modules for this tenant
    const modules = await db
      .select()
      .from(tenantModules)
      .where(eq(tenantModules.tenantId, membership.tenantId));

    console.log(`  Enabled Modules:`);
    for (const mod of modules) {
      console.log(`    - ${mod.moduleKey} (enabled: ${mod.enabled})`);
    }
  }

  console.log('\n');

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
