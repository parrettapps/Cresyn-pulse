'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../hooks/use-session';
import { Sidebar } from '../../components/layout/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/auth/login');
    }
  }, [isPending, session, router]);

  // Loading state — centered spinner with primary green
  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Not authenticated — will redirect, render nothing to avoid flash
  if (!session) {
    return null;
  }

  const { user } = session;

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50">
      {/* ── Left sidebar ────────────────────────────────────────── */}
      <Sidebar
        userEmail={user.email}
        userName={user.name ?? null}
        userAvatar={user.image ?? null}
      />

      {/* ── Main column ─────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center border-b border-neutral-200 bg-white px-6 gap-4">
          {/* Spacer — future: breadcrumbs */}
          <div className="flex-1" />

          {/* Right actions: user identity badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-[10px] font-semibold text-primary-700">
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-neutral-700 sm:block">
                {user.name ?? user.email}
              </span>
            </div>
          </div>
        </header>

        {/* Page content area — each page controls its own padding */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
