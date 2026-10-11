'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectForm } from '@/features/projects/ProjectForm';
import { ConversionSettings } from '@/features/conversions/ConversionSettings';
import { FigmaPanel } from '@/features/uploads/FigmaPanel';
import { FramerPanel } from '@/features/uploads/FramerPanel';
import { SourceSelector, SourceIntakeState, isFramerUrl } from '@/features/uploads/SourceSelector';
import { ZipDropzone } from '@/features/uploads/ZipDropzone';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-handling';
import { ProjectCapabilities, SourceImportSummary, SourceType } from '@/lib/schemas';

export default function NewProjectPage() {
  const [capabilities, setCapabilities] = useState<ProjectCapabilities | null>(null);
  const [capabilitiesError, setCapabilitiesError] = useState<string | null>(null);
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType>('react-next-zip');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [framerSiteUrl, setFramerSiteUrl] = useState('');
  const [intakeState, setIntakeState] = useState<SourceIntakeState>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [validation, setValidation] = useState<{
    framework?: string;
    sha256?: string;
    pageCount?: number;
    componentCount?: number;
    styleCount?: number;
    nodeCount?: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<SourceImportSummary | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [remoteBusy, setRemoteBusy] = useState(false);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = useState(true);


  useEffect(() => {
    let isMounted = true;
    setIsLoadingCapabilities(true);
    apiClient.getCapabilities().then((data) => {
      if (isMounted) {
        setCapabilities(data);
        const availableSource = data.sourceTypes.find(({ status }) => status === 'available');
        if (availableSource) setSelectedSourceType(availableSource.id);
        setCapabilitiesError(null);
      }
    }).catch((error: unknown) => {
      if (isMounted) {
        setCapabilitiesError(getErrorMessage(error));
      }
    }).finally(() => {
      if (isMounted) {
        setIsLoadingCapabilities(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  function selectSource(sourceType: SourceType) {
    setSelectedSourceType(sourceType);
    setSelectedFile(null);
    setFileError(null);
    setFramerSiteUrl('');
    setProgress(null);
    setValidation(null);
    setImportResult(null);
    setRemoteError(null);
    setStatusDetail(null);
    setIntakeState('selected');
  }

  function nextStepFor(source: SourceType): string {
    if (source === 'react-next-zip') return 'Upload the ZIP, then create the project to run server validation.';
    if (source === 'figma') return 'Upload a Figma file JSON export, then create the project to validate and parse it locally.';
    return 'Paste a published Framer URL, then create the project to analyze it.';
  }

  async function retryCapabilities() {
    setIsLoadingCapabilities(true);
    setCapabilitiesError(null);
    try {
      const data = await apiClient.getCapabilities({ refresh: true });
      setCapabilities(data);
      const availableSource = data.sourceTypes.find(({ status }) => status === 'available');
      if (availableSource) setSelectedSourceType(availableSource.id);
    } catch (error) {
      setCapabilitiesError(getErrorMessage(error));
    } finally {
      setIsLoadingCapabilities(false);
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-600">New project</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Design source intake</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Select one source, provide its required input, then create the project so the backend can validate it. {nextStepFor(selectedSourceType)}</p>
        </div>

        {capabilitiesError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <span>Could not load supported source options. {capabilitiesError} Check that you are signed in and the API is running, then retry.</span>
            <button type="button" className="btn-secondary" onClick={retryCapabilities} disabled={isLoadingCapabilities}>
              {isLoadingCapabilities ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        ) : null}
        {isLoadingCapabilities && !capabilities ? <p role="status" className="text-sm text-slate-600">Loading supported source options...</p> : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <SourceSelector capabilities={capabilities} selectedSourceType={selectedSourceType} onSourceTypeChange={selectSource} intakeState={intakeState} />
            {selectedSourceType === 'react-next-zip' ? (
              <ZipDropzone capabilities={capabilities} selectedFile={selectedFile} intakeState={intakeState} progress={progress} statusDetail={statusDetail} error={fileError ?? remoteError} validation={validation} onFileChange={(file, error) => {
                setSelectedFile(file);
                setFileError(error);
                if (file) setIntakeState('selected');
              }} />
            ) : null}
            {selectedSourceType === 'figma' ? (
              <FigmaPanel capabilities={capabilities} selectedFile={selectedFile} intakeState={intakeState} progress={progress} statusDetail={statusDetail} error={fileError ?? remoteError} onFileChange={(file, error) => {
                setSelectedFile(file);
                setFileError(error);
                if (file) setIntakeState('selected');
              }} validation={validation} importResult={importResult} />
            ) : null}
            {selectedSourceType === 'framer' ? (
              <FramerPanel capabilities={capabilities} siteUrl={framerSiteUrl} onSiteUrlChange={(v) => {
                setFramerSiteUrl(v);
                setRemoteError(null);
                if (isFramerUrl(v)) setIntakeState('selected');
              }} intakeState={intakeState} error={remoteError} statusDetail={statusDetail} importResult={importResult} importing={remoteBusy} onImport={() => setRemoteBusy(false)} onRetry={() => setRemoteError(null)} />
            ) : null}
            <ConversionSettings capabilities={capabilities} />
          </div>

          <div className="card h-fit">
            <h3 className="text-xl font-semibold text-slate-900">Project details</h3>
            <p className="mt-2 text-sm text-slate-600">Create the project record and let the backend validate the source before conversion starts.</p>
            <div className="mt-6">
              <ProjectForm capabilities={capabilities} sourceType={selectedSourceType} file={selectedFile} framerSiteUrl={framerSiteUrl} intake={{
                onProgress: (n) => {
                  setProgress(n);
                  setStatusDetail(n == null ? null : `${n}%`);
                },
                onState: (s) => {
                  setIntakeState(s);
                  if (s === 'ready' || s === 'failed') setRemoteBusy(false);
                  else if (s === 'importing' || s === 'uploading' || s === 'validating') setRemoteBusy(true);
                },
                onValidation: (v) => setValidation(v),
                onImportResult: (r) => setImportResult(r),
                onError: (e) => setRemoteError(e),
              }} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
