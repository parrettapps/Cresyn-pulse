import { FolderKanban, Clock, DollarSign, Users, Plus } from 'lucide-react';
import { StatCard } from '../../../components/ui/stat-card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

const MOCK_PROJECTS = [
  { id: '1', name: 'AI Strategy Roadmap',   client: 'Acme Corp',       type: 'time_and_materials', budget: '120h',  logged: '48h',  status: 'active' },
  { id: '2', name: 'CX Transformation',     client: 'Summit Advisory', type: 'milestone',           budget: '$40K',  logged: '$12K', status: 'active' },
  { id: '3', name: 'Contact Center Audit',  client: 'BlueSky Partners',type: 'fixed_fee',           budget: '$8K',   logged: '$8K',  status: 'completed' },
  { id: '4', name: 'AI Readiness Review',   client: 'TechBridge Inc',  type: 'time_and_materials', budget: '40h',   logged: '12h',  status: 'paused' },
];

const TYPE_LABEL: Record<string, string> = {
  time_and_materials: 'T&M',
  milestone: 'Milestone',
  fixed_fee: 'Fixed Fee',
};

type StatusBadgeConfig = { label: string; variant: 'success' | 'primary' | 'neutral' | 'warning' };

const STATUS_BADGE: Record<string, StatusBadgeConfig> = {
  active:    { label: 'Active',     variant: 'primary' },
  completed: { label: 'Completed',  variant: 'success' },
  paused:    { label: 'Paused',     variant: 'warning' },
  cancelled: { label: 'Cancelled',  variant: 'neutral' },
};

const FALLBACK_STATUS_BADGE: StatusBadgeConfig = { label: 'Unknown', variant: 'neutral' };

export default function ProjectsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Projects</h1>
            <p className="mt-0.5 text-sm text-neutral-500">T&amp;M and milestone-based project tracking.</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <StatCard title="Active Projects" value="2" icon={FolderKanban} iconColor="primary" />
        <StatCard title="Hours Logged" value="60h" delta="This month" deltaDirection="neutral" icon={Clock} iconColor="secondary" />
        <StatCard title="Revenue Tracked" value="$20K" icon={DollarSign} iconColor="success" />
        <StatCard title="Team Members" value="3" icon={Users} iconColor="warning" />
      </div>

      <div className="mx-6 mb-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">All Projects</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Project</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Client</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Budget</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Logged</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {MOCK_PROJECTS.map((p) => {
                const statusBadge = STATUS_BADGE[p.status] ?? FALLBACK_STATUS_BADGE;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50/70 cursor-pointer transition-colors group">
                    <td className="px-5 py-3.5 font-medium text-neutral-900 group-hover:text-primary-600 transition-colors">{p.name}</td>
                    <td className="px-5 py-3.5 text-neutral-500">{p.client}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="neutral">{TYPE_LABEL[p.type] ?? p.type}</Badge>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-neutral-700">{p.budget}</td>
                    <td className="px-5 py-3.5 text-neutral-500">{p.logged}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusBadge.variant} dot>{statusBadge.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-400">Full projects module with milestones, team assignment, and budget tracking in Week 9</p>
        </div>
      </div>
    </div>
  );
}
