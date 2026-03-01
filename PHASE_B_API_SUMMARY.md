# Phase B: API Design - Complete Summary

## ✅ What Was Built

### Files Created (6 files, ~2,400 lines of code)

#### 1. Validation Schemas
**File**: `apps/api/src/modules/pipeline/pipeline.validation.ts` (360 lines)

**Schemas**:
- ✅ `createPipelineSchema`, `updatePipelineSchema`
- ✅ `createStageSchema`, `updateStageSchema`, `reorderStagesSchema`
- ✅ `createDealSchema`, `updateDealSchema`, `listDealsSchema`
- ✅ `moveStageSchema`, `closeDealSchema`
- ✅ `createActivitySchema`, `updateActivitySchema`, `listActivitiesSchema`, `completeTaskSchema`
- ✅ `forecastReportSchema`, `staleDealsSchema`

**Features**:
- Zod validation with detailed error messages
- Type-safe inferred TypeScript types
- Date format validation (YYYY-MM-DD for calendar dates)
- Enum validation for deal types, sources, forecast categories
- Custom validation rules (e.g., lostReason required when status = closed_lost)

---

#### 2. Repositories (4 files)

All repositories extend `BaseRepository` for automatic tenant-scoping and soft-delete handling.

##### A. Deal Repository (560 lines)
**File**: `apps/api/src/modules/pipeline/repositories/deal.repository.ts`

**Methods**:
- `list(filters)` — Paginated list with 11 filter options (pipeline, stage, owner, status, date ranges, value ranges, search)
- `findByIdWithRelations(id)` — Get deal with company, stage, and owner details
- `create(input)` — Create deal with auto-probability from stage default
- `update(id, input)` — Update deal with validation
- `moveStage(id, input)` — Move deal to different stage with history tracking
- `closeDeal(id, input)` — Mark as won/lost with validation

**Features**:
- Auto-populates `dealStageHistory` when stage changes
- Calculates `daysInPreviousStage` for velocity metrics
- Auto-sets probability from stage default (unless manually overridden)
- Validates stage belongs to pipeline before moving
- Prevents closing already-closed deals
- Full audit logging

##### B. Pipeline Repository (160 lines)
**File**: `apps/api/src/modules/pipeline/repositories/pipeline.repository.ts`

**Methods**:
- `list()` — List all pipelines for tenant
- `findByIdWithStages(id)` — Get pipeline with all stages
- `getDefault()` — Get default pipeline
- `create(input)` — Create pipeline (auto-unsets previous default if isDefault=true)
- `update(id, input)` — Update pipeline

**Features**:
- Enforces single default pipeline per tenant
- Auto-calculates position for new pipelines
- Includes stages when fetching pipeline details

##### C. Stage Repository (160 lines)
**File**: `apps/api/src/modules/pipeline/repositories/stage.repository.ts`

**Methods**:
- `listByPipeline(pipelineId)` — List stages in order
- `create(input)` — Create stage
- `update(id, input)` — Update stage
- `reorder(input)` — Bulk reorder stages
- `softDelete(id)` — Validates no active deals before delete

**Features**:
- Prevents deleting stages with active deals
- Supports bulk reordering
- Auto-orders stages by position

##### D. Activity Repository (280 lines)
**File**: `apps/api/src/modules/pipeline/repositories/activity.repository.ts`

**Methods**:
- `list(filters)` — Paginated list with filters (resource type, activity type, owner, tasks only)
- `create(input)` — Create activity and update `lastActivityAt` on deals
- `update(id, input)` — Update activity
- `completeTask(id, completedAt)` — Mark task as complete

**Features**:
- Auto-updates `lastActivityAt` on deals when activity logged
- Filters for uncompleted tasks
- Includes owner and relatedContact relations

---

#### 3. API Routes (880 lines)
**File**: `apps/api/src/modules/pipeline/pipeline.routes.ts`

### **Pipeline Routes** (Admin only - requires `PIPELINE_STAGES_MANAGE`)
- `GET /pipelines` — List all pipelines
- `GET /pipelines/:id` — Get pipeline with stages
- `POST /pipelines` — Create pipeline
- `PATCH /pipelines/:id` — Update pipeline
- `DELETE /pipelines/:id` — Soft delete pipeline

### **Stage Routes** (Admin only - requires `PIPELINE_STAGES_MANAGE`)
- `GET /pipelines/:id/stages` — List stages for pipeline
- `POST /stages` — Create stage
- `PATCH /stages/:id` — Update stage
- `POST /stages/reorder` — Reorder stages
- `DELETE /stages/:id` — Soft delete stage

### **Deal Routes** (Requires `PIPELINE_DEALS_*` permissions)
- `GET /deals` — List deals with filters
- `GET /deals/:id` — Get single deal
- `POST /deals` — Create deal
- `PATCH /deals/:id` — Update deal
- `POST /deals/:id/move-stage` — Move to different stage
- `POST /deals/:id/close` — Close deal (won or lost)
- `DELETE /deals/:id` — Soft delete deal

