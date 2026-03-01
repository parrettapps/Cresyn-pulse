'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { Sidebar } from '../../components/layout/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userId, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Wait for hydration to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check JWT auth — only after both mounted AND store has rehydrated
  useEffect(() => {
    if (mounted && _hasHydrated && !isAuthenticated) {
      console.log('[App Layout] Not authenticated after hydration, redirecting to login');
      router.replace('/auth/login');
    }
  }, [mounted, _hasHydrated, isAuthenticated, router]);

  // Show loading spinner until both mounted and hydrated
  if (!mounted || !_hasHydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // After hydration, if not authenticated, show loading while redirect happens
  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // Get user info from auth store (we don't need Better Auth session here)
  const userEmail = 'user@example.com'; // Placeholder - we can enhance this later
  const userName = 'User';

  return (
    <div className="flex h-full overflow-hidden bg-neutral-50">
      {/* ── Left sidebar ────────────────────────────────────────── */}
      <Sidebar
        userEmail={userEmail}
        userName={userName}
        userAvatar={null}
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
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-neutral-700 sm:block">
                {userName}
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
