'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  Users,
  TrendingUp,
  FileText,
  FolderKanban,
  Clock,
  Settings,
  LogOut,
  Search,
  ChevronRight,
} from 'lucide-react';
import { signOut } from '../../lib/auth-client';
import { Avatar } from '../ui/avatar';

/* ------------------------------------------------------------------ */
/* Nav structure                                                         */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [
  { href: '/app/accounts',   label: 'Accounts',   icon: Users },
  { href: '/app/pipeline',   label: 'Pipeline',   icon: TrendingUp },
  { href: '/app/quotes',     label: 'Quotes',     icon: FileText },
  { href: '/app/projects',   label: 'Projects',   icon: FolderKanban },
  { href: '/app/timesheets', label: 'Timesheets', icon: Clock },
];

/* ------------------------------------------------------------------ */
/* Sub-components                                                        */
/* ------------------------------------------------------------------ */

function SidebarNavItem({ href, label, icon: Icon }: NavItem) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={clsx(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-500/10 text-primary-400'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100',
      )}
    >
      <Icon
        className={clsx(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-primary-400' : 'text-neutral-500 group-hover:text-neutral-300',
        )}
        aria-hidden="true"
      />
      <span className="truncate">{label}</span>
      {isActive && (
        <ChevronRight
          className="ml-auto h-3.5 w-3.5 text-primary-500/60"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function NavSectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 px-3 pt-4 text-[10px] font-semibold uppercase tracking-widest text-neutral-600">
      {label}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Props                                                                 */
/* ------------------------------------------------------------------ */

interface SidebarProps {
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                               */
/* ------------------------------------------------------------------ */

export function Sidebar({ userEmail, userName, userAvatar }: SidebarProps) {
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/auth/login';
        },
      },
    });
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col bg-neutral-900 border-r border-neutral-800">
      {/* ── Brand ───────────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-3 border-b border-neutral-800 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500 shadow-sm">
          <span className="text-sm font-bold text-white">CP</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-semibold text-white">Cresyn Pulse</span>
          <span className="text-[10px] text-neutral-500">Account Management</span>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-1">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-300"
          aria-label="Quick search"
        >
          <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-left text-xs">Quick search…</span>
          <kbd className="inline-flex items-center rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav
        className="flex flex-1 flex-col overflow-y-auto px-3 py-2"
        aria-label="Primary navigation"
      >
        <NavSectionLabel label="Main" />
        {MAIN_NAV.map((item) => (
          <SidebarNavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="border-t border-neutral-800 px-3 py-3 space-y-0.5">
        {/* Settings */}
        <Link
          href="/app/settings"
          className={clsx(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname.startsWith('/app/settings')
              ? 'bg-primary-500/10 text-primary-400'
              : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100',
          )}
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
          Settings
        </Link>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          Sign out
        </button>

        {/* User pill */}
        {(userEmail ?? userName) && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-800/50 px-3 py-2">
            <Avatar name={userName ?? userEmail ?? null} src={userAvatar ?? null} size="sm" />
            <div className="min-w-0 flex-1">
              {userName && (
                <p className="truncate text-xs font-medium text-neutral-200">{userName}</p>
              )}
              {userEmail && (
                <p className="truncate text-[10px] text-neutral-500">{userEmail}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
