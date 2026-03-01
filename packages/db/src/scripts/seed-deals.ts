/**
 * Seed script: Create sample deals across pipeline stages
 *
 * This script creates 2-4 deals in each stage of the pipeline for a specific tenant.
 * Deal sizes range from $15K to $250K with expected close dates from 3/31/26 to 6/30/26.
 *
 * Run with: pnpm tsx src/scripts/seed-deals.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as schema from '../schema.js';
import { users, userTenantMemberships, pipelines, pipelineStages, pipelineDeals, companies } from '../schema.js';
import { eq, isNull, and } from 'drizzle-orm';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from repo root
config({ path: resolve(__dirname, '../../../../.env') });

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

// Deal name templates
const DEAL_NAMES = [
  'Platform Migration',
  'Enterprise License',
  'Cloud Integration',
  'Digital Transformation',
  'Analytics Platform',
  'Security Upgrade',
  'System Implementation',
  'Consulting Services',
  'Annual Support Contract',
  'Custom Development',
  'Training Program',
  'Infrastructure Upgrade',
  'API Integration',
  'Mobile App Development',
  'Data Migration',
  'Compliance Solution',
];

// Deal sources
const SOURCES = ['inbound', 'outbound', 'referral', 'partner'] as const;

// Deal types
const DEAL_TYPES = ['new_business', 'expansion', 'renewal', 'churn_recovery'] as const;

// Forecast categories
const FORECAST_CATEGORIES = ['commit', 'best_case', 'pipeline', 'omitted'] as const;

function randomElement<T>(array: readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDealValue(): number {
  // Generate values between $15,000 and $250,000
  const min = 15000;
  const max = 250000;
  // Round to nearest $1000
  return Math.round((Math.random() * (max - min) + min) / 1000) * 1000;
}

function randomCloseDate(): string {
  // Dates between 3/31/26 and 6/30/26
  const startDate = new Date('2026-03-31');
  const endDate = new Date('2026-06-30');
  const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime());
  const randomDate = new Date(randomTime);
  // Format as YYYY-MM-DD
  return randomDate.toISOString().split('T')[0]!;
}

function generateDealName(companyName: string, template: string): string {
  return `${companyName} - ${template}`;
}

async function main() {
  console.log('🚀 Starting deals seed script...\n');

  // Get the specific user by email
  const targetEmail = 'frankyoconnell@gmail.com';
  const user = await db.query.users.findFirst({
    where: eq(users.email, targetEmail),
    columns: { id: true, email: true },
  });

  if (!user) {
    console.error(`❌ User not found: ${targetEmail}`);
    process.exit(1);
  }

  console.log(`👤 Found user: ${user.email}`);

  // Get user's tenant
  const membership = await db.query.userTenantMemberships.findFirst({
    where: eq(userTenantMemberships.userId, user.id),
    columns: { tenantId: true },
  });

  if (!membership) {
    console.error('❌ User is not a member of any tenant.');
    process.exit(1);
  }

  const tenantId = membership.tenantId;
  console.log(`🏢 Using tenant: ${tenantId}\n`);

  // Get the default pipeline
  const pipeline = await db.query.pipelines.findFirst({
    where: and(
      eq(pipelines.tenantId, tenantId),
      eq(pipelines.isDefault, true),
      isNull(pipelines.deletedAt)
    ),
  });

  if (!pipeline) {
    console.error('❌ No default pipeline found for tenant.');
    process.exit(1);
  }

  console.log(`📊 Using pipeline: ${pipeline.name}\n`);

  // Get all stages for this pipeline (excluding Won/Lost stages)
  const stages = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.pipelineId, pipeline.id),
        eq(pipelineStages.tenantId, tenantId),
        eq(pipelineStages.isWon, false),
        eq(pipelineStages.isLost, false),
        isNull(pipelineStages.deletedAt)
      )
    )
    .orderBy(pipelineStages.position);

  console.log(`🎯 Found ${stages.length} active stages (excluding Won/Lost):\n`);
  stages.forEach(stage => {
    console.log(`   - ${stage.name} (${stage.defaultProbability}% probability)`);
  });
  console.log();

  // Get existing companies to associate with deals
  const existingCompanies = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.tenantId, tenantId),
        isNull(companies.deletedAt)
      )
    )
    .limit(20);

  if (existingCompanies.length === 0) {
    console.error('❌ No companies found for tenant. Please run seed-crm.ts first.');
    process.exit(1);
  }

  console.log(`🏢 Found ${existingCompanies.length} companies to use for deals\n`);

  // Create 2-4 deals per stage
  let totalDealsCreated = 0;
  const usedDealNames = new Set<string>();

  for (const stage of stages) {
    const numDeals = randomInt(2, 4);
    console.log(`\n📦 Creating ${numDeals} deals for stage: ${stage.name}`);

    for (let i = 0; i < numDeals; i++) {
      // Pick a random company
      const company = randomElement(existingCompanies);

      // Generate a unique deal name
      let dealName: string;
      let attempts = 0;
      do {
        const template = randomElement(DEAL_NAMES);
        dealName = generateDealName(company.name, template);
        attempts++;
        if (attempts > 50) {
          // Fallback to ensure uniqueness
          dealName = `${dealName} (${Date.now()})`;
          break;
        }
      } while (usedDealNames.has(dealName));

      usedDealNames.add(dealName);

      const dealValue = randomDealValue();
      const closeDate = randomCloseDate();
      const source = randomElement(SOURCES);
      const dealType = randomElement(DEAL_TYPES);

      // Assign forecast category based on probability and stage
      let forecastCategory: typeof FORECAST_CATEGORIES[number];
      if (stage.defaultProbability >= 80) {
        forecastCategory = 'commit';
      } else if (stage.defaultProbability >= 50) {
        forecastCategory = randomElement(['commit', 'best_case']);
      } else if (stage.defaultProbability >= 20) {
        forecastCategory = randomElement(['best_case', 'pipeline']);
      } else {
        forecastCategory = 'pipeline';
      }

      // Create the deal
      const [deal] = await db
        .insert(pipelineDeals)
        .values({
          tenantId,
          pipelineId: pipeline.id,
          companyId: company.id,
          stageId: stage.id,
          name: dealName,
          value: dealValue.toString(),
          currency: 'USD',
          probability: stage.defaultProbability,
          expectedClose: closeDate,
          ownerId: user.id,
          status: 'open',
          source,
          dealType,
          forecastCategory,
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();

      if (deal) {
        console.log(`  ✓ ${dealName}`);
        console.log(`    💰 $${dealValue.toLocaleString()} | 📅 ${closeDate} | ${source} | ${dealType}`);
        totalDealsCreated++;
      }
    }
  }

  console.log('\n\n✨ Deals seed script completed successfully!\n');
  console.log(`📊 Summary:`);
  console.log(`   - Pipeline: ${pipeline.name}`);
  console.log(`   - Stages processed: ${stages.length}`);
  console.log(`   - Total deals created: ${totalDealsCreated}\n`);

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Seed script failed:', error);
  process.exit(1);
});
