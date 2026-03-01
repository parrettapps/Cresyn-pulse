-- Make pipeline_id NOT NULL after seed script has populated the data
-- This migration should be run AFTER running the seed-pipelines.ts script

-- Make pipeline_id required on pipeline_stages
ALTER TABLE "pipeline_stages"
  ALTER COLUMN "pipeline_id" SET NOT NULL;
--> statement-breakpoint

-- Make pipeline_id required on pipeline_deals
ALTER TABLE "pipeline_deals"
  ALTER COLUMN "pipeline_id" SET NOT NULL;
