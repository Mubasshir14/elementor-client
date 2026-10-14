'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileCode2, RefreshCw } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { apiClient } from '@/lib/api-client';
import { ProjectSummary } from '@/lib/schemas';
import { getErrorMessage, toDateLabel } from '@/lib/error-handling';

export type ProjectReadyUpload = {
  id: string;
  fileName: string;
  sourceType: string;
  detectedFramework?: 'react' | 'nextjs' | null;
  sourceImportId?: string | null;
  completedAt?: string | null;
};

export type ProjectReadyImport = {
  id: string;
  kind: string;
  fileName?: string | null;
  inputUrl?: string | null;
  createdAt?: string;
};

export type ProjectDetailRecord = ProjectSummary & {
  uploads?: ProjectReadyUpload[];
  sourceImports?: ProjectReadyImport[];
};

export type ReadyProjectConversionSource = {
  sourceType: 'react-next-zip' | 'figma' | 'framer';
  uploadId?: string;
  detectedFramework?: 'react' | 'nextjs';
  sourceImportId?: string;
  label: string;
};

// Validate the single-project envelope: { project: { id, name, createdAt, updatedAt, uploads?, sourceImports? } }.
function parseProjectResponse(payload: unknown): ProjectDetailRecord {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The project response was not a valid object.');
  }
  const record = payload as Record<string, unknown>;
  const project = record.project;
  if (typeof project !== 'object' || project === null) {
    throw new Error('The project response did not contain a project object.');
  }
  const entry = project as Record<string, unknown>;
  if (typeof entry.id !== 'string' || typeof entry.name !== 'string') {
    throw new Error('The project response was missing an id or name.');
  }
  if (typeof entry.createdAt !== 'string' || typeof entry.updatedAt !== 'string') {
    throw new Error('The project response was missing timestamps.');
  }
  const uploads: ProjectReadyUpload[] = Array.isArray(entry.uploads)
    ? entry.uploads
        .filter((u): u is Record<string, unknown> => typeof u === 'object' && u !== null && typeof (u as Record<string, unknown>).id === 'string')
        .map((u) => ({
          id: String(u.id),
          fileName: typeof u.fileName === 'string' ? u.fileName : 'archive.zip',
          sourceType: typeof u.sourceType === 'string' ? u.sourceType : 'REACT_NEXT_ZIP',
          detectedFramework: u.detectedFramework === 'nextjs' ? 'nextjs' : u.detectedFramework === 'react' ? 'react' : null,
          sourceImportId: typeof u.sourceImportId === 'string' ? u.sourceImportId : null,
          completedAt: typeof u.completedAt === 'string' ? u.completedAt : null,
        }))
    : [];
  const sourceImports: ProjectReadyImport[] = Array.isArray(entry.sourceImports)
    ? entry.sourceImports
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>).id === 'string')
        .map((s) => ({
          id: String(s.id),
          kind: typeof s.kind === 'string' ? s.kind : '',
          fileName: typeof s.fileName === 'string' ? s.fileName : null,
          inputUrl: typeof s.inputUrl === 'string' ? s.inputUrl : null,
          createdAt: typeof s.createdAt === 'string' ? s.createdAt : undefined,
        }))
    : [];
  return {
    id: entry.id,
    name: entry.name,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    ...(uploads.length > 0 ? { uploads } : {}),
    ...(sourceImports.length > 0 ? { sourceImports } : {}),
  };
}

