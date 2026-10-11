export type UserRole = 'admin' | 'editor' | 'viewer';

export type AuthSession = {
  user: User;
  token: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
};

export type Project = {
  id: string;
  name: string;
  sourceType: 'zip' | 'screenshot' | 'design-file' | 'figma' | 'xd';
  status: 'draft' | 'queued' | 'running' | 'waiting_for_approval' | 'succeeded' | 'failed' | 'canceled';
  target: 'elementor-free' | 'elementor-pro';
  architecture?: 'react' | 'elementor';
  updatedAt: string;
  createdAt: string;
};

export type ProjectSummary = Pick<Project, 'id' | 'name' | 'createdAt' | 'updatedAt'>;

export type SourceType = 'react-next-zip' | 'figma' | 'framer' | 'screenshot';
export type SourceStatus = 'available' | 'unavailable' | 'needs-configuration';
export type SourceImportMethod = 'zip-upload' | 'file-upload' | 'published-site-url' | 'unavailable';
export type ElementorArchitecture = 'atomic' | 'legacy' | 'hybrid';
export type ElementorLicenseMode = 'free' | 'pro' | 'hybrid';

export type ConversionSettingsValue = {
  sourceType: SourceType;
  detectedFramework?: 'react' | 'nextjs';
  targetProfile: {
    platform: 'elementor';
    architecture: ElementorArchitecture;
    licenseMode: ElementorLicenseMode;
  };
};

export type ProjectCapabilities = {
  sourceTypes: Array<{
    id: SourceType;
    label: string;
    status: SourceStatus;
    acceptedFormats: string[];
    maxBytes: number | null;
    frameworkAutoDetection: boolean;
    conversionAvailable: boolean;
    unavailableReason?: string;
    importMethod: SourceImportMethod;
    authorization: {
      type: 'none';
      connected: boolean;
      connectUrl?: string;
      scopes: string[];
    };
  }>;
  target: {
    platform: 'elementor';
    status: 'unavailable';
    architectures: ElementorArchitecture[];
    licenseModes: ElementorLicenseMode[];
    unavailableReason: string;
  };
  defaults: null;
};

export type SourceImportSummary = {
  id: string;
  kind: 'FIGMA_FILE' | 'FRAMER_SITE';
  status: 'READY' | 'FAILED';
  inputUrl?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  summary?: Record<string, unknown> | null;
  diagnostics?: Array<{ code?: string; message: string }> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Conversion = {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'waiting_for_approval' | 'succeeded' | 'failed' | 'canceled';
  currentStage: string;
  diagnostics: Diagnostic[];
  createdAt: string;
  updatedAt: string;
};

export type Diagnostic = {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  stage: string;
  createdAt: string;
};

export type Artifact = {
  id: string;
  name: string;
  type: 'zip' | 'json' | 'html' | 'wordpress';
  sizeBytes: number;
  url: string;
  createdAt: string;
};

export type WordPressSite = {
  id: string;
  name: string;
  url: string;
  connectedAt: string;
  status: 'connected' | 'needs_attention';
};

export type UploadValidationError = {
  field: string;
  message: string;
};

export type ApiValidationIssue = {
  path: Array<string | number>;
  code: string;
  message: string;
};

export type ApiErrorShape = {
  error: string | {
    code?: string;
    message?: string;
    issues?: ApiValidationIssue[];
  };
  message?: string;
  details?: Record<string, unknown>;
};
