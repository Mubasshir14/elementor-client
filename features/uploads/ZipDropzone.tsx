'use client';
import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { CloudUpload, FileArchive, RotateCcw, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { ProjectCapabilities } from '@/lib/schemas';
import { formatBytes } from '@/lib/error-handling';
import { SourceIntakeState, SourceIntakeStatus } from './SourceSelector';
export type ZipValidation = { framework?: string; sha256?: string } | null;
export type ZipProps = {
  capabilities: ProjectCapabilities | null;
  selectedFile: File | null;
  intakeState: SourceIntakeState;
  progress: number | null;
  statusDetail?: string | null;
  error: string | null;
  onFileChange: (file: File | null, error: string | null) => void;
  validation: ZipValidation;
};

export function ZipDropzone(p: ZipProps) {
  const src = p.capabilities?.sourceTypes.find(({ id }) => id === 'react-next-zip');
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const busy = p.intakeState === 'uploading' || p.intakeState === 'validating';
  function pick(file: File | null) {
    if (!file) {
      p.onFileChange(null, null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      p.onFileChange(null, 'Choose a ZIP archive (.zip). Other formats are not supported.');
      return;
    }
    if (src?.maxBytes != null && file.size > src.maxBytes) {
      p.onFileChange(null, `This file is too large. Maximum is ${formatBytes(src.maxBytes)}.`);
      return;
    }
    if (file.size === 0) {
      p.onFileChange(null, 'That ZIP is empty. Select a project archive with package.json.');
      return;
    }
    p.onFileChange(file, null);
  }
  function onInput(e: ChangeEvent<HTMLInputElement>) {
    pick(e.target.files?.[0] ?? null);
    e.target.value = '';
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    if (busy) return;
    pick(e.dataTransfer.files?.[0] ?? null);
  }
  return (
    <section aria-labelledby="zip-h" className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="zip-h" className="text-lg font-semibold text-slate-900">React / Next.js Project ZIP</h2>
          <p className="mt-1 text-sm text-slate-600">ZIP with package.json plus src, app, pages, components, public, styles, and config files. Detection is automatic; archives are inspected without executing code.</p>
        </div>
        <SourceIntakeStatus state={p.intakeState} detail={p.statusDetail ?? undefined} />
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="ZIP dropzone. Press Enter to browse files."
        onClick={() => ref.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            ref.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={clsx('rounded-2xl border-2 border-dashed p-6 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2', drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-white', busy && 'opacity-70')}
      >
        <CloudUpload className="mx-auto h-8 w-8 text-brand-600" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold text-slate-900">Drag and drop your project ZIP here</p>
        <p className="mt-1 text-xs text-slate-600">Accepted format: .zip · Maximum size: {formatBytes(src?.maxBytes ?? 0)}</p>
        <span className="btn-secondary mt-4 inline-flex">Browse files</span>
        <input ref={ref} type="file" accept=".zip,application/zip,application/x-zip-compressed" className="sr-only" onChange={onInput} aria-label="Project ZIP file" />
      </div>
      {p.selectedFile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><FileArchive className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{p.selectedFile.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(p.selectedFile.size)} · ZIP archive</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => ref.current?.click()} disabled={busy}><RotateCcw className="mr-2 h-4 w-4" /> Replace</button>
            <button type="button" className="btn-secondary text-rose-600 hover:bg-rose-50" onClick={() => p.onFileChange(null, null)} disabled={busy} aria-label={`Remove ${p.selectedFile.name}`}><Trash2 className="mr-2 h-4 w-4" /> Remove</button>
          </div>
        </div>
      ) : null}
      {typeof p.progress === 'number' && busy ? (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.progress} aria-label="Upload progress" className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${p.progress}%` }} />
        </div>
      ) : null}
      {p.validation ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Detected {p.validation.framework === 'nextjs' ? 'Next.js' : 'React'} project{p.validation.sha256 ? ` · SHA-256 ${p.validation.sha256.slice(0, 12)}…` : ''}.
        </div>
      ) : null}
      {p.error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{p.error}</p> : null}
    </section>
  );
}
