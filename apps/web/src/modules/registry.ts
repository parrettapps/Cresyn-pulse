import type { ModuleKey, Permission } from '@cresyn/config';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// FRONTEND MODULE REGISTRY
// Controls which nav items and routes are visible based on
// the user's enabled modules (read from JWT claims).
//
// Adding a new module = implement WebModule + add one entry below.
// Zero changes to core layout code required.
// ============================================================

export interface NavItem {
  label: string;
  path: string;
  icon?: LucideIcon;
  badge?: string;
  children?: NavItem[];
}

export interface WebModule {
  key: ModuleKey;
  name: string;
  description: string;
  navItems: NavItem[];
  requiredPermissions: Permission[]; // any one of these = show nav items
  icon?: LucideIcon;
}

// Modules are imported lazily as they are built
export const webModuleRegistry: WebModule[] = [
  {
    key: 'accounts',
    name: 'Accounts',
    description: 'Companies, contacts, and relationships',
    requiredPermissions: ['accounts:companies:read'],
    navItems: [
      { label: 'Companies', path: '/app/accounts/companies' },
      { label: 'Contacts', path: '/app/accounts/contacts' },
    ],
  },
  {
    key: 'pipeline',
    name: 'Pipeline',
    description: 'Deals and quotes',
    requiredPermissions: ['pipeline:deals:read'],
    navItems: [
      { label: 'Deals', path: '/app/pipeline' },
      { label: 'Quotes', path: '/app/pipeline/quotes' },
    ],
  },
  {
    key: 'timesheets',
    name: 'Timesheets',
    description: 'Time tracking and approvals',
    requiredPermissions: ['timesheets:entries:read_own'],
    navItems: [
      { label: 'My Time', path: '/app/timesheets' },
      { label: 'Approvals', path: '/app/timesheets/approvals' },
    ],
  },
  {
    key: 'projects',
    name: 'Projects',
    description: 'Project tracking and milestones',
    requiredPermissions: ['projects:projects:read'],
    navItems: [{ label: 'Projects', path: '/app/projects' }],
  },
];

// Returns nav items visible to the current user based on their modules + permissions
export function getVisibleNavItems(
  enabledModules: ModuleKey[],
  userPermissions: Permission[],
): NavItem[] {
  return webModuleRegistry
    .filter((mod) => enabledModules.includes(mod.key))
    .filter((mod) => mod.requiredPermissions.some((p) => userPermissions.includes(p)))
    .flatMap((mod) => mod.navItems);
}
