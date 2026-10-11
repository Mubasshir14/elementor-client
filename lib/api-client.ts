import { Artifact, AuthSession, Conversion, ConversionSettingsValue, Project, ProjectCapabilities, ProjectSummary, SourceImportSummary, User, WordPressSite } from '@/lib/schemas';
import { ApiNetworkError, ApiResponseError } from '@/lib/error-handling';

const DEFAULT_API_BASE = 'http://localhost:4000/api/v1';

export type ApiClientConfig = {
  baseUrl?: string;
  token?: string;
};

export function isAuthorization(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    Object.keys(item).length >= 3 &&
    Object.keys(item).length <= 4 &&
    item.type === 'none' &&
    typeof item.connected === 'boolean' &&
    (item.connectUrl === undefined || typeof item.connectUrl === 'string') &&
    Array.isArray(item.scopes) &&
    (item.scopes as unknown[]).every((scope) => typeof scope === 'string')
  );
}

export function isProjectCapabilities(value: unknown): value is ProjectCapabilities {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const capabilities = value as Record<string, unknown>;
  if (Object.keys(capabilities).length !== 3 || !Array.isArray(capabilities.sourceTypes) || capabilities.sourceTypes.length !== 4) {
    return false;
  }
  const sourceIds = new Set<string>();
  for (const source of capabilities.sourceTypes) {
    if (typeof source !== 'object' || source === null) return false;
    const item = source as Record<string, unknown>;
    if (
      Object.keys(item).length !== 10 ||
      typeof item.id !== 'string' ||
      !['react-next-zip', 'figma', 'framer', 'screenshot'].includes(item.id) ||
      sourceIds.has(item.id) ||
      typeof item.label !== 'string' ||
      !item.label.trim() ||
      (item.status !== 'available' && item.status !== 'unavailable' && item.status !== 'needs-configuration') ||
      !Array.isArray(item.acceptedFormats) ||
      !item.acceptedFormats.every((format) => typeof format === 'string') ||
      !(item.maxBytes === null || (typeof item.maxBytes === 'number' && Number.isInteger(item.maxBytes) && item.maxBytes > 0)) ||
      typeof item.frameworkAutoDetection !== 'boolean' ||
      typeof item.conversionAvailable !== 'boolean' ||
      typeof item.unavailableReason !== 'string' ||
      !item.unavailableReason.trim() ||
      !['zip-upload', 'file-upload', 'published-site-url', 'unavailable'].includes(item.importMethod as string) ||
      !isAuthorization(item.authorization)
    ) {
      return false;
    }
    sourceIds.add(item.id);
  }
  if (!['react-next-zip', 'figma', 'framer', 'screenshot'].every((id) => sourceIds.has(id))) {
    return false;
  }
  if (capabilities.sourceTypes.some((source) => {
    const item = source as Record<string, unknown>;
    if (item.id === 'react-next-zip') return false;
    if (item.id === 'figma') {
      const formats = item.acceptedFormats as unknown[];
      return item.status !== 'available' ||
        formats.length !== 2 ||
        !formats.includes('.fig') ||
        !formats.includes('.json') ||
        item.maxBytes === null ||
        item.frameworkAutoDetection !== false ||
        item.conversionAvailable !== false ||
        item.importMethod !== 'file-upload';
    }
    if (item.id === 'framer') {
      return item.status !== 'available' ||
        (item.acceptedFormats as unknown[]).length !== 0 ||
        item.maxBytes !== null ||
        item.frameworkAutoDetection !== false ||
        item.conversionAvailable !== false ||
        item.importMethod !== 'published-site-url';
    }
    return item.status !== 'unavailable' ||
      (item.acceptedFormats as unknown[]).length !== 0 ||
      item.maxBytes !== null ||
      item.frameworkAutoDetection !== false ||
      item.conversionAvailable !== false ||
      item.importMethod !== 'unavailable';
  })) {
    return false;
  }
  const reactZip = capabilities.sourceTypes.find((item) =>
    typeof item === 'object' && item !== null && (item as Record<string, unknown>).id === 'react-next-zip',
  ) as Record<string, unknown> | undefined;
  if (
    !reactZip ||
    reactZip.status !== 'available' ||
    JSON.stringify(reactZip.acceptedFormats) !== JSON.stringify(['.zip']) ||
    typeof reactZip.maxBytes !== 'number' ||
    reactZip.maxBytes <= 0 ||
    reactZip.frameworkAutoDetection !== true ||
    reactZip.conversionAvailable !== false ||
    reactZip.importMethod !== 'zip-upload'
  ) {
    return false;
  }
  if (typeof capabilities.target !== 'object' || capabilities.target === null) {
    return false;
  }
  const target = capabilities.target as Record<string, unknown>;
  if (
    Object.keys(target).length !== 5 ||
    target.platform !== 'elementor' ||
    target.status !== 'unavailable' ||
    !Array.isArray(target.architectures) ||
    target.architectures.length !== 0 ||
    !Array.isArray(target.licenseModes) ||
    target.licenseModes.length !== 0 ||
    typeof target.unavailableReason !== 'string' ||
    !target.unavailableReason.trim()
  ) {
    return false;
  }
  if (capabilities.defaults !== null) return false;
  return true;
}

export class ApiClient {
  private baseUrl: string;
  private token?: string;
  private capabilitiesCache?: ProjectCapabilities;
  private capabilitiesRequest?: Promise<ProjectCapabilities>;

  constructor(config: ApiClientConfig = {}) {
    const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    this.baseUrl = config.baseUrl ?? envBaseUrl ?? DEFAULT_API_BASE;
    this.token = config.token ?? this.readStoredToken();
  }

