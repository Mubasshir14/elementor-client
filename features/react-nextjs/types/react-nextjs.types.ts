import type { ProjectCapabilities, SourceImportSummary } from '@/lib/schemas';
import type { SourceIntakeState } from '@/features/uploads/SourceSelector';

export type ZipValidation = {
  framework?: string;
  sha256?: string;
  routerConvention?: string;
  packageName?: string;
  sourceFileCount?: number;
  routeCount?: number;
  componentCount?: number;
  styleFileCount?: number;
  assetCount?: number;
} | null;

export type ReactNextRoutePreview = {
  id: string;
  path: string;
  name: string;
  sourceFile: string;
  sectionCount?: number;
};

export type ReactNextComponentPreview = {
  name: string;
  sourceFile: string;
  roleHint?: string;
};

export type ZipProps = {
  capabilities: ProjectCapabilities | null;
  selectedFile: File | null;
  intakeState: SourceIntakeState;
  progress: number | null;
  statusDetail?: string | null;
  error: string | null;
  onFileChange: (file: File | null, error: string | null) => void;
  validation: ZipValidation;
  importResult?: SourceImportSummary | null;
};

