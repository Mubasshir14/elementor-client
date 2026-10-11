'use client';

import { Archive, Figma, Globe } from 'lucide-react';
import clsx from 'clsx';
import { ProjectCapabilities, SourceType } from '@/lib/schemas';
import { formatBytes } from '@/lib/error-handling';

export type SourceIntakeState =
  | 'idle'
  | 'selected'
  | 'uploading'
  | 'importing'
  | 'validating'
  | 'ready'
  | 'failed';

type SourceIntakeProps = {
  capabilities: ProjectCapabilities | null;
  selectedSourceType: SourceType;
  onSourceTypeChange: (sourceType: SourceType) => void;
  intakeState: SourceIntakeState;
};

export const VISIBLE_SOURCES: SourceType[] = ['react-next-zip', 'figma', 'framer'];

export function isFramerUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function SourceSelector({ capabilities, selectedSourceType, onSourceTypeChange, intakeState }: SourceIntakeProps) {
  const meta: Record<SourceType, { blurb: string }> = {
    'react-next-zip': { blurb: 'ZIP archive with package.json and app source' },
    figma: { blurb: 'Upload a Figma file JSON export' },
    framer: { blurb: 'Published site URL analysis' },
    screenshot: { blurb: 'Screenshot intake is not implemented' },
  };
  return (
    <section aria-labelledby="source-choice-heading" className="space-y-4">
      <div>
        <h2 id="source-choice-heading" className="text-lg font-semibold text-slate-900">Choose a source</h2>
        <p className="mt-1 text-sm text-slate-600">One source type drives upload, validation, and conversion. Changing it clears incompatible input.</p>
      </div>
      <div role="radiogroup" aria-label="Source type" className="grid gap-3 sm:grid-cols-3">
        {VISIBLE_SOURCES.map((id) => {
          const source = capabilities?.sourceTypes.find((option) => option.id === id);
          const Icon = id === 'react-next-zip' ? Archive : id === 'figma' ? Figma : Globe;
          const selected = selectedSourceType === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-source-card={id}
              disabled={!capabilities}
              onClick={() => onSourceTypeChange(id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
                event.preventDefault();
                const index = VISIBLE_SOURCES.indexOf(selectedSourceType);
                const next = event.key === 'ArrowRight'
                  ? VISIBLE_SOURCES[(index + 1) % VISIBLE_SOURCES.length]!
                  : VISIBLE_SOURCES[(index + VISIBLE_SOURCES.length - 1) % VISIBLE_SOURCES.length]!;
                onSourceTypeChange(next);
                requestAnimationFrame(() => {
                  document.querySelector<HTMLElement>(`[data-source-card="${next}"]`)?.focus();
                });
              }}
              className={clsx(
                'rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                selected
                  ? 'border-brand-500 bg-brand-50 shadow-soft'
                  : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50',
              )}
            >
              <span className={clsx('flex h-10 w-10 items-center justify-center rounded-xl', selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-slate-900">{source?.label ?? id}</span>
              <span className="mt-1 block text-xs text-slate-600">{meta[id].blurb}</span>
              <span className="mt-3 block text-xs text-slate-500">
                {id === 'react-next-zip' && source?.maxBytes ? `ZIP · up to ${formatBytes(source.maxBytes)}` : null}
                {id === 'figma' && source?.maxBytes ? `.json · up to ${formatBytes(source.maxBytes)} · local upload` : null}
                {id === 'framer' ? 'Public site URL · analysis only' : null}
              </span>
              {source?.status === 'needs-configuration' ? <span className="mt-2 block text-xs font-medium text-amber-700">Needs configuration</span> : null}
              {selected ? <span className="mt-2 block text-xs font-medium text-brand-700">Selected · {intakeState}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function SourceIntakeStatus({ state, detail }: { state: SourceIntakeState; detail?: string }) {
  const tone = state === 'ready'
    ? 'bg-emerald-100 text-emerald-700'
    : state === 'failed'
      ? 'bg-rose-100 text-rose-700'
      : state === 'idle' || state === 'selected'
        ? 'bg-slate-100 text-slate-700'
        : 'bg-brand-100 text-brand-700';
  const label = {
    idle: 'Idle',
    selected: 'Selected',
    uploading: 'Uploading',
    importing: 'Importing',
    validating: 'Validating',
    ready: 'Ready',
    failed: 'Failed',
  }[state];
  return (
    <span role="status" className={clsx('inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]', tone)}>
      {(state === 'uploading' || state === 'importing' || state === 'validating') && (
        <span aria-hidden="true" className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {label}{detail ? ` · ${detail}` : ''}
    </span>
  );
}
