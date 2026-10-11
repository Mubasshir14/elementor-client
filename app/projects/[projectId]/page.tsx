import Link from 'next/link';
import { ArrowLeft, Download, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;

  const project = {
    id: projectId,
    name: 'Landing page refresh',
    sourceType: 'zip',
    target: 'elementor-pro',
    status: 'queued',
    updatedAt: 'Today',
  };

  const history: Array<{ id: string; status: string; stage: string }> = [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Project</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{project.name}</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </button>
            <button className="btn-secondary text-rose-600 hover:bg-rose-50">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="card space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Project overview</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{project.target}</p>
              </div>
              <StatusBadge label={project.status} tone={project.status === 'succeeded' ? 'success' : project.status === 'failed' ? 'error' : 'info'} />
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Source</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-900">{project.sourceType}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Updated</dt>
                <dd className="mt-2 text-lg font-semibold text-slate-900">{project.updatedAt}</dd>
              </div>
            </dl>
          </div>

          <div className="card space-y-4">
            <h3 className="text-xl font-semibold text-slate-900">Actions</h3>
            <Link href={`/conversions/${projectId}`} className="btn-primary w-full justify-center">
              <FileText className="mr-2 h-4 w-4" /> Review conversion
            </Link>
            <button className="btn-secondary w-full justify-center">
              <Download className="mr-2 h-4 w-4" /> Download latest artifact
            </button>
          </div>
        </div>

        <section className="card">
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-slate-900">Conversion history</h3>
          </div>
          {history.length === 0 ? (
            <EmptyState title="No conversion history" description="Once the backend starts processing this project, conversion stages and diagnostics will appear here." />
          ) : (
            <div className="space-y-3">{history.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 p-4">…</div>)}</div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
