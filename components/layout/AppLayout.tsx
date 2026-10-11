'use client';

import Link from 'next/link';
import { BarChart3, FolderOpen, LayoutDashboard, LogOut, Settings, Wrench, PencilRuler } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
  { href: '/sites', label: 'Sites', icon: Wrench },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft lg:block">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              D
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Platform</p>
              <p className="text-base font-semibold text-slate-900">Design-to-Elementor</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl bg-brand-50 p-4">
            <div className="flex items-center gap-2 text-brand-700">
              <PencilRuler className="h-4 w-4" />
              <span className="text-sm font-medium">Conversion status</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">Use the backend API as the source of truth for queued, running, and completed jobs.</p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4">
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => {
                apiClient.clearToken();
                window.location.href = '/login';
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex-1">
          <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 lg:hidden">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Workspace</p>
                <h1 className="text-lg font-semibold text-slate-900">Design-to-Elementor</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/projects/new" className="btn-primary">
                New project
              </Link>
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
