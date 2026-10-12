'use client';

import { Layers } from 'lucide-react';
import type { SourceImportSummary } from '@/lib/schemas';
import type { FigmaValidation, FigmaPagePreview } from '../types/figma.types';

type Props = {
  validation: FigmaValidation;
  importResult: SourceImportSummary | null;
};

export function FigmaInspectionView({ validation, importResult }: Props) {
  if (!validation && !importResult) {
    return null;
  }

  const summary = pSummary(importResult);
  const pages = Array.isArray(summary?.pages) ? (summary.pages as FigmaPagePreview[]) : [];
  const diagnostics = Array.isArray(importResult?.diagnostics) ? importResult.diagnostics : [];

  return (
    <div className="space-y-3">
      {validation ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Parsed Figma design file
          {typeof validation.pageCount === 'number' ? ` · ${String(validation.pageCount)} page(s)` : ''}
          {typeof validation.nodeCount === 'number' ? ` · ${String(validation.nodeCount)} nodes` : ''}
          {typeof validation.componentCount === 'number' ? ` · ${String(validation.componentCount)} components` : ''}
          {typeof validation.styleCount === 'number' ? ` · ${String(validation.styleCount)} styles` : ''}.
        </div>
      ) : null}

      {importResult ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Imported {importResult.fileName ?? 'Figma design'}
          {typeof summary?.pageCount === 'number' ? ` · ${String(summary.pageCount)} pages` : ''}
          {typeof summary?.nodeCount === 'number' ? ` · ${String(summary.nodeCount)} nodes` : ''}.
        </div>
      ) : null}

      {pages.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Parsed Figma Pages
          </p>
          <ul className="space-y-1 pl-1">
            {pages.slice(0, 6).map((page) => (
              <li key={page.id} className="flex items-center justify-between gap-2 text-slate-700">
                <span className="font-medium text-slate-900">{page.name}</span>
                {typeof page.nodeCount === 'number' ? (
                  <span className="text-slate-500">{page.nodeCount} nodes</span>
                ) : typeof page.childCount === 'number' ? (
                  <span className="text-slate-500">{page.childCount} frames</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {diagnostics.length > 0 ? (
        <ul className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {diagnostics.slice(0, 5).map((d, i) => (
            <li key={i}>· {d.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function pSummary(importResult: SourceImportSummary | null): Record<string, unknown> | undefined {
  return importResult?.summary as Record<string, unknown> | undefined;
}

