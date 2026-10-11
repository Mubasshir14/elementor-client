'use client';
import { useState } from 'react';
import { Globe } from 'lucide-react';
import { ProjectCapabilities, SourceImportSummary } from '@/lib/schemas';
import { SourceIntakeState, SourceIntakeStatus, isFramerUrl } from './SourceSelector';
export type FramerProps = {
  capabilities: ProjectCapabilities | null;
  siteUrl: string;
  onSiteUrlChange: (v: string) => void;
  intakeState: SourceIntakeState;
  error: string | null;
  statusDetail?: string | null;
  importResult: SourceImportSummary | null;
  importing: boolean;
  onImport: () => void;
  onRetry: () => void;
};

export function FramerPanel(p: FramerProps) {
  const [touched, setTouched] = useState(false);
  const valid = p.siteUrl.trim() ? isFramerUrl(p.siteUrl) : false;
  const showErr = touched && p.siteUrl.trim().length > 0 && !valid;
  const summary = p.importResult?.summary as Record<string, unknown> | undefined;
  const diags = Array.isArray(p.importResult?.diagnostics) ? p.importResult!.diagnostics! : [];
  return (
    <section aria-labelledby="framer-h" className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="framer-h" className="text-lg font-semibold text-slate-900">Framer Project</h2>
          <p className="mt-1 text-sm text-slate-600">Enter the public published-site URL. The backend inspects page structure, content, links, styles, and assets over HTTPS with SSRF protections. This is published-site analysis, not native canvas recovery. Framer does not offer HTML export for self-hosting.</p>
        </div>
        <SourceIntakeStatus state={p.intakeState} detail={p.statusDetail ?? undefined} />
      </div>
      <label className="block text-sm font-medium text-slate-700" htmlFor="framer-url">
        Published site URL
        <span className="mt-1 flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <input id="framer-url" className="input" placeholder="https://your-site.framer.website/" value={p.siteUrl} disabled={p.importing} onChange={(e) => {
            setTouched(true);
            p.onSiteUrlChange(e.target.value);
          }} />
        </span>
      </label>
      {showErr ? <p role="alert" className="text-sm text-rose-700">Enter a public HTTP(S) URL. Localhost, private addresses, credentials, and unsupported protocols are rejected.</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={p.onImport} disabled={p.importing || !valid}>{p.importing ? 'Analyzing…' : 'Analyze published site'}</button>
        {p.intakeState === 'failed' ? <button type="button" className="btn-secondary" onClick={p.onRetry} disabled={p.importing || !valid}>Retry analysis</button> : null}
      </div>
      {p.importResult ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Analyzed {p.importResult.fileName ?? p.importResult.inputUrl ?? 'published site'}
          {typeof summary?.linkCount === 'number' ? ` · ${String(summary.linkCount)} links` : ''}
          {typeof summary?.imageCount === 'number' ? ` · ${String(summary.imageCount)} images` : ''}.
        </div>
      ) : null}
      {diags.length > 0 ? (
        <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {diags.slice(0, 5).map((d, i) => <li key={i}>· {d.message}</li>)}
        </ul>
      ) : null}
      {p.error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{p.error}</p> : null}
    </section>
  );
}
