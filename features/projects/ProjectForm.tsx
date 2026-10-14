'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-handling';
import { ProjectCapabilities, SourceImportSummary, SourceType } from '@/lib/schemas';
import { uploadReactNextZipFile } from '@/features/react-nextjs/services/react-nextjs.service';
import { uploadFigmaDesignFile } from '@/features/figma/services/figma.service';
import { importFramerPublishedSite } from '@/features/framer/services/framer.service';

export type IntakeSubmitter = {
  onProgress: (n: number | null) => void;
  onState: (s: 'uploading' | 'importing' | 'validating' | 'ready' | 'failed') => void;
  onValidation: (v: {
    framework?: string;
    sha256?: string;
    routerConvention?: string;
    packageName?: string;
    sourceFileCount?: number;
    routeCount?: number;
    componentCount?: number;
    styleFileCount?: number;
    assetCount?: number;
    pageCount?: number;
    styleCount?: number;
    nodeCount?: number;
  } | null) => void;
  onImportResult: (r: SourceImportSummary | null) => void;
  onError: (e: string | null) => void;
};

type Props = {
  capabilities: ProjectCapabilities | null;
  sourceType: SourceType;
  file: File | null;
  framerSiteUrl: string;
  intake: IntakeSubmitter;
};

type ReadyConversionSource = {
  sourceType: 'react-next-zip' | 'figma' | 'framer';
  uploadId?: string;
  detectedFramework?: 'react' | 'nextjs';
  sourceImportId?: string;
};

