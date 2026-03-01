/**
 * Seed script: Create default pipelines and stages for all tenants
 *
 * This script:
 * 1. Creates "New Business" and "Renewals" pipelines for each tenant
 * 2. Creates default stages for each pipeline
 * 3. Backfills pipeline_id on existing stages and deals
 *
 * Run with: pnpm tsx src/scripts/seed-pipelines.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { tenants, pipelines, pipelineStages, pipelineDeals } from '../schema';
import { eq, isNull } from 'drizzle-orm';

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

// Default stages for New Business pipeline
const NEW_BUSINESS_STAGES = [
  { name: 'Lead', position: 0, defaultProbability: 0, color: '#9ca3af' },
  { name: 'Qualified', position: 1, defaultProbability: 20, color: '#60a5fa' },
  { name: 'Discovery', position: 2, defaultProbability: 40, color: '#34d399' },
  { name: 'Proposal', position: 3, defaultProbability: 60, color: '#fbbf24' },
  { name: 'Negotiation', position: 4, defaultProbability: 80, color: '#fb923c' },
  { name: 'Closed Won', position: 5, defaultProbability: 100, isWon: true, color: '#22c55e' },
  { name: 'Closed Lost', position: 6, defaultProbability: 0, isLost: true, color: '#ef4444' },
];

// Default stages for Renewals pipeline
const RENEWALS_STAGES = [
  { name: 'Upcoming Renewal', position: 0, defaultProbability: 50, color: '#60a5fa' },
  { name: 'Renewal Negotiation', position: 1, defaultProbability: 75, color: '#fbbf24' },
  { name: 'Renewed', position: 2, defaultProbability: 100, isWon: true, color: '#22c55e' },
  { name: 'Churned', position: 3, defaultProbability: 0, isLost: true, color: '#ef4444' },
];

async function main() {
  console.log('🚀 Starting pipeline seed script...\n');

  // Get all tenants
  const allTenants = await db
    .select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(isNull(tenants.deletedAt));

  console.log(`📊 Found ${allTenants.length} tenant(s)\n`);

  for (const tenant of allTenants) {
    console.log(`\n📦 Processing tenant: ${tenant.name} (${tenant.id})`);

    // Check if tenant already has pipelines
    const existingPipelines = await db
      .select()
      .from(pipelines)
      .where(eq(pipelines.tenantId, tenant.id));

    if (existingPipelines.length > 0) {
      console.log(`  ⏭️  Tenant already has ${existingPipelines.length} pipeline(s), skipping...`);
      continue;
    }

    // Create "New Business" pipeline (default)
    const [newBusinessPipeline] = await db
      .insert(pipelines)
      .values({
        tenantId: tenant.id,
        name: 'New Business',
        description: 'Standard sales pipeline for net-new customers',
        isDefault: true,
        isActive: true,
        position: 0,
      })
      .returning();

    console.log(`  ✅ Created pipeline: New Business`);

    // Create stages for New Business
    for (const stage of NEW_BUSINESS_STAGES) {
      await db.insert(pipelineStages).values({
        tenantId: tenant.id,
        pipelineId: newBusinessPipeline.id,
        name: stage.name,
        position: stage.position,
        defaultProbability: stage.defaultProbability,
        isWon: stage.isWon || false,
        isLost: stage.isLost || false,
        color: stage.color,
      });
    }
    console.log(`  ✅ Created ${NEW_BUSINESS_STAGES.length} stages for New Business`);

    // Create "Renewals" pipeline
    const [renewalsPipeline] = await db
      .insert(pipelines)
      .values({
        tenantId: tenant.id,
        name: 'Renewals',
        description: 'Pipeline for customer renewals and contract extensions',
        isDefault: false,
        isActive: true,
        position: 1,
      })
      .returning();

    console.log(`  ✅ Created pipeline: Renewals`);

    // Create stages for Renewals
    for (const stage of RENEWALS_STAGES) {
      await db.insert(pipelineStages).values({
        tenantId: tenant.id,
        pipelineId: renewalsPipeline.id,
        name: stage.name,
        position: stage.position,
        defaultProbability: stage.defaultProbability,
        isWon: stage.isWon || false,
        isLost: stage.isLost || false,
        color: stage.color,
      });
    }
    console.log(`  ✅ Created ${RENEWALS_STAGES.length} stages for Renewals`);

    // Backfill existing stages with default pipeline ID
    const orphanedStages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.tenantId, tenant.id))
      .where(isNull(pipelineStages.pipelineId));

    if (orphanedStages.length > 0) {
      await db
        .update(pipelineStages)
        .set({ pipelineId: newBusinessPipeline.id })
        .where(eq(pipelineStages.tenantId, tenant.id))
        .where(isNull(pipelineStages.pipelineId));

      console.log(`  ✅ Backfilled ${orphanedStages.length} orphaned stage(s) with New Business pipeline`);
    }

    // Backfill existing deals with default pipeline ID
    const orphanedDeals = await db
      .select()
      .from(pipelineDeals)
      .where(eq(pipelineDeals.tenantId, tenant.id))
      .where(isNull(pipelineDeals.pipelineId));

    if (orphanedDeals.length > 0) {
      await db
        .update(pipelineDeals)
        .set({ pipelineId: newBusinessPipeline.id })
        .where(eq(pipelineDeals.tenantId, tenant.id))
        .where(isNull(pipelineDeals.pipelineId));

      console.log(`  ✅ Backfilled ${orphanedDeals.length} orphaned deal(s) with New Business pipeline`);
    }
  }

  console.log('\n\n✨ Pipeline seed script completed successfully!\n');

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});
