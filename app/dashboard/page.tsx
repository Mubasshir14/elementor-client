import Link from 'next/link';
import { ArrowRight, FolderOpen, FileText, Layers3, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';

const stats = [
  { label: 'Active projects', value: '0', icon: FolderOpen },
  { label: 'Running conversions', value: '0', icon: Layers3 },
  { label: 'Ready artifacts', value: '0', icon: FileText },
  { label: 'Queued items', value: '0', icon: Sparkles },
];

const recentProjects: Array<{ name: string; status: string; updatedAt: string }> = [];
const conversionQueue: Array<{ id: string; stage: string; status: string }> = [];

export default function DashboardPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Overview</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Dashboard</h2>
          </div>
          <Link href="/projects/new" className="btn-primary">
            Create project <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="card flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
              </div>
              <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Recent projects</h3>
            </div>
            {recentProjects.length === 0 ? (
              <EmptyState
                title="No projects yet"
                description="Create a new project and upload a source to start the conversion workflow."
                actionLabel="Start a project"
                actionHref="/projects/new"
              />
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <div key={project.name} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{project.name}</p>
                        <p className="text-sm text-slate-500">Updated {project.updatedAt}</p>
                      </div>
                      <StatusBadge label={project.status} tone={project.status === 'succeeded' ? 'success' : 'neutral'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">Queue</h3>
            </div>
            {conversionQueue.length === 0 ? (
              <EmptyState title="No conversions queued" description="The active pipeline will appear here once a project is submitted for backend processing." />
            ) : (
              <div className="space-y-3">
                {conversionQueue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{item.stage}</p>
                      <StatusBadge label={item.status} tone={item.status === 'running' ? 'info' : item.status === 'failed' ? 'error' : 'neutral'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
