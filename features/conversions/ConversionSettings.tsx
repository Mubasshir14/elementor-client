'use client';

import { ProjectCapabilities } from '@/lib/schemas';

export function ConversionSettings({ capabilities }: { capabilities: ProjectCapabilities | null }) {
  const target = capabilities?.target;
  const ready = target?.status === 'available';
  const reason = target?.unavailableReason;

  return (
    <section className="card space-y-3" aria-labelledby="conversion-settings-heading">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Conversion settings</p>
        <h2 id="conversion-settings-heading" className="mt-2 text-2xl font-semibold text-slate-900">Elementor output</h2>
      </div>
      {ready ? (
        <p role="status" className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          Native Elementor conversion is available. Uploads are validated, interpreted against the
          Markdown rules (FIGMA.md, FRAMER.md, REACT_NEXT.md, ELEMENTOR_SKILL.md), and converted
          into Elementor JSON artifacts.
        </p>
      ) : (
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {reason ?? 'Load supported capabilities to see whether Elementor output is available.'}
        </p>
      )}
    </section>
  );
}
