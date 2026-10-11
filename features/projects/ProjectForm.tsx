'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-handling';
import { ProjectCapabilities, SourceImportSummary, SourceType } from '@/lib/schemas';

export type IntakeSubmitter = {
  onProgress: (n: number | null) => void;
  onState: (s: 'uploading' | 'importing' | 'validating' | 'ready' | 'failed') => void;
  onValidation: (v: {
    framework?: string;
    sha256?: string;
    pageCount?: number;
    componentCount?: number;
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


export function ProjectForm({ capabilities, sourceType, file, framerSiteUrl, intake }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
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
        const contentType = file.type === 'application/x-zip-compressed' ? 'application/x-zip-compressed' : 'application/zip';
        const { upload } = await apiClient.reserveUpload(projectId, {
          sourceType: 'react-next-zip',
          fileName: file.name,
          contentType,
          sizeBytes: file.size,
        });
        await apiClient.uploadContent(upload.id, file, (n) => intake.onProgress(n));
        intake.onState('validating');
        const result = await apiClient.completeUpload(upload.id);
        intake.onProgress(100);
        intake.onValidation({ framework: result.upload.detectedFramework, sha256: result.upload.sha256 });
        intake.onState('ready');
        setSuccess(`${result.upload.detectedFramework === 'nextjs' ? 'Next.js' : 'React'} project ZIP validated and added. ${capabilities?.target.unavailableReason ?? 'Conversion is not currently available.'}`);
        return;
      }

      if (sourceType === 'figma') {
        if (!file) {
          window.location.href = '/projects';
          return;
        }
        const isFig = file.name.toLowerCase().endsWith('.fig');
        intake.onState('uploading');
        intake.onProgress(0);
        const { upload } = await apiClient.reserveUpload(projectId, {
          sourceType: 'figma',
          fileName: file.name,
          contentType: isFig ? 'application/octet-stream' : 'application/json',
          sizeBytes: file.size,
        });
        await apiClient.uploadContent(upload.id, file, (n) => intake.onProgress(n), isFig ? 'application/octet-stream' : 'application/json');
        intake.onState('validating');
        const result = await apiClient.completeUpload(upload.id);
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
        intake.onState('ready');
        setSuccess(`Figma design “${result.sourceImport?.fileName ?? file.name}” parsed locally. ${capabilities?.target.unavailableReason ?? 'Conversion is not currently available.'}`);
        return;
      }

      if (sourceType === 'framer') {
        if (!framerSiteUrl.trim()) {
          throw new Error('Paste a published Framer site URL, then analyze it.');
        }
        intake.onState('importing');
        const { sourceImport } = await apiClient.importFramer(projectId, { siteUrl: framerSiteUrl.trim() });
        intake.onImportResult(sourceImport);
        intake.onState('ready');
        setSuccess(`Framer published site analyzed. ${capabilities?.target.unavailableReason ?? ''}`);
        return;
      }

      window.location.href = '/projects';
    } catch (err) {
      const detail = getErrorMessage(err);
      intake.onState('failed');
      intake.onError(detail);
      setError(projectCreated ? `The project was created, but the source intake could not be completed: ${detail}` : detail);
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
        <input id="project-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Landing page refresh" required disabled={Boolean(createdProjectId)} />
      </div>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
      {success ? (
        <div role="status" className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>{success}</p>
          <a className="font-medium underline" href="/projects">View projects</a>
        </div>
      ) : null}

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Working…' : sourceType === 'react-next-zip' ? (createdProjectId && file ? 'Retry ZIP upload' : file ? 'Create project and validate ZIP' : 'Create project') : sourceType === 'figma' ? (createdProjectId && file ? 'Retry Figma upload' : file ? 'Create project and parse Figma file' : 'Create project') : 'Create project and analyze Framer site'}
      </button>
    </form>
  );
}
