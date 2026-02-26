import { Clock, CheckCircle, AlertCircle, CalendarDays, Plus } from 'lucide-react';
import { StatCard } from '../../../components/ui/stat-card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const THIS_WEEK = [
  { project: 'AI Strategy Roadmap',  type: 'billable',     hours: [3, 4, 2, 0, 0] },
  { project: 'CX Transformation',    type: 'billable',     hours: [0, 0, 4, 3, 4] },
  { project: 'Internal — Admin',     type: 'internal',     hours: [1, 0, 1, 0, 1] },
];

export default function TimesheetsPage() {
  const totalBillable = THIS_WEEK
    .filter((r) => r.type === 'billable')
    .reduce((sum, r) => sum + r.hours.reduce((a, b) => a + b, 0), 0);

  const totalHours = THIS_WEEK.reduce((sum, r) => sum + r.hours.reduce((a, b) => a + b, 0), 0);

  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">Timesheets</h1>
            <p className="mt-0.5 text-sm text-neutral-500">Log and review billable hours.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">← Week</Button>
            <span className="text-sm font-medium text-neutral-700">Feb 24 – 28, 2026</span>
            <Button variant="outline" size="sm">Week →</Button>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Log Hours
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
        <StatCard title="This Week" value={`${totalHours}h`} icon={Clock} iconColor="primary" />
        <StatCard title="Billable Hours" value={`${totalBillable}h`} delta={`${Math.round((totalBillable / totalHours) * 100)}% utilization`} deltaDirection="up" icon={CheckCircle} iconColor="success" />
        <StatCard title="Pending Approval" value="0" icon={AlertCircle} iconColor="warning" />
        <StatCard title="Month Total" value="21h" icon={CalendarDays} iconColor="secondary" />
      </div>

      {/* Weekly grid */}
      <div className="mx-6 mb-6 rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Week of Feb 24
          </p>
          <Badge variant="neutral">Draft</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-56">
                  Project
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider w-24">
                  Type
                </th>
                {DAYS.map((d) => (
                  <th key={d} className="px-3 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider w-16">
                    {d}
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {THIS_WEEK.map((row, i) => {
                const rowTotal = row.hours.reduce((a, b) => a + b, 0);
                return (
                  <tr key={i} className="hover:bg-neutral-50/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-neutral-800">{row.project}</td>
                    <td className="px-5 py-3">
                      <Badge variant={row.type === 'billable' ? 'primary' : 'neutral'}>
                        {row.type === 'billable' ? 'Billable' : 'Internal'}
                      </Badge>
                    </td>
                    {row.hours.map((h, di) => (
                      <td key={di} className="px-3 py-3 text-center">
                        {h > 0 ? (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-sm font-semibold text-primary-700">
                            {h}
                          </span>
                        ) : (
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-dashed border-neutral-200 text-xs text-neutral-300">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-3 text-right font-bold text-neutral-900">{rowTotal}h</td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="border-t-2 border-neutral-200 bg-neutral-50/50">
                <td className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider" colSpan={2}>
                  Daily Total
                </td>
                {DAYS.map((_, di) => {
                  const dayTotal = THIS_WEEK.reduce((sum, r) => sum + (r.hours[di] ?? 0), 0);
                  return (
                    <td key={di} className="px-3 py-3 text-center text-sm font-bold text-neutral-700">
                      {dayTotal}h
                    </td>
                  );
                })}
                <td className="px-5 py-3 text-right text-sm font-bold text-neutral-900">{totalHours}h</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
          <p className="text-xs text-neutral-400">
            Approval workflow, locking, and manager review in Week 10
          </p>
          <Button variant="outline" size="sm" disabled>Submit for Approval</Button>
        </div>
      </div>
    </div>
  );
}
