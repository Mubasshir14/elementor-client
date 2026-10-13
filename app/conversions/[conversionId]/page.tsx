'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Download, RefreshCw, XCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useConversion, stageLabel, statusLabel, statusTone } from '@/features/conversions/useConversion';
import { toDateLabel } from '@/lib/error-handling';

function StageIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === 'RUNNING') return <Clock3 className="h-4 w-4 text-brand-600" />;
  if (status === 'FAILED' || status === 'BLOCKED') return <XCircle className="h-4 w-4 text-rose-600" />;
  if (status === 'CANCELLED') return <XCircle className="h-4 w-4 text-slate-400" />;
  return <AlertTriangle className="h-4 w-4 text-slate-400" />;
}

export default function ConversionDetailPage({ params }: { params: { conversionId: string } }) {
  const {
    conversion,
    stages,
    currentStage,
    loading,
    error,
    downloadError,
    downloading,
    retryError,
    retrying,
    refresh,
    downloadArtifact,
    retry,
  } = useConversion(params.conversionId);

  const isSucceeded = conversion?.status === 'SUCCEEDED';
  const isFailedOrBlocked = conversion?.status === 'FAILED' || conversion?.status === 'BLOCKED';

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
            {isSucceeded ? (
              <button type="button" className="btn-primary" onClick={downloadArtifact} disabled={downloading} aria-label="Download Elementor JSON">
                <Download className="mr-2 h-4 w-4" />
                {downloading ? 'Preparing…' : 'Download Elementor JSON'}
              </button>
            ) : null}
            {isFailedOrBlocked || conversion?.status === 'CANCELLED' ? (
              <button type="button" className="btn-secondary" onClick={retry} disabled={retrying}>
                <RefreshCw className="mr-2 h-4 w-4" /> {retrying ? 'Retrying…' : 'Retry'}
              </button>
            ) : null}
            <button type="button" className="btn-secondary" onClick={refresh} disabled={loading} aria-label="Refresh conversion">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {loading && !conversion ? (
          <div role="status" className="card text-sm text-slate-600">Loading conversion…</div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p>Could not load this conversion.</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : conversion ? (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="card space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">Current stage</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{currentStage}</p>
                </div>
                <StatusBadge label={statusLabel(conversion.status)} tone={statusTone(conversion.status)} />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span>Status: <strong className="text-slate-700">{statusLabel(conversion.status)}</strong></span>
                  {typeof conversion.attempt === 'number' ? <span>Attempt: <strong className="text-slate-700">{conversion.attempt}</strong></span> : null}
                  {conversion.sourcePlatform ? <span>Source: <strong className="text-slate-700">{conversion.sourcePlatform}</strong></span> : null}
                </div>
                <p className="text-xs text-slate-500">Last updated {toDateLabel(conversion.updatedAt)}</p>
              </div>

              <div className="space-y-3">
                {stages.length === 0 ? (
                  <p className="text-sm text-slate-500">No stage details are available yet.</p>
                ) : (
                  stages.map((stage) => (
                    <div key={stage.name} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                      <StageIcon status={stage.status} />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{stageLabel(stage.name)}</p>
                        <p className="text-xs text-slate-500">{stage.status}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {downloadError ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p>Download failed.</p>
                  <p className="mt-1">{downloadError}</p>
                </div>
              ) : null}
              {retryError ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p>Retry failed.</p>
                  <p className="mt-1">{retryError}</p>
                </div>
              ) : null}
            </section>

            <aside className="card space-y-5">
              <h3 className="text-xl font-semibold text-slate-900">Diagnostics</h3>
              {isFailedOrBlocked ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <span className="text-xs uppercase tracking-[0.16em] text-rose-700">{conversion.errorCode ?? 'error'}</span>
                  <p className="mt-2 text-sm text-rose-900">{conversion.errorMessage ?? 'The conversion did not complete successfully.'}</p>
                </div>
              ) : null}
              <DiagnosticsList stages={stages} />
            </aside>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

// Render stage-specific diagnostics without exposing source code, presigned URLs,
// or secrets. Diagnostics are the backend's own messages.
function DiagnosticsList({ stages }: { stages: Array<{ name: string; diagnostics?: unknown }> }) {
  const messages: string[] = [];
  for (const stage of stages) {
    if (!Array.isArray(stage.diagnostics)) continue;
    for (const entry of stage.diagnostics) {
      if (entry && typeof entry === 'object' && 'message' in entry && typeof (entry as { message: unknown }).message === 'string') {
        messages.push((entry as { message: string }).message);
      }
    }
  }
  if (messages.length === 0) {
    return <p className="text-sm text-slate-500">No diagnostics reported.</p>;
  }
  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <div key={`${index}-${message}`} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <span className="text-xs uppercase tracking-[0.16em] text-amber-700">warning</span>
          <p className="mt-2 text-sm text-amber-900">{message}</p>
        </div>
      ))}
    </div>
  );
}

