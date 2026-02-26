import { TrendingUp, DollarSign, Target, Calendar, Plus } from 'lucide-react';
import { StatCard } from '../../../components/ui/stat-card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

const STAGES = [
  { name: 'Prospecting',  deals: 3,  value: '$42,500',  color: 'bg-neutral-300' },
  { name: 'Qualification',deals: 2,  value: '$28,000',  color: 'bg-secondary-300' },
  { name: 'Proposal',     deals: 4,  value: '$115,000', color: 'bg-primary-300' },
  { name: 'Negotiation',  deals: 1,  value: '$60,000',  color: 'bg-amber-300' },
  { name: 'Closed Won',   deals: 5,  value: '$190,000', color: 'bg-green-400' },
];

export default function PipelinePage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Pipeline</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Deal stages and opportunity tracking.</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Deal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <StatCard title="Open Deals" value="10" icon={TrendingUp} iconColor="primary" />
        <StatCard title="Pipeline Value" value="$245K" delta="+12% vs last month" deltaDirection="up" icon={DollarSign} iconColor="success" />
        <StatCard title="Win Rate" value="33%" icon={Target} iconColor="secondary" />
        <StatCard title="Avg. Deal Age" value="18d" icon={Calendar} iconColor="warning" />
      </div>

      {/* Kanban placeholder */}
      <div className="mx-6 mb-6 grid grid-cols-5 gap-3">
        {STAGES.map((stage) => (
          <div key={stage.name} className="flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`inline-block h-2 w-2 rounded-full ${stage.color}`} />
                <span className="text-xs font-semibold text-neutral-700">{stage.name}</span>
              </div>
              <Badge variant="neutral">{stage.deals}</Badge>
            </div>
            <div className="flex flex-col gap-2 p-3">
              <p className="text-xs font-medium text-neutral-500">{stage.value}</p>
              <div className="rounded-lg border border-dashed border-neutral-200 p-3 text-center">
                <p className="text-[11px] text-neutral-400">Module coming in Week 7</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
