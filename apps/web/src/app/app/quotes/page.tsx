import { FileText, Send, CheckCircle, Clock, Plus } from 'lucide-react';
import { StatCard } from '../../../components/ui/stat-card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

const MOCK_QUOTES = [
  { id: 'Q-2026-001', client: 'Acme Corp',       title: 'AI Strategy Workshop',       total: '$12,500', status: 'accepted', date: 'Feb 10' },
  { id: 'Q-2026-002', client: 'Summit Advisory', title: 'Contact Center Assessment',  total: '$8,200',  status: 'sent',     date: 'Feb 18' },
  { id: 'Q-2026-003', client: 'BlueSky Partners',title: 'CX Transformation Roadmap',  total: '$24,000', status: 'draft',    date: 'Feb 22' },
  { id: 'Q-2026-004', client: 'TechBridge Inc',  title: 'AI Readiness Report',        total: '$5,500',  status: 'expired',  date: 'Jan 30' },
];

type QuoteStatusConfig = { label: string; variant: 'success' | 'info' | 'neutral' | 'warning' | 'danger' };

const STATUS_BADGE: Record<string, QuoteStatusConfig> = {
  accepted: { label: 'Accepted', variant: 'success' },
  sent:     { label: 'Sent',     variant: 'info' },
  draft:    { label: 'Draft',    variant: 'neutral' },
  expired:  { label: 'Expired',  variant: 'danger' },
  declined: { label: 'Declined', variant: 'danger' },
};

const FALLBACK_QUOTE_STATUS: QuoteStatusConfig = { label: 'Unknown', variant: 'neutral' };

export default function QuotesPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Quotes</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Create and manage client proposals.</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <StatCard title="Total Quotes" value="4" icon={FileText} iconColor="primary" />
        <StatCard title="Sent / Pending" value="1" icon={Send} iconColor="secondary" />
        <StatCard title="Accepted" value="1" delta="$12,500 value" deltaDirection="up" icon={CheckCircle} iconColor="success" />
        <StatCard title="Avg. Response" value="4d" icon={Clock} iconColor="warning" />
      </div>

      <div className="mx-6 mb-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-50/50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">All Quotes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Quote #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Title</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Client</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {MOCK_QUOTES.map((q) => {
                const badge = STATUS_BADGE[q.status] ?? FALLBACK_QUOTE_STATUS;
                return (
                  <tr key={q.id} className="hover:bg-neutral-50/70 cursor-pointer transition-colors group">
                    <td className="px-5 py-3.5 font-mono text-xs text-neutral-500">{q.id}</td>
                    <td className="px-5 py-3.5 font-medium text-neutral-900 group-hover:text-primary-600 transition-colors">{q.title}</td>
                    <td className="px-5 py-3.5 text-neutral-500">{q.client}</td>
                    <td className="px-5 py-3.5 font-semibold text-neutral-900">{q.total}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={badge.variant} dot>{badge.label}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-neutral-400 text-xs">{q.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-400">Full quoting module available in Week 8 — PDF export, line items, status workflow</p>
        </div>
      </div>
    </div>
  );
}
