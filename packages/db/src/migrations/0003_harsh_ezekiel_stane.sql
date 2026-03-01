-- Rename CRM module to Accounts (data migration from previous 0003 file)
UPDATE tenant_modules
SET module_key = 'accounts'
WHERE module_key = 'crm';
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid NOT NULL,
	"activity_type" text NOT NULL,
	"direction" text,
	"subject" text NOT NULL,
	"description" text,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"owner_id" uuid,
	"related_contact_id" uuid,
	"duration" integer,
	"outcome" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "deal_stage_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"deal_id" uuid NOT NULL,
	"from_stage_id" uuid,
	"to_stage_id" uuid NOT NULL,
	"days_in_previous_stage" integer,
	"moved_by" uuid,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
-- Add pipeline_id as nullable first (will be backfilled by seed script)
ALTER TABLE "pipeline_deals" ADD COLUMN "pipeline_id" uuid;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "probability_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "deal_type" text;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "forecast_category" text;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "next_step_description" text;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "next_step_due_date" date;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "last_activity_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD COLUMN "last_activity_type" text;--> statement-breakpoint
-- Add pipeline_id as nullable first (will be backfilled by seed script)
ALTER TABLE "pipeline_stages" ADD COLUMN "pipeline_id" uuid;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD COLUMN "default_probability" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_related_contact_id_contacts_id_fk" FOREIGN KEY ("related_contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_deal_id_pipeline_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."pipeline_deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_from_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_to_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_moved_by_users_id_fk" FOREIGN KEY ("moved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_resource_idx" ON "activities" USING btree ("tenant_id","resource_type","resource_id","created_at");--> statement-breakpoint
CREATE INDEX "activities_owner_due_idx" ON "activities" USING btree ("owner_id","due_date") WHERE "activities"."deleted_at" IS NULL AND "activities"."activity_type" = 'task' AND "activities"."completed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "activities_type_idx" ON "activities" USING btree ("tenant_id","activity_type","created_at") WHERE "activities"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "deal_history_deal_idx" ON "deal_stage_history" USING btree ("deal_id","moved_at");--> statement-breakpoint
CREATE INDEX "deal_history_tenant_stage_idx" ON "deal_stage_history" USING btree ("tenant_id","to_stage_id","moved_at");--> statement-breakpoint
CREATE INDEX "pipelines_tenant_idx" ON "pipelines" USING btree ("tenant_id","is_active","position") WHERE "pipelines"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "pipelines_tenant_default_unique" ON "pipelines" USING btree ("tenant_id") WHERE "pipelines"."deleted_at" IS NULL AND "pipelines"."is_default" = true;--> statement-breakpoint
ALTER TABLE "pipeline_deals" ADD CONSTRAINT "pipeline_deals_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deals_pipeline_idx" ON "pipeline_deals" USING btree ("pipeline_id","status") WHERE "pipeline_deals"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "deals_forecast_idx" ON "pipeline_deals" USING btree ("tenant_id","status","forecast_category","expected_close") WHERE "pipeline_deals"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "deals_close_date_idx" ON "pipeline_deals" USING btree ("tenant_id","expected_close") WHERE "pipeline_deals"."deleted_at" IS NULL AND "pipeline_deals"."status" = 'open';--> statement-breakpoint
CREATE INDEX "pipeline_stages_pipeline_idx" ON "pipeline_stages" USING btree ("pipeline_id","position") WHERE "pipeline_stages"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "stages_probability_check" CHECK ("pipeline_stages"."default_probability" BETWEEN 0 AND 100);