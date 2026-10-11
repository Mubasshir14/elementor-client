import Link from 'next/link';
import { ArrowLeft, Download, FileArchive } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

export default function ArtifactDetailPage({ params }: { params: { artifactId: string } }) {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Artifact</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">{params.artifactId}</h2>
          </div>
        </div>

        <section className="card">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-brand-50 p-4 text-brand-600">
                <FileArchive className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Generated package</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">Elementor ZIP export</h3>
              </div>
            </div>
            <button className="btn-primary">
              <Download className="mr-2 h-4 w-4" /> Download
            </button>
          </div>

          <dl className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Type</dt>
              <dd className="mt-2 text-lg font-semibold text-slate-900">ZIP</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Created</dt>
              <dd className="mt-2 text-lg font-semibold text-slate-900">Today</dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Size</dt>
              <dd className="mt-2 text-lg font-semibold text-slate-900">0 KB</dd>
            </div>
          </dl>
        </section>
      </div>
    </AppLayout>
  );
}
