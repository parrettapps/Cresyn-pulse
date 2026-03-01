# Pipeline Module Migration Guide

This guide explains how to apply the pipeline/opportunities module migrations.

## Overview

The pipeline module introduces:
- **Pipelines table**: Support for multiple pipelines (New Business, Renewals, etc.)
- **Enhanced stages**: Stages now belong to pipelines, with default probability values
- **Enhanced deals**: Added tracking for source, deal type, forecast category, next steps, and activities
- **Deal stage history**: Audit trail of stage transitions
- **Activities table**: Track calls, meetings, emails, tasks

## Migration Steps

### 1. Apply Database Schema Migration (0003)

This migration creates new tables and adds columns (pipeline_id starts as nullable):

```bash
cd packages/db
pnpm drizzle-kit migrate
```

**What this does**:
- Creates `pipelines`, `deal_stage_history`, and `activities` tables
- Adds columns to `pipeline_stages` and `pipeline_deals`
- Adds indexes and constraints
- Updates `tenant_modules` to rename 'crm' → 'accounts'

### 2. Run Seed Script

This populates default pipelines and stages for all existing tenants:

```bash
cd packages/db
pnpm tsx src/scripts/seed-pipelines.ts
```

**What this does**:
- Creates "New Business" pipeline (default) for each tenant
- Creates "Renewals" pipeline for each tenant
- Creates default stages for each pipeline:
  - **New Business**: Lead → Qualified → Discovery → Proposal → Negotiation → Closed Won/Lost
  - **Renewals**: Upcoming Renewal → Renewal Negotiation → Renewed/Churned
- Backfills `pipeline_id` on existing stages and deals

### 3. Apply Constraint Migration (0004)

This makes pipeline_id NOT NULL after data has been seeded:

```bash
cd packages/db
pnpm drizzle-kit migrate
```

**What this does**:
- Adds NOT NULL constraint to `pipeline_stages.pipeline_id`
- Adds NOT NULL constraint to `pipeline_deals.pipeline_id`

## Rollback (if needed)

If you need to rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS deal_stage_history CASCADE;
DROP TABLE IF EXISTS pipelines CASCADE;

-- Remove new columns from pipeline_deals
ALTER TABLE pipeline_deals
  DROP COLUMN pipeline_id,
  DROP COLUMN probability_override,
  DROP COLUMN source,
  DROP COLUMN deal_type,
  DROP COLUMN forecast_category,
  DROP COLUMN next_step_description,
  DROP COLUMN next_step_due_date,
  DROP COLUMN last_activity_at,
  DROP COLUMN last_activity_type;

-- Remove new columns from pipeline_stages
ALTER TABLE pipeline_stages
  DROP COLUMN pipeline_id,
  DROP COLUMN default_probability;

-- Revert module rename
UPDATE tenant_modules
SET module_key = 'crm'
WHERE module_key = 'accounts';
```

## Verification

After migration, verify:

```sql
-- Check that all tenants have pipelines
SELECT
  t.name AS tenant,
  COUNT(p.id) AS pipeline_count
FROM tenants t
LEFT JOIN pipelines p ON p.tenant_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name;

-- Check that all stages have a pipeline
SELECT COUNT(*) AS orphaned_stages
FROM pipeline_stages
WHERE pipeline_id IS NULL AND deleted_at IS NULL;
-- Should return 0

-- Check that all deals have a pipeline
SELECT COUNT(*) AS orphaned_deals
FROM pipeline_deals
WHERE pipeline_id IS NULL AND deleted_at IS NULL;
-- Should return 0
```

## What's Next?

After successful migration:
1. Update API layer to handle new pipeline fields
2. Update UI to support pipeline selection
3. Implement stage transition tracking (populates deal_stage_history)
4. Implement activity logging