export function ProjectForm({ capabilities, sourceType, file, framerSiteUrl, intake }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [readySource, setReadySource] = useState<ReadyConversionSource | null>(null);
  const [isStartingConversion, setIsStartingConversion] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  async function handleStartConversion() {
    if (!createdProjectId || !readySource || isStartingConversion) return;
    setIsStartingConversion(true);
    setConversionError(null);
    try {
      const refId = readySource.uploadId ?? readySource.sourceImportId ?? readySource.sourceType;
      const idempotencyKey = `conv-${createdProjectId}-${refId}`.slice(0, 128);
      const response = await apiClient.createConversion(createdProjectId, {
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
      window.location.href = `/conversions/${conversionId}`;
    } catch (err) {
      setConversionError(getErrorMessage(err));
    } finally {
      setIsStartingConversion(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setConversionError(null);
    setReadySource(null);
    intake.onError(null);
    let projectCreated = Boolean(createdProjectId);

    try {
      const source = capabilities?.sourceTypes.find((option) => option.id === sourceType);
      const needsConfig = source?.status === 'needs-configuration';
      if (!source || source.status === 'unavailable' || needsConfig) {
        throw new Error(source?.unavailableReason ?? 'The selected source type is not available.');
      }

      let projectId = createdProjectId;
      if (!projectId) {
        const { project } = await apiClient.createProject({ name });
        projectId = project.id;
        setCreatedProjectId(projectId);
        projectCreated = true;
      }

      if (sourceType === 'react-next-zip') {
        if (!file) {
          window.location.href = '/projects';
          return;
        }
        intake.onState('uploading');
        intake.onProgress(0);
        const result = await uploadReactNextZipFile(projectId, file, (n) => intake.onProgress(n));
        intake.onState('validating');
        intake.onProgress(100);
        const summary = (result.sourceImport?.summary ?? {}) as Record<string, unknown>;
        intake.onValidation({
          framework: result.upload.detectedFramework,
          sha256: result.upload.sha256,
          routerConvention: typeof summary.routerConvention === 'string' ? summary.routerConvention : undefined,
          packageName: typeof summary.packageName === 'string' ? summary.packageName : undefined,
          sourceFileCount: typeof summary.sourceFileCount === 'number' ? summary.sourceFileCount : undefined,
          routeCount: typeof summary.routeCount === 'number' ? summary.routeCount : undefined,
          componentCount: typeof summary.componentCount === 'number' ? summary.componentCount : undefined,
          styleFileCount: typeof summary.styleFileCount === 'number' ? summary.styleFileCount : undefined,
          assetCount: typeof summary.assetCount === 'number' ? summary.assetCount : undefined,
        });
        if (result.sourceImport) {
          intake.onImportResult(result.sourceImport);
        }
        const resolvedImportId = result.upload.sourceImportId ?? result.sourceImport?.id;
        setReadySource({
          sourceType: 'react-next-zip',
          uploadId: result.upload.id,
          detectedFramework: result.upload.detectedFramework ?? 'react',
          ...(resolvedImportId ? { sourceImportId: resolvedImportId } : {}),
        });
        intake.onState('ready');
        setSuccess(
          `${result.upload.detectedFramework === 'nextjs' ? 'Next.js' : 'React'} project ZIP validated and added. ${capabilities?.target.unavailableReason ?? 'Conversion is not currently available.'}`,
        );
        return;
      }

      if (sourceType === 'figma') {
        if (!file) {
          window.location.href = '/projects';
          return;
        }
        intake.onState('uploading');
        intake.onProgress(0);
        const result = await uploadFigmaDesignFile(projectId, file, (n) => intake.onProgress(n));
        intake.onState('validating');
        intake.onProgress(100);
        const summary = (result.sourceImport?.summary ?? {}) as Record<string, unknown>;
        intake.onValidation({
          sha256: result.upload.sha256,
          pageCount: typeof summary.pageCount === 'number' ? summary.pageCount : undefined,
          componentCount: typeof summary.componentCount === 'number' ? summary.componentCount : undefined,
          styleCount: typeof summary.styleCount === 'number' ? summary.styleCount : undefined,
          nodeCount: typeof summary.nodeCount === 'number' ? summary.nodeCount : undefined,
        });
        if (result.sourceImport) intake.onImportResult(result.sourceImport);
        const resolvedImportId = result.sourceImport?.id ?? result.upload.sourceImportId;
        if (resolvedImportId) {
          setReadySource({
            sourceType: 'figma',
            uploadId: result.upload.id,
            sourceImportId: resolvedImportId,
          });
        }
        intake.onState('ready');
        setSuccess(
          `Figma design “${result.sourceImport?.fileName ?? file.name}” parsed locally. ${capabilities?.target.unavailableReason ?? 'Conversion is not currently available.'}`,
        );
        return;
      }

      if (sourceType === 'framer') {
        if (!framerSiteUrl.trim()) {
          throw new Error('Paste a published Framer site URL, then analyze it.');
        }
        intake.onState('importing');
        const { sourceImport } = await importFramerPublishedSite(projectId, framerSiteUrl);
        intake.onImportResult(sourceImport);
        setReadySource({
          sourceType: 'framer',
          sourceImportId: sourceImport.id,
        });
        intake.onState('ready');
        setSuccess(`Framer published site analyzed. ${capabilities?.target.unavailableReason ?? ''}`);
        return;
      }

      window.location.href = '/projects';
    } catch (err) {
      const detail = getErrorMessage(err);
      intake.onState('failed');
      intake.onError(detail);
      setError(
        projectCreated
          ? `The project was created, but the source intake could not be completed: ${detail}`
          : detail,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="label" htmlFor="project-name">
          Project name
        </label>
        <input
          id="project-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Landing page refresh"
          required
          disabled={Boolean(createdProjectId)}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
          <p>{success}</p>
          {readySource && createdProjectId ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={handleStartConversion}
                disabled={isStartingConversion}
              >
                {isStartingConversion ? 'Starting conversion…' : 'Start Elementor Conversion'}
              </button>
              <a className="font-medium underline" href={`/projects/${createdProjectId}`}>
                Open project
              </a>
              <a className="font-medium underline" href="/projects">
                View projects
              </a>
            </div>
          ) : (
            <a className="font-medium underline" href="/projects">
              View projects
            </a>
          )}
          {conversionError ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {conversionError}
            </div>
          ) : null}
        </div>
      ) : null}

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting
          ? 'Working…'
          : sourceType === 'react-next-zip'
            ? createdProjectId && file
              ? 'Retry ZIP upload'
              : file
                ? 'Create project and validate ZIP'
                : 'Create project'
            : sourceType === 'figma'
              ? createdProjectId && file
                ? 'Retry Figma upload'
                : file
                  ? 'Create project and parse Figma file'
                  : 'Create project'
              : 'Create project and analyze Framer site'}
      </button>
    </form>
  );
}
