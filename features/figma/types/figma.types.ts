import type { ProjectCapabilities, SourceImportSummary } from '@/lib/schemas';
import type { SourceIntakeState } from '@/features/uploads/SourceSelector';

export type FigmaValidation = {
  pageCount?: number;
  componentCount?: number;
  styleCount?: number;
  nodeCount?: number;
  instanceCount?: number;
} | null;

export type FigmaPagePreview = {
  id: string;
  name: string;
  childCount?: number;
  nodeCount?: number;
};

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

