'use client';

import { Code2, FolderGit2, Layers, Route } from 'lucide-react';
import type { SourceImportSummary } from '@/lib/schemas';
import type { ZipValidation, ReactNextRoutePreview, ReactNextComponentPreview } from '../types/react-nextjs.types';

type Props = {
  validation: ZipValidation;
  importResult?: SourceImportSummary | null;
};

export function ReactNextInspectionView({ validation, importResult }: Props) {
  if (!validation && !importResult) {
    return null;
  }

  const summary = (importResult?.summary ?? {}) as Record<string, unknown>;
  const framework =
    validation?.framework ??
    (typeof summary.detectedFramework === 'string' ? summary.detectedFramework : undefined);
  const routerConvention =
    validation?.routerConvention ??
    (typeof summary.routerConvention === 'string' ? summary.routerConvention : undefined);
  const packageName =
    validation?.packageName ??
    (typeof summary.packageName === 'string' ? summary.packageName : undefined);
  const sourceFileCount =
    validation?.sourceFileCount ??
    (typeof summary.sourceFileCount === 'number' ? summary.sourceFileCount : undefined);
  const routeCount =
    validation?.routeCount ??
    (typeof summary.routeCount === 'number' ? summary.routeCount : undefined);
  const componentCount =
    validation?.componentCount ??
    (typeof summary.componentCount === 'number' ? summary.componentCount : undefined);
  const styleFileCount =
    validation?.styleFileCount ??
    (typeof summary.styleFileCount === 'number' ? summary.styleFileCount : undefined);
  const assetCount =
    validation?.assetCount ??
    (typeof summary.assetCount === 'number' ? summary.assetCount : undefined);

  const routes = Array.isArray(summary.routes) ? (summary.routes as ReactNextRoutePreview[]) : [];
  const components = Array.isArray(summary.components)
    ? (summary.components as ReactNextComponentPreview[])
    : [];
  const diagnostics = Array.isArray(importResult?.diagnostics) ? importResult.diagnostics : [];

  const hasExtendedStats =
    typeof routeCount === 'number' ||
    typeof componentCount === 'number' ||
    typeof sourceFileCount === 'number' ||
    Boolean(routerConvention) ||
    routes.length > 0;

  return (
    <div className="space-y-3">
      {validation ? (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Detected {framework === 'nextjs' ? 'Next.js' : 'React'} project
          {validation.sha256 ? ` · SHA-256 ${validation.sha256.slice(0, 12)}…` : ''}.
        </div>
      ) : null}

      {hasExtendedStats ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <FolderGit2 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              Static Source Analysis Summary
            </span>
            {routerConvention ? (
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium text-brand-800">
                Router: {routerConvention}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {typeof routeCount === 'number' ? (
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <p className="text-[11px] text-slate-500">Routes / Pages</p>
                <p className="text-sm font-semibold text-slate-900">{routeCount}</p>
              </div>
            ) : null}
            {typeof componentCount === 'number' ? (
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <p className="text-[11px] text-slate-500">Components</p>
                <p className="text-sm font-semibold text-slate-900">{componentCount}</p>
              </div>
            ) : null}
            {typeof sourceFileCount === 'number' ? (
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <p className="text-[11px] text-slate-500">Source Files</p>
                <p className="text-sm font-semibold text-slate-900">{sourceFileCount}</p>
              </div>
            ) : null}
            {typeof styleFileCount === 'number' || typeof assetCount === 'number' ? (
              <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                <p className="text-[11px] text-slate-500">Styles / Assets</p>
                <p className="text-sm font-semibold text-slate-900">
                  {styleFileCount ?? 0} / {assetCount ?? 0}
                </p>
              </div>
            ) : null}
          </div>

          {packageName ? (
            <p className="text-slate-600">
              Package: <code className="font-mono text-slate-800">{packageName}</code>
            </p>
          ) : null}

          {routes.length > 0 ? (
            <div className="space-y-1">
              <p className="font-medium text-slate-800 flex items-center gap-1">
                <Route className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Discovered Routes
              </p>
              <ul className="space-y-1 pl-1">
                {routes.slice(0, 6).map((route) => (
                  <li key={route.id} className="flex items-center justify-between gap-2 text-slate-600">
                    <span className="font-mono text-slate-800">{route.path}</span>
                    <span className="truncate text-slate-500">{route.sourceFile}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {components.length > 0 ? (
            <div className="space-y-1">
              <p className="font-medium text-slate-800 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Inspected UI Components
              </p>
              <div className="flex flex-wrap gap-1.5">
                {components.slice(0, 8).map((comp) => (
                  <span
                    key={`${comp.sourceFile}-${comp.name}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700"
                  >
                    <Code2 className="h-3 w-3 text-slate-400" aria-hidden="true" />
                    {comp.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
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

