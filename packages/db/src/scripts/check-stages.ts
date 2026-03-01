/**
 * Check script: Verify Won/Lost stages exist
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as schema from '../schema.js';
import { pipelineStages, pipelines, users, userTenantMemberships } from '../schema.js';
import { eq, and, isNull } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../../.env') });

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const client = postgres(databaseUrl);
const db = drizzle(client, { schema });

async function main() {
  console.log('🔍 Checking pipeline stages...\n');

  // Get user and tenant
  const user = await db.query.users.findFirst({
    where: eq(users.email, 'frankyoconnell@gmail.com'),
  });

  if (!user) {
    console.error('User not found');
    process.exit(1);
  }

  const membership = await db.query.userTenantMemberships.findFirst({
    where: eq(userTenantMemberships.userId, user.id),
  });

  if (!membership) {
    console.error('Membership not found');
    process.exit(1);
  }

  const tenantId = membership.tenantId;

  // Get default pipeline
  const pipeline = await db.query.pipelines.findFirst({
    where: and(
      eq(pipelines.tenantId, tenantId),
      eq(pipelines.isDefault, true),
      isNull(pipelines.deletedAt)
    ),
  });

  if (!pipeline) {
    console.error('Pipeline not found');
    process.exit(1);
  }

  console.log(`📊 Pipeline: ${pipeline.name}\n`);

  // Get all stages
  const stages = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.pipelineId, pipeline.id),
        isNull(pipelineStages.deletedAt)
      )
    )
    .orderBy(pipelineStages.position);

  console.log('Stages:');
  stages.forEach(s => {
    const flags = [];
    if (s.isWon) flags.push('WON');
    if (s.isLost) flags.push('LOST');
    const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
    console.log(`  ${s.position}. ${s.name}${flagStr}`);
    console.log(`     ID: ${s.id}`);
  });

  console.log();

  // Check for Won stage
  const wonStage = stages.find(s => s.isWon);
  if (wonStage) {
    console.log(`✅ Won stage found: "${wonStage.name}" (id: ${wonStage.id})`);
  } else {
    console.log('❌ No Won stage found!');
  }

  // Check for Lost stage
  const lostStage = stages.find(s => s.isLost);
  if (lostStage) {
    console.log(`✅ Lost stage found: "${lostStage.name}" (id: ${lostStage.id})`);
  } else {
    console.log('❌ No Lost stage found!');
  }

  await client.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
