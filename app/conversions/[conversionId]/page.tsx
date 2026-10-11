import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';

const diagnostics = [
  { id: 'd1', severity: 'warning', message: 'Some source files are using deprecated CSS selectors.', stage: 'analysis', createdAt: 'Today' },
];

export default function ConversionDetailPage({ params }: { params: { conversionId: string } }) {
  const status = 'running';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Conversion</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{params.conversionId}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary">
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="card space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">Current stage</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">Component mapping</p>
              </div>
              <StatusBadge label={status} tone={status === 'running' ? 'info' : status === 'failed' ? 'error' : status === 'succeeded' ? 'success' : 'neutral'} />
            </div>

            <div className="space-y-3">
              {[
                'Source validation',
                'Design parsing',
                'Component mapping',
                'Elementor generation',
                'Diagnostics and review',
              ].map((stage, index) => (
                <div key={stage} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${index <= 2 ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{stage}</p>
                  </div>
                  {index === 2 ? <Clock3 className="h-4 w-4 text-brand-600" /> : index < 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-slate-400" />}
                </div>
              ))}
            </div>
          </section>

          <aside className="card space-y-5">
            <h3 className="text-xl font-semibold text-slate-900">Diagnostics</h3>
            <div className="space-y-3">
              {diagnostics.map((item) => (
                <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.16em] text-amber-700">{item.severity}</span>
                    <span className="text-xs text-slate-500">{item.createdAt}</span>
                  </div>
                  <p className="mt-2 text-sm text-amber-900">{item.message}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
