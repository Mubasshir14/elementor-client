'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { apiClient } from '@/lib/api-client';
import { ProjectSummary } from '@/lib/schemas';
import { getErrorMessage, toDateLabel } from '@/lib/error-handling';

// Validate the single-project envelope: { project: { id, name, createdAt, updatedAt } }.
function parseProjectResponse(payload: unknown): ProjectSummary {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The project response was not a valid object.');
  }
  const record = payload as Record<string, unknown>;
  const project = record.project;
  if (typeof project !== 'object' || project === null) {
    throw new Error('The project response did not contain a project object.');
  }
  const entry = project as Record<string, unknown>;
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
    throw new Error('The project response was missing an id or name.');
  }
  if (typeof entry.createdAt !== 'string' || typeof entry.updatedAt !== 'string') {
    throw new Error('The project response was missing timestamps.');
  }
  return {
    id: entry.id,
    name: entry.name,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getProject(projectId)
      .then((payload) => {
        const parsed = parseProjectResponse(payload);
        if (cancelled) return;
        setProject(parsed);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject(null);
        setError(getErrorMessage(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadToken]);

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
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? 'Loading…' : (project?.name ?? 'Project not found')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setReloadToken((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </button>
        </div>

        {loading ? (
          <div role="status" className="card text-sm text-slate-600">
            Loading project…
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p>Could not load this project.</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1">Check that you are signed in and the API is running, then retry.</p>
            <Link href="/projects" className="btn-secondary mt-3 inline-flex">
              Back to projects
            </Link>
          </div>
        ) : !project ? (
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>This project was not found in your account.</p>
            <Link href="/projects" className="btn-secondary mt-3 inline-flex">
              Back to projects
            </Link>
          </div>
        ) : (
          <>
            <div className="card space-y-5">
              <div>
                <p className="text-sm text-slate-500">Project overview</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{project.name}</p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Created</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{toDateLabel(project.createdAt)}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Updated</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{toDateLabel(project.updatedAt)}</dd>
                </div>
              </dl>
              <Link href={`/conversions/${project.id}`} className="btn-primary inline-flex">
                Review conversion
              </Link>
            </div>

            <section className="card">
              <h3 className="mb-4 text-xl font-semibold text-slate-900">Conversion history</h3>
              <p className="text-sm text-slate-600">
                Once the backend processes this project, conversion stages and diagnostics appear here.
              </p>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

