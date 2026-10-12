'use client';

import { useCallback, useState } from 'react';
import { validateFigmaDesignFile } from '../services/figma.service';
import type { FigmaValidation } from '../types/figma.types';
import type { SourceImportSummary } from '@/lib/schemas';
import type { SourceIntakeState } from '@/features/uploads/SourceSelector';

export function useFigmaIntake(maxBytes?: number | null) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [intakeState, setIntakeState] = useState<SourceIntakeState>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<FigmaValidation>(null);
  const [importResult, setImportResult] = useState<SourceImportSummary | null>(null);

  const selectFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setSelectedFile(null);
        setError(null);
        setValidation(null);
        setImportResult(null);
        setIntakeState('idle');
        return;
      }
      const check = validateFigmaDesignFile(file, maxBytes);
      if (!check.valid) {
        setSelectedFile(null);
        setError(check.error);
        setIntakeState('failed');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setIntakeState('selected');
    },
    [maxBytes],
  );

  const reset = useCallback(() => {
    setSelectedFile(null);
    setIntakeState('idle');
    setProgress(null);
    setError(null);
    setValidation(null);
    setImportResult(null);
  }, []);

  return {
    selectedFile,
    intakeState,
    progress,
    error,
    validation,
    importResult,
    selectFile,
    setIntakeState,
    setProgress,
    setError,
    setValidation,
    setImportResult,
    reset,
  };
}

