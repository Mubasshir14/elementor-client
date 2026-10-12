import type { ProjectCapabilities, SourceImportSummary } from '@/lib/schemas';
import type { SourceIntakeState } from '@/features/uploads/SourceSelector';

export type FramerProps = {
  capabilities: ProjectCapabilities | null;
  siteUrl: string;
  onSiteUrlChange: (v: string) => void;
  intakeState: SourceIntakeState;
  error: string | null;
  statusDetail?: string | null;
  importResult: SourceImportSummary | null;
  importing: boolean;
  onImport: () => void;
  onRetry: () => void;
};

