import type { FastifyPluginAsync } from 'fastify';
import type { ModuleKey, Permission } from '@cresyn/config';

// ============================================================
// API MODULE REGISTRY
// Each module implements this interface and registers itself here.
// Adding a new module = implement interface + add one line below.
// Zero changes to core server code required.
// ============================================================

export interface ApiModule {
  key: ModuleKey;
  name: string;
  version: string;
  routes: FastifyPluginAsync;
  permissions: Permission[];
}

// Import module route plugins (added as modules are built)
import { crmRoutes } from './crm/crm.routes.js';
import { pipelineRoutes } from './pipeline/pipeline.routes.js';
import { timesheetRoutes } from './timesheets/timesheets.routes.js';
import { projectRoutes } from './projects/projects.routes.js';

export const moduleRegistry: ApiModule[] = [
  {
    key: 'crm',
    name: 'CRM',
    version: '1.0.0',
    routes: crmRoutes,
    permissions: [
      'crm:companies:read',
      'crm:companies:create',
      'crm:companies:update',
      'crm:companies:delete',
      'crm:contacts:read',
      'crm:contacts:create',
      'crm:contacts:update',
      'crm:contacts:delete',
      'crm:notes:read',
      'crm:notes:create',
      'crm:notes:update',
      'crm:notes:delete',
      'crm:documents:read',
      'crm:documents:upload',
    ],
  },
  {
    key: 'pipeline',
    name: 'Pipeline',
    version: '1.0.0',
    routes: pipelineRoutes,
    permissions: [
      'pipeline:deals:read',
      'pipeline:deals:create',
      'pipeline:deals:update',
      'pipeline:deals:delete',
      'pipeline:stages:manage',
      'pipeline:quotes:read',
      'pipeline:quotes:create',
      'pipeline:quotes:update',
      'pipeline:quotes:export',
    ],
  },
  {
    key: 'timesheets',
    name: 'Timesheets',
    version: '1.0.0',
    routes: timesheetRoutes,
    permissions: [
      'timesheets:entries:read_own',
      'timesheets:entries:read_all',
      'timesheets:entries:create',
      'timesheets:entries:update_own',
      'timesheets:entries:update_all',
      'timesheets:entries:approve',
      'timesheets:reports:view',
    ],
  },
  {
    key: 'projects',
    name: 'Projects',
    version: '1.0.0',
    routes: projectRoutes,
    permissions: [
      'projects:projects:read',
      'projects:projects:create',
      'projects:projects:update',
      'projects:projects:delete',
      'projects:team:assign',
      'projects:milestones:manage',
    ],
  },
];
