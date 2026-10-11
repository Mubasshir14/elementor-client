'use client';

import { ProjectCapabilities } from '@/lib/schemas';

export function ConversionSettings({ capabilities }: { capabilities: ProjectCapabilities | null }) {
  const reason = capabilities?.target.unavailableReason;

  return (
    <section className="card space-y-3" aria-labelledby="conversion-settings-heading">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Conversion settings</p>
        <h2 id="conversion-settings-heading" className="mt-2 text-2xl font-semibold text-slate-900">Elementor output</h2>
      </div>
      <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        {reason ?? 'Load supported capabilities to see whether Elementor output is available.'}
      </p>
    </section>
  );
}
