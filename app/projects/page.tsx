import Link from 'next/link';
import { ArrowRight, FolderOpen } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/shared/EmptyState';

const projects: Array<{ id: string; name: string; sourceType: string; target: string; status: string }> = [];

export default function ProjectsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Projects</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Project library</h2>
          </div>
          <Link href="/projects/new" className="btn-primary">
            New project <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Start by creating a project, uploading a source, and configuring the target Elementor output."
            actionLabel="Create first project"
            actionHref="/projects/new"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="card block transition hover:-translate-y-0.5 hover:shadow-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                    {project.status}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">{project.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{project.sourceType} · {project.target}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
