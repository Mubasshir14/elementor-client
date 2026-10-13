'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-handling';

// Backend ConversionStatus enum values (server/src/generated/prisma).
export type ConversionStatusValue =
  | 'QUEUED'
  | 'RUNNING'
  | 'BLOCKED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export type ConversionStage = {
  name: string;
  status: string;
  inputHash?: string | null;
  outputKey?: string | null;
  diagnostics?: unknown;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type ConversionDetail = {
  id: string;
  status: ConversionStatusValue;
  errorCode?: string | null;
  errorMessage?: string | null;
  attempt?: number;
  sourcePlatform?: string;
  createdAt: string;
  updatedAt: string;
};

const STATUS_TONE: Record<ConversionStatusValue, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  QUEUED: 'info',
  RUNNING: 'info',
  BLOCKED: 'warning',
  SUCCEEDED: 'success',
  FAILED: 'error',
  CANCELLED: 'neutral',
};

const STATUS_LABEL: Record<ConversionStatusValue, string> = {
  QUEUED: 'Queued',
  RUNNING: 'Running',
  BLOCKED: 'Blocked',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

// Human-readable labels for the pipeline stages persisted by the backend.
const STAGE_LABEL: Record<string, string> = {
  source_inspection: 'Source inspection',
  source_ir_validation: 'Source validation',
  target_ir_generation: 'Elementor generation',
};

export function stageLabel(name: string): string {
  return STAGE_LABEL[name] ?? name;
}

export function statusTone(status: ConversionStatusValue) {
  return STATUS_TONE[status] ?? 'neutral';
}

export function statusLabel(status: ConversionStatusValue): string {
  return STATUS_LABEL[status] ?? status;
}

function parseConversion(payload: unknown): ConversionDetail {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The conversion response was not a valid object.');
  }
  const record = payload as Record<string, unknown>;
  const conversion = record.conversion as Record<string, unknown> | undefined;
  if (!conversion || typeof conversion.id !== 'string') {
    throw new Error('The conversion response did not contain a conversion record.');
  }
  const status = String(conversion.status) as ConversionStatusValue;
  if (!(status in STATUS_TONE)) {
    throw new Error(`Unknown conversion status: ${status}`);
  }
  return {
    id: conversion.id,
    status,
    errorCode: typeof conversion.errorCode === 'string' ? conversion.errorCode : null,
    errorMessage: typeof conversion.errorMessage === 'string' ? conversion.errorMessage : null,
    attempt: typeof conversion.attempt === 'number' ? conversion.attempt : undefined,
    sourcePlatform: typeof conversion.sourcePlatform === 'string' ? conversion.sourcePlatform : undefined,
    createdAt: String(conversion.createdAt),
    updatedAt: String(conversion.updatedAt),
  };
}

function parseStages(payload: unknown): ConversionStage[] {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The stages response was not a valid object.');
  }
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.stages)) {
    throw new Error('The stages response did not contain a stages array.');
  }
  return record.stages.map((entry) => {
    const stage = entry as Record<string, unknown>;
    return {
      name: String(stage.name),
      status: String(stage.status),
      inputHash: typeof stage.inputHash === 'string' ? stage.inputHash : null,
      outputKey: typeof stage.outputKey === 'string' ? stage.outputKey : null,
      diagnostics: stage.diagnostics ?? null,
      startedAt: typeof stage.startedAt === 'string' ? stage.startedAt : null,
      completedAt: typeof stage.completedAt === 'string' ? stage.completedAt : null,
    };
  });
}

function isTerminal(status: ConversionStatusValue): boolean {
  return status === 'SUCCEEDED' || status === 'FAILED' || status === 'CANCELLED' || status === 'BLOCKED';
}

// Derive the "current stage" label: the first non-completed stage in order,
// falling back to the last stage once everything is complete.
function currentStageLabel(stages: ConversionStage[]): string {
  if (stages.length === 0) return 'Preparing';
  const pending = stages.find((stage) => stage.status !== 'COMPLETED');
  const target = pending ?? stages[stages.length - 1];
  return stageLabel(target.name);
}

export type UseConversionState = {
  conversion: ConversionDetail | null;
  stages: ConversionStage[];
  currentStage: string;
  loading: boolean;
  error: string | null;
  downloadError: string | null;
  downloading: boolean;
  retryError: string | null;
  retrying: boolean;
  refresh: () => void;
  downloadArtifact: () => Promise<void>;
  retry: () => Promise<void>;
};

export function useConversion(conversionId: string): UseConversionState {
  const [conversion, setConversion] = useState<ConversionDetail | null>(null);
  const [stages, setStages] = useState<ConversionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  // Initial load: fetch the conversion and its stages from the backend.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .getConversion(conversionId)
      .then((payload) => {
        if (cancelled) return;
        setConversion(parseConversion(payload));
        setLoading(false);
        return apiClient.getConversionStages(conversionId).then((stagesPayload) => {
          if (cancelled) return;
          setStages(parseStages(stagesPayload));
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setConversion(null);
        setError(getErrorMessage(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversionId, reloadToken]);

  // Poll the backend as the source of truth while the job is non-terminal.
  useEffect(() => {
    if (!conversion || isTerminal(conversion.status)) return undefined;
    const timer = setInterval(() => {
      apiClient
        .getConversion(conversionId)
        .then((payload) => setConversion(parseConversion(payload)))
        .catch(() => undefined);
      apiClient
        .getConversionStages(conversionId)
        .then((payload) => setStages(parseStages(payload)))
        .catch(() => undefined);
    }, 3_000);
    return () => clearInterval(timer);
  }, [conversion, conversionId]);

  const downloadArtifact = useCallback(async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const { blob, fileName } = await apiClient.downloadConversionArtifact(conversionId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || 'elementor.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  }, [conversionId]);

  const retry = useCallback(async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      await apiClient.retryConversion(conversionId);
      refresh();
    } catch (err) {
      setRetryError(getErrorMessage(err));
    } finally {
      setRetrying(false);
    }
  }, [conversionId, refresh]);

  return {
    conversion,
    stages,
    currentStage: currentStageLabel(stages),
    loading,
    error,
    downloadError,
    downloading,
    retryError,
    retrying,
    refresh,
    downloadArtifact,
    retry,
  };
}