function deriveReadyConversionSource(project: ProjectDetailRecord | null): ReadyProjectConversionSource | null {
  if (!project) return null;
  const uploads = project.uploads ?? [];
  const imports = project.sourceImports ?? [];

  const reactZipUpload = uploads.find((u) => u.sourceType === 'REACT_NEXT_ZIP');
  if (reactZipUpload) {
    const fw = reactZipUpload.detectedFramework === 'nextjs' ? 'nextjs' : 'react';
    return {
      sourceType: 'react-next-zip',
      uploadId: reactZipUpload.id,
      detectedFramework: fw,
      ...(reactZipUpload.sourceImportId ? { sourceImportId: reactZipUpload.sourceImportId } : {}),
      label: `${fw === 'nextjs' ? 'Next.js' : 'React'} ZIP (${reactZipUpload.fileName})`,
    };
  }

  const figmaUpload = uploads.find((u) => u.sourceType === 'FIGMA');
  const figmaImport = imports.find((s) => s.kind === 'FIGMA_FILE');
  if (figmaUpload && (figmaUpload.sourceImportId || figmaImport)) {
    const importId = figmaUpload.sourceImportId ?? figmaImport!.id;
    return {
      sourceType: 'figma',
      uploadId: figmaUpload.id,
      sourceImportId: importId,
      label: `Figma design (${figmaUpload.fileName})`,
    };
  }
  if (figmaImport) {
    return {
      sourceType: 'figma',
      sourceImportId: figmaImport.id,
      label: `Figma design (${figmaImport.fileName ?? figmaImport.id})`,
    };
  }

  const framerImport = imports.find((s) => s.kind === 'FRAMER_SITE');
  if (framerImport) {
    return {
      sourceType: 'framer',
      sourceImportId: framerImport.id,
      label: `Framer site (${framerImport.inputUrl ?? framerImport.fileName ?? framerImport.id})`,
    };
  }

  return null;
}

export type ProjectConversion = {
  id: string;
  status: string;
  sourcePlatform?: string;
  hasArtifact?: boolean;
  createdAt: string;
  updatedAt: string;
};

