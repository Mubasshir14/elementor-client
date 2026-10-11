'use client';
import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { CloudUpload, FileJson, RotateCcw, Trash2, FileWarning } from 'lucide-react';
import clsx from 'clsx';
import { ProjectCapabilities, SourceImportSummary } from '@/lib/schemas';
import { formatBytes } from '@/lib/error-handling';
import { SourceIntakeState, SourceIntakeStatus } from './SourceSelector';

export type FigmaValidation = {
  pageCount?: number;
  componentCount?: number;
  styleCount?: number;
  nodeCount?: number;
} | null;

export type FigmaProps = {
  capabilities: ProjectCapabilities | null;
  selectedFile: File | null;
  intakeState: SourceIntakeState;
  progress: number | null;
  statusDetail?: string | null;
  error: string | null;
  onFileChange: (file: File | null, error: string | null) => void;
  validation: FigmaValidation;
  importResult: SourceImportSummary | null;
};

const NATIVE_FIG_ERROR =
  'That file is not a supported Figma design file. Upload a native .fig file exported from Figma (File → Save local copy), or a Figma REST API file JSON export (.json).';

export function FigmaPanel(p: FigmaProps) {
  const src = p.capabilities?.sourceTypes.find(({ id }) => id === 'figma');
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const busy = p.intakeState === 'uploading' || p.intakeState === 'validating' || p.intakeState === 'importing';

  function pick(file: File | null) {
    if (!file) {
      p.onFileChange(null, null);
      return;
    }
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.fig') && !lower.endsWith('.json')) {
      p.onFileChange(null, NATIVE_FIG_ERROR);
      return;
    }
    if (src?.maxBytes != null && file.size > src.maxBytes) {
      p.onFileChange(null, `This file is too large. Maximum is ${formatBytes(src.maxBytes)}.`);
      return;
    }
    if (file.size === 0) {
      p.onFileChange(null, 'That file is empty. Select a Figma .fig file or file JSON export with content.');
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

  const summary = p.importResult?.summary as Record<string, unknown> | undefined;
  return (
    <section aria-labelledby="figma-h" className="card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="figma-h" className="text-lg font-semibold text-slate-900">Figma Design File</h2>
          <p className="mt-1 text-sm text-slate-600">Upload a native Figma <code className="text-xs">.fig</code> file (File → Save local copy) directly from your computer, or a Figma REST API file JSON export. The file is validated and parsed locally — no Figma account, OAuth connection, file URL, or API token is required.</p>
        </div>
        <SourceIntakeStatus state={p.intakeState} detail={p.statusDetail ?? undefined} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        <p className="font-medium text-slate-800">How to get a supported file</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-slate-600">
          <li>In Figma, use <span className="font-medium">File → Save local copy</span> to download the native <code className="text-xs">.fig</code> file.</li>
          <li>Alternatively, save the <code className="text-xs">GET /v1/files/{'{key}'}</code> REST API JSON export.</li>
          <li>Upload the <code className="text-xs">.fig</code> or <code className="text-xs">.json</code> file here. It is parsed locally with no Figma connection.</li>
        </ol>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Figma file dropzone. Press Enter to browse files."
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
        <p className="mt-3 text-sm font-semibold text-slate-900">Drag and drop your Figma file here</p>
        <p className="mt-1 text-xs text-slate-600">Accepted formats: .fig (native) or .json (REST API export) · Maximum size: {formatBytes(src?.maxBytes ?? 0)}</p>
        <span className="btn-secondary mt-4 inline-flex">Browse files</span>
        <input ref={ref} type="file" accept=".fig,.json,application/json,application/octet-stream" className="sr-only" onChange={onInput} aria-label="Figma design file" />
      </div>

      {p.selectedFile ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><FileJson className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{p.selectedFile.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(p.selectedFile.size)} · {p.selectedFile.name.toLowerCase().endsWith('.fig') ? 'Figma .fig file' : 'Figma file JSON'}</p>
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
          Parsed Figma design file
          {typeof p.validation.pageCount === 'number' ? ` · ${String(p.validation.pageCount)} page(s)` : ''}
          {typeof p.validation.nodeCount === 'number' ? ` · ${String(p.validation.nodeCount)} nodes` : ''}
          {typeof p.validation.componentCount === 'number' ? ` · ${String(p.validation.componentCount)} components` : ''}
          {typeof p.validation.styleCount === 'number' ? ` · ${String(p.validation.styleCount)} styles` : ''}.
        </div>
      ) : null}

      {p.importResult ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Imported {p.importResult.fileName ?? 'Figma design'}
          {typeof summary?.pageCount === 'number' ? ` · ${String(summary.pageCount)} pages` : ''}
          {typeof summary?.nodeCount === 'number' ? ` · ${String(summary.nodeCount)} nodes` : ''}.
        </div>
      ) : null}

      {p.error ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{p.error}</span>
        </p>
      ) : null}
    </section>
  );
}

