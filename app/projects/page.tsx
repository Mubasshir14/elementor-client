'use client';

import Link from 'next/link';
import { ArrowRight, FolderOpen, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { useProjects } from '@/features/projects/useProjects';
import { toDateLabel } from '@/lib/error-handling';

export default function ProjectsPage() {
  const { projects, loading, error, refresh } = useProjects();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Projects</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Project library</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh projects"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </button>
            <Link href="/projects/new" className="btn-primary">
              New project <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div role="status" className="card text-sm text-slate-600">
            Loading projects…
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p>Could not load your projects.</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1">Check that you are signed in and the API is running, then retry.</p>
            <button type="button" className="btn-secondary mt-3" onClick={refresh}>
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Start by creating a project, uploading a source, and configuring the target Elementor output."
            actionLabel="Create first project"
            actionHref="/projects/new"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card block transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                    Project
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">{project.name}</h3>
                <p className="mt-2 text-sm text-slate-600">Created {toDateLabel(project.createdAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

