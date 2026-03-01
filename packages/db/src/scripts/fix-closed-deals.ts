/**
 * Fix script: Update stageId for closed deals
 *
 * This script finds all deals with status='closed_won' or 'closed_lost' but
 * are not in the appropriate Won/Lost stage, and moves them to the correct stage.
 *
 * Run with: pnpm tsx src/scripts/fix-closed-deals.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as schema from '../schema.js';
import { pipelineDeals, pipelineStages } from '../schema.js';
import { eq, and, or, isNull } from 'drizzle-orm';

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

async function main() {
  console.log('🔧 Starting closed deals fix script...\n');

  // Find all closed deals that might be in the wrong stage
  const closedDeals = await db
    .select({
      deal: pipelineDeals,
      stage: pipelineStages,
    })
    .from(pipelineDeals)
    .innerJoin(pipelineStages, eq(pipelineDeals.stageId, pipelineStages.id))
    .where(
      and(
        or(
          eq(pipelineDeals.status, 'closed_won'),
          eq(pipelineDeals.status, 'closed_lost')
        ),
        isNull(pipelineDeals.deletedAt)
      )
    );

  console.log(`📊 Found ${closedDeals.length} closed deal(s)\n`);

  let fixedCount = 0;

  for (const row of closedDeals) {
    const { deal, stage } = row;

    // Check if deal is in wrong stage
    const isWrongStage =
      (deal.status === 'closed_won' && !stage.isWon) ||
      (deal.status === 'closed_lost' && !stage.isLost);

    if (!isWrongStage) {
      console.log(`✓ ${deal.name} - Already in correct ${deal.status} stage`);
      continue;
    }

    console.log(`⚠️  ${deal.name} - Status: ${deal.status}, but in stage: ${stage.name}`);

    // Find the correct Won/Lost stage for this pipeline
    const correctStage = await db
      .select()
      .from(pipelineStages)
      .where(
        and(
          eq(pipelineStages.pipelineId, deal.pipelineId),
          eq(pipelineStages.tenantId, deal.tenantId),
          deal.status === 'closed_won'
            ? eq(pipelineStages.isWon, true)
            : eq(pipelineStages.isLost, true),
          isNull(pipelineStages.deletedAt)
        )
      )
      .limit(1);

    if (!correctStage[0]) {
      console.log(`   ❌ No ${deal.status === 'closed_won' ? 'Won' : 'Lost'} stage found for pipeline`);
      continue;
    }

    // Update the deal to the correct stage
    await db
      .update(pipelineDeals)
      .set({
        stageId: correctStage[0].id,
        updatedAt: new Date(),
      })
      .where(eq(pipelineDeals.id, deal.id));

    console.log(`   ✅ Moved to ${correctStage[0].name} stage`);
    fixedCount++;
  }

  console.log('\n\n✨ Fix script completed!');
  console.log(`📊 Summary:`);
  console.log(`   - Total closed deals: ${closedDeals.length}`);
  console.log(`   - Fixed: ${fixedCount}`);
  console.log(`   - Already correct: ${closedDeals.length - fixedCount}\n`);

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Fix script failed:', error);
  process.exit(1);
});
