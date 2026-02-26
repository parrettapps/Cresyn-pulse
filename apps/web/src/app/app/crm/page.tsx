import { Users, Building2, StickyNote, UserPlus } from 'lucide-react';
import { StatCard } from '../../../components/ui/stat-card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

/* ------------------------------------------------------------------ */
/* Mock data — will be replaced with API calls in Week 5               */
/* ------------------------------------------------------------------ */

const MOCK_COMPANIES = [
  { id: '1', name: 'Acme Corp',         type: 'customer', contacts: 3, city: 'New York, NY',    status: 'active' },
  { id: '2', name: 'TechBridge Inc',    type: 'partner',  contacts: 1, city: 'Austin, TX',      status: 'active' },
  { id: '3', name: 'Summit Advisory',   type: 'customer', contacts: 5, city: 'Chicago, IL',     status: 'active' },
  { id: '4', name: 'Meridian Group',    type: 'vendor',   contacts: 2, city: 'San Francisco, CA', status: 'inactive' },
  { id: '5', name: 'BlueSky Partners',  type: 'partner',  contacts: 4, city: 'Boston, MA',      status: 'active' },
];

type TypeBadgeConfig = { label: string; variant: 'primary' | 'secondary' | 'neutral' | 'success' | 'warning' };

const TYPE_BADGE: Record<string, TypeBadgeConfig> = {
  customer: { label: 'Customer', variant: 'primary' },
  partner:  { label: 'Partner',  variant: 'secondary' },
  vendor:   { label: 'Vendor',   variant: 'neutral' },
  supplier: { label: 'Supplier', variant: 'warning' },
};

const FALLBACK_TYPE_BADGE: TypeBadgeConfig = { label: 'Other', variant: 'neutral' };

/* ------------------------------------------------------------------ */
/* Page                                                                  */
/* ------------------------------------------------------------------ */

export default function CRMPage() {
  return (
    <div className="flex flex-col min-h-full">
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">CRM</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Companies, contacts, and notes.</p>
          </div>
          <Button size="sm">
            <UserPlus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <StatCard
          title="Total Companies"
          value="5"
          delta="+2 this month"
          deltaDirection="up"
          icon={Building2}
          iconColor="primary"
        />
        <StatCard
          title="Active Contacts"
          value="15"
          delta="+5 this month"
          deltaDirection="up"
          icon={Users}
          iconColor="secondary"
        />
        <StatCard
          title="Open Notes"
          value="8"
          icon={StickyNote}
          iconColor="warning"
        />
        <StatCard
          title="New This Week"
          value="2"
          delta="On track"
          deltaDirection="neutral"
          icon={UserPlus}
          iconColor="success"
        />
      </div>

      {/* ── Company table ───────────────────────────────────────── */}
      <div className="mx-6 mb-6 flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <div className="flex items-center gap-1">
            {['All', 'Customers', 'Partners', 'Vendors'].map((tab, i) => (
              <button
                key={tab}
                type="button"
                className={
                  i === 0
                    ? 'rounded-md px-3 py-1.5 text-xs font-semibold bg-neutral-100 text-neutral-800'
                    : 'rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 transition-colors'
                }
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search companies…"
              className="h-8 w-48 rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-xs placeholder:text-neutral-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Contacts
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {MOCK_COMPANIES.map((company) => {
                const typeBadge = TYPE_BADGE[company.type] ?? FALLBACK_TYPE_BADGE;
                return (
                  <tr
                    key={company.id}
                    className="hover:bg-neutral-50/70 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-bold text-neutral-600">
                          {company.name.charAt(0)}
                        </div>
                        <span className="font-medium text-neutral-900 group-hover:text-primary-600 transition-colors">
                          {company.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500">{company.city}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-neutral-700">
                        <Users className="h-3.5 w-3.5 text-neutral-400" />
                        {company.contacts}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={company.status === 'active' ? 'success' : 'neutral'}
                        dot
                      >
                        {company.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        className="hidden group-hover:inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                      >
                        Open →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-400">Showing 5 of 5 companies</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="xs" disabled>← Prev</Button>
            <Button variant="outline" size="xs" disabled>Next →</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