  private readStoredToken() {
    if (typeof window === 'undefined') {
      return undefined;
    }

    return window.localStorage.getItem('dte-auth-token') ?? undefined;
  }

  private persistToken(token: string | undefined) {
    if (typeof window === 'undefined') {
      return;
    }

    if (token) {
      window.localStorage.setItem('dte-auth-token', token);
      return;
    }

    window.localStorage.removeItem('dte-auth-token');
  }

  setToken(token: string | undefined) {
    this.token = token;
    this.persistToken(token);
  }

  clearToken() {
    this.setToken(undefined);
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers ?? {});
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers,
        cache: 'no-store',
      });
    } catch (error) {
      throw new ApiNetworkError(error);
    }

    if (!response.ok) {
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = undefined;
      }

      if (response.status === 401) {
        this.clearToken();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }

      throw new ApiResponseError(response.status, payload);
    }

    return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
  }

  getCurrentUser() {
    return this.request<User>('/me');
  }

  signIn(email: string, password: string) {
    return this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(email: string, password: string) {
    return this.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  signOut() {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  listProjects() {
    return this.request<Project[]>('/projects');
  }

  createProject(input: { name: string }) {
    return this.request<{ project: ProjectSummary }>('/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  reserveUpload(projectId: string, input: {
    sourceType: 'react-next-zip' | 'figma';
    fileName: string;
    contentType: 'application/zip' | 'application/x-zip-compressed' | 'application/json' | 'application/octet-stream';
    sizeBytes: number;
  }) {
    return this.request<{
      upload: { id: string; sourceType: string; status: string; sizeBytes: string };
      contentUrl: string;
    }>(`/projects/${projectId}/uploads`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  uploadContent(uploadId: string, file: File, onProgress?: (percentage: number) => void, contentType?: string) {
    const resolvedType = (contentType ?? file.type) || 'application/zip';
    if (onProgress && typeof XMLHttpRequest !== 'undefined') {
      const baseUrl = this.baseUrl;
      const token = this.token;
      return new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('PUT', `${baseUrl}/uploads/${uploadId}/content`);
        request.setRequestHeader('Content-Type', resolvedType);
        if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
        request.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && event.total > 0) {
            onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
          }
        });
        request.addEventListener('load', () => {
          if (request.status >= 200 && request.status < 300) {
            onProgress(100);
            resolve();
            return;
          }
          let payload: unknown;
          try {
            payload = request.responseText ? JSON.parse(request.responseText) : undefined;
          } catch {
            payload = undefined;
          }
          if (request.status === 401) this.clearToken();
          reject(new ApiResponseError(request.status, payload));
        });
        request.addEventListener('error', () => reject(new ApiNetworkError(request)));
        request.addEventListener('abort', () => reject(new ApiNetworkError(request)));
        request.send(file);
      });
    }
    return this.request<void>(`/uploads/${uploadId}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': resolvedType },
      body: file,
    });
  }

  completeUpload(uploadId: string) {
    return this.request<{
      upload: {
        id: string;
        sourceType: string;
        detectedFramework?: 'react' | 'nextjs';
        status: 'READY';
        sha256: string;
        completedAt: string;
      };
      sourceImport?: SourceImportSummary;
    }>(`/uploads/${uploadId}/complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  getProject(projectId: string) {
    return this.request<Project>(`/projects/${projectId}`);
  }

  updateProject(projectId: string, input: Partial<Project>) {
    return this.request<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  deleteProject(projectId: string) {
    return this.request<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  importFramer(projectId: string, input: { siteUrl: string }) {
    return this.request<{ sourceImport: SourceImportSummary }>(`/projects/${projectId}/imports/framer`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listSourceImports(projectId: string) {
    return this.request<{ sourceImports: SourceImportSummary[] }>(`/projects/${projectId}/imports`);
  }

  createConversion(projectId: string, input: ConversionSettingsValue & { uploadId?: string; sourceImportId?: string; idempotencyKey: string }) {
    return this.request<Conversion>(`/projects/${projectId}/conversions`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getConversion(conversionId: string) {
    return this.request<Conversion>(`/conversions/${conversionId}`);
  }

  retryConversion(conversionId: string) {
    return this.request<Conversion>(`/conversions/${conversionId}/retry`, {
      method: 'POST',
    });
  }

  cancelConversion(conversionId: string) {
    return this.request<Conversion>(`/conversions/${conversionId}/cancel`, {
      method: 'POST',
    });
  }

  listArtifacts(projectId?: string) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return this.request<Artifact[]>(`/artifacts${query}`);
  }

  getArtifact(artifactId: string) {
    return this.request<Artifact>(`/artifacts/${artifactId}`);
  }

  listWordPressSites() {
    return this.request<WordPressSite[]>('/wordpress-sites');
  }

  publishToWordPress(siteId: string, artifactId: string) {
    return this.request<{ status: 'queued' }>(`/wordpress-sites/${siteId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ artifactId }),
    });
  }

  getCapabilities(options: { refresh?: boolean } = {}): Promise<ProjectCapabilities> {
    if (options.refresh) {
      this.capabilitiesCache = undefined;
      this.capabilitiesRequest = undefined;
    }
    if (this.capabilitiesCache) {
      return Promise.resolve(this.capabilitiesCache);
    }
    if (this.capabilitiesRequest) {
      return this.capabilitiesRequest;
    }
    this.capabilitiesRequest = this.request<unknown>('/capabilities').then((response) => {
      if (!isProjectCapabilities(response)) {
        throw new Error('The server returned unsupported conversion capabilities. Please contact support.');
      }
      this.capabilitiesCache = response;
      return response;
    }).finally(() => {
      this.capabilitiesRequest = undefined;
    });
    return this.capabilitiesRequest;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