### **Activity Routes** (Requires `PIPELINE_DEALS_*` permissions)
- `GET /activities` — List activities with filters
- `POST /activities` — Create activity
- `PATCH /activities/:id` — Update activity
- `POST /activities/:id/complete` — Complete task
- `DELETE /activities/:id` — Soft delete activity

---

## Features Implemented

### 1. Tenant Isolation ✅
- All queries automatically scoped to `tenantId`
- BaseRepository enforces tenant security
- Impossible to access data from other tenants

### 2. Soft Deletes ✅
- All deletions are soft (set `deletedAt` timestamp)
- Deleted records excluded from queries automatically
- Audit trail preserved

### 3. Audit Logging ✅
- Every create/update/delete logged to `audit_logs` table
- Captures before/after state
- Records actor, IP address, user agent, request ID

### 4. Validation ✅
- Zod schemas for all inputs
- RFC 7807 Problem Details error format
- Detailed field-level error messages

### 5. Permissions ✅
- Integration with existing RBAC system
- Module-level access control
- Action-level permissions (read/create/update/delete/manage)

### 6. Pagination ✅
- Cursor-based pagination for scalability
- Encoded cursors (base64 JSON)
- Configurable limits (1-1000 records)

### 7. Business Logic ✅
- **Stage Transitions**:
  - Validates stage belongs to pipeline
  - Auto-updates probability from stage default
  - Tracks days in previous stage
  - Prevents invalid transitions
- **Deal Closing**:
  - Requires `actualClose` date
  - Requires `lostReason` when lost
  - Prevents double-closing
- **Activity Tracking**:
  - Auto-updates `lastActivityAt` on deals
  - Enables stale deal detection

### 8. Performance ✅
- Indexed queries for all common filters
- Minimal joins (only what's needed)
- Cursor pagination (no OFFSET scans)

---

## API Examples

### Create Deal
```bash
POST /api/deals
Content-Type: application/json

{
  "pipelineId": "uuid-here",
  "stageId": "uuid-here",
  "companyId": "uuid-here",
  "name": "Acme Corp - Enterprise Plan",
  "value": 50000,
  "currency": "USD",
  "expectedClose": "2026-06-30",
  "source": "inbound",
  "dealType": "new_business",
  "forecastCategory": "best_case",
  "ownerId": "uuid-here"
}
```

**Response**:
```json
{
  "id": "uuid",
  "pipelineId": "uuid",
  "stageId": "uuid",
  "name": "Acme Corp - Enterprise Plan",
  "value": "50000.00",
  "currency": "USD",
  "probability": 40,
  "expectedClose": "2026-06-30",
  "status": "open",
  "company": {
    "id": "uuid",
    "name": "Acme Corp"
  },
  "stage": {
    "id": "uuid",
    "name": "Discovery",
    "color": "#34d399"
  },
  "owner": {
    "id": "uuid",
    "fullName": "Jane Smith",
    "avatarUrl": "https://..."
  },
  "createdAt": "2026-03-01T12:00:00Z",
  ...
}
```

### List Deals (Filtered)
```bash
GET /api/deals?pipelineId=uuid&status=open&ownerId=uuid&forecastCategory=commit&limit=50
```

### Move Deal to Stage
```bash
POST /api/deals/:id/move-stage
Content-Type: application/json

{
  "toStageId": "uuid-here",
  "notes": "Moving to Proposal after successful discovery call"
}
```

### Close Deal as Won
```bash
POST /api/deals/:id/close
Content-Type: application/json

{
  "status": "closed_won",
  "actualClose": "2026-03-01",
  "notes": "Contract signed!"
}
```

### Log Activity
```bash
POST /api/activities
Content-Type: application/json

{
  "resourceType": "deal",
  "resourceId": "uuid-here",
  "activityType": "call",
  "direction": "outbound",
  "subject": "Discovery call with CTO",
  "description": "Discussed technical requirements...",
  "duration": 45,
  "outcome": "interested",
  "relatedContactId": "uuid-here"
}
```

---

## What's NOT Built Yet (Phase C: UI)

- Kanban board UI
- Deal detail modal
- Forecast view
- Reports/dashboards
- Stale deal alerts (backend logic ready, UI needed)
- Forecast rollup endpoint (deferred to Phase C)

---

## Next Steps

Ready to proceed to **Phase C: UI Development**?

This would include:
1. Kanban board with drag-and-drop
2. Deal detail modal
3. Activity timeline component
4. Pipeline selector
5. Filters and search

OR

Would you prefer to:
1. Test the API first (write integration tests)?
2. Run the migrations and seed script on your dev database?
3. Update permissions config to add any missing ones?

Let me know what you'd like to tackle next!