// Validate the conversion-history envelope: { conversions: [...] }. Each entry must
// carry a real persisted ConversionJob id — never a project or upload id.
function parseConversionsResponse(payload: unknown): ProjectConversion[] {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The conversion history response was not a valid object.');
  }
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.conversions)) {
    throw new Error('The conversion history response did not contain a conversions array.');
  }
  return record.conversions.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Conversion history entry ${index} was not an object.`);
    }
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || !item.id.trim()) {
      throw new Error(`Conversion history entry ${index} was missing an id.`);
    }
    if (typeof item.status !== 'string') {
      throw new Error(`Conversion history entry ${index} was missing a status.`);
    }
    if (typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string') {
      throw new Error(`Conversion history entry ${index} was missing timestamps.`);
    }
    return {
      id: item.id,
      status: item.status,
      sourcePlatform: typeof item.sourcePlatform === 'string' ? item.sourcePlatform : undefined,
      hasArtifact: item.hasArtifact === true,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  QUEUED: 'info',
  RUNNING: 'info',
  BLOCKED: 'warning',
  SUCCEEDED: 'success',
  FAILED: 'error',
  CANCELLED: 'neutral',
};

function statusTone(status: string) {
  return STATUS_TONE[status] ?? 'neutral';
}

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;
  const [project, setProject] = useState<ProjectDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [conversions, setConversions] = useState<ProjectConversion[]>([]);
  const [conversionsLoading, setConversionsLoading] = useState(true);
  const [conversionsError, setConversionsError] = useState<string | null>(null);
  const [isStartingConversion, setIsStartingConversion] = useState(false);
  const [startConversionError, setStartConversionError] = useState<string | null>(null);

  const readySource = deriveReadyConversionSource(project);

  async function handleStartConversion() {
    if (!readySource || isStartingConversion) return;
    setIsStartingConversion(true);
    setStartConversionError(null);
    try {
      const refId = readySource.uploadId ?? readySource.sourceImportId ?? readySource.sourceType;
      const idempotencyKey = `conv-${projectId}-${refId}`.slice(0, 128);
      const response = await apiClient.createConversion(projectId, {
        sourceType: readySource.sourceType,
        ...(readySource.detectedFramework ? { detectedFramework: readySource.detectedFramework } : {}),
        ...(readySource.uploadId ? { uploadId: readySource.uploadId } : {}),
        ...(readySource.sourceImportId ? { sourceImportId: readySource.sourceImportId } : {}),
        targetProfile: {
          platform: 'elementor',
          architecture: 'atomic',
          licenseMode: 'free',
        },
        idempotencyKey,
      });
      const conversionId = response?.conversion?.id;
      if (!conversionId) {
        throw new Error('Conversion job was created, but the response did not include a conversion ID.');
      }
      setReloadToken((value) => value + 1);
      window.location.href = `/conversions/${conversionId}`;
    } catch (err) {
      setStartConversionError(getErrorMessage(err));
    } finally {
      setIsStartingConversion(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getProject(projectId)
      .then((payload) => {
        const parsed = parseProjectResponse(payload);
        if (cancelled) return;
        setProject(parsed);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProject(null);
        setError(getErrorMessage(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadToken]);

  // Load this project's real conversion history from the backend. Each returned
  // entry carries a genuine persisted ConversionJob id (never a project/upload id),
  // which is what the details URL and navigation must use.
  useEffect(() => {
    let cancelled = false;
    setConversionsLoading(true);
    setConversionsError(null);
    apiClient
      .getProjectConversions(projectId)
      .then((payload) => {
        if (cancelled) return;
        setConversions(parseConversionsResponse(payload));
        setConversionsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setConversions([]);
        setConversionsError(getErrorMessage(err));
        setConversionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, reloadToken]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">Project</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? 'Loading…' : (project?.name ?? 'Project not found')}
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {readySource ? (
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartConversion}
                disabled={isStartingConversion}
              >
                {isStartingConversion ? 'Starting conversion…' : 'Start Elementor Conversion'}
              </button>
            ) : null}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setReloadToken((value) => value + 1)}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div role="status" className="card text-sm text-slate-600">
            Loading project…
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p>Could not load this project.</p>
            <p className="mt-1">{error}</p>
            <p className="mt-1">Check that you are signed in and the API is running, then retry.</p>
            <Link href="/projects" className="btn-secondary mt-3 inline-flex">
              Back to projects
            </Link>
          </div>
        ) : !project ? (
          <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p>This project was not found in your account.</p>
            <Link href="/projects" className="btn-secondary mt-3 inline-flex">
              Back to projects
            </Link>
          </div>
        ) : (
          <>
            <div className="card space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-500">Project overview</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{project.name}</p>
                </div>
                {readySource ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    Validated source: {readySource.label}
                  </div>
                ) : null}
              </div>
              {startConversionError ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p>Could not start Elementor conversion.</p>
                  <p className="mt-1">{startConversionError}</p>
                </div>
              ) : null}
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Created</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{toDateLabel(project.createdAt)}</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">Updated</dt>
                  <dd className="mt-2 text-lg font-semibold text-slate-900">{toDateLabel(project.updatedAt)}</dd>
                </div>
              </dl>
            </div>

            <section className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Conversion history</h3>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReloadToken((value) => value + 1)}
                  disabled={conversionsLoading}
                  aria-label="Refresh conversion history"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </button>
              </div>

              {conversionsLoading ? (
                <p role="status" className="text-sm text-slate-600">Loading conversions…</p>
              ) : conversionsError ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <p>Could not load this project&apos;s conversion history.</p>
                  <p className="mt-1">{conversionsError}</p>
                </div>
              ) : conversions.length === 0 ? (
                <p className="text-sm text-slate-600">No conversions yet for this project.</p>
              ) : (
                <ul className="space-y-3">
                  {conversions.map((conversion) => (
                    <li key={conversion.id}>
                      <Link
                        href={`/conversions/${conversion.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-brand-50 p-2 text-brand-600">
                            <FileCode2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {conversion.sourcePlatform ?? 'Conversion'}
                            </p>
                            <p className="text-xs text-slate-500">
                              Updated {toDateLabel(conversion.updatedAt)}
                              {conversion.hasArtifact ? ' · Artifact ready' : ''}
                            </p>
                          </div>
                        </div>
                        <StatusBadge label={conversion.status} tone={statusTone(conversion.status)} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}

