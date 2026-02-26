import { Building2, Users, Bell, Shield, CreditCard } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

const SETTING_SECTIONS = [
  {
    icon: Building2,
    title: 'Workspace',
    description: 'Tenant name, slug, logo, timezone.',
    status: 'Week 3',
  },
  {
    icon: Users,
    title: 'Team & Roles',
    description: 'Invite members, assign roles, manage seats.',
    status: 'Week 3',
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Email digests, in-app alerts, approval reminders.',
    status: 'Week 4',
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'MFA enforcement, session management, audit log.',
    status: 'Week 4',
  },
  {
    icon: CreditCard,
    title: 'Billing & Plan',
    description: 'Subscription, seat counts, invoices via Stripe.',
    status: 'Week 11',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="border-b border-neutral-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-neutral-900">Settings</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Workspace and account configuration.</p>
      </div>

      <div className="flex flex-col gap-3 p-6 max-w-2xl">
        {SETTING_SECTIONS.map(({ icon: Icon, title, description, status }) => (
          <div
            key={title}
            className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-shadow hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
              <Icon className="h-5 w-5 text-neutral-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-neutral-900">{title}</p>
              <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant="neutral">{status}</Badge>
              <Button variant="outline" size="xs" disabled>
                Configure
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
