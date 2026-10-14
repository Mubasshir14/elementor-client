import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectForm } from './ProjectForm';
import { apiClient } from '@/lib/api-client';
import { ProjectCapabilities } from '@/lib/schemas';

const capabilities: ProjectCapabilities = {
  sourceTypes: [
    {
      id: 'react-next-zip',
      label: 'React / Next.js Project ZIP',
      status: 'available',
      acceptedFormats: ['.zip'],
      maxBytes: 52_428_800,
      frameworkAutoDetection: true,
      conversionAvailable: false,
      unavailableReason: 'Conversion is not available yet.',
      importMethod: 'zip-upload',
      authorization: { type: 'none', connected: false, scopes: [] },
    },
    {
      id: 'figma',
      label: 'Figma Design File',
      status: 'available',
      acceptedFormats: ['.fig', '.json'],
      maxBytes: 52_428_800,
      frameworkAutoDetection: false,
      conversionAvailable: false,
      unavailableReason: 'Direct file upload; no Figma account connection.',
      importMethod: 'file-upload',
      authorization: { type: 'none', connected: false, scopes: [] },
    },
    {
      id: 'framer',
      label: 'Framer Project',
      status: 'available',
      acceptedFormats: [],
      maxBytes: null,
      frameworkAutoDetection: false,
      conversionAvailable: false,
      unavailableReason: 'Published-site URL analysis only.',
      importMethod: 'published-site-url',
      authorization: { type: 'none', connected: false, scopes: [] },
    },
    {
      id: 'screenshot',
      label: 'screenshot',
      status: 'unavailable' as const,
      acceptedFormats: [],
      maxBytes: null,
      frameworkAutoDetection: false,
      conversionAvailable: false,
      unavailableReason: 'The importer is not implemented.',
      importMethod: 'unavailable',
      authorization: { type: 'none', connected: false, scopes: [] },
    },
  ],
  target: {
    platform: 'elementor',
    status: 'unavailable',
    architectures: [],
    licenseModes: [],
    unavailableReason: 'Conversion is not available yet.',
  },
  defaults: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ProjectForm source intake', () => {
  it('creates a name-only project, sends the selected ZIP, and reports detected framework', async () => {
    const createProject = vi.spyOn(apiClient, 'createProject').mockResolvedValue({
      project: {
        id: 'project-id',
        name: 'Landing page',
        createdAt: '2026-10-11T00:00:00.000Z',
        updatedAt: '2026-10-11T00:00:00.000Z',
      },
    });
    const reserveUpload = vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'upload-id', sourceType: 'REACT_NEXT_ZIP', status: 'PENDING', sizeBytes: '10' },
      contentUrl: '/api/v1/uploads/upload-id/content',
    });
    const uploadContent = vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    const completeUpload = vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: {
        id: 'upload-id',
        sourceType: 'REACT_NEXT_ZIP',
        detectedFramework: 'nextjs',
        status: 'READY',
        sha256: 'f'.repeat(64),
        completedAt: '2026-10-11T00:00:00.000Z',
      },
    });
    const file = new File(['zip bytes'], 'site.zip', { type: 'application/zip' });

    const intake = {
      onProgress: vi.fn(),
      onState: vi.fn(),
      onValidation: vi.fn(),
      onImportResult: vi.fn(),
      onError: vi.fn(),
    };
    render(<ProjectForm capabilities={capabilities} sourceType="react-next-zip" file={file} framerSiteUrl="" intake={intake} />);
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Landing page' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project and validate ZIP' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Next.js project ZIP validated and added'));
    expect(createProject).toHaveBeenCalledWith({ name: 'Landing page' });
    expect(reserveUpload).toHaveBeenCalledWith('project-id', {
      sourceType: 'react-next-zip',
      fileName: 'site.zip',
      contentType: 'application/zip',
      sizeBytes: file.size,
    });
    expect(uploadContent).toHaveBeenCalledWith('upload-id', file, expect.any(Function));
    expect(completeUpload).toHaveBeenCalledWith('upload-id');
    expect(screen.getByRole('status').textContent).not.toContain('[object Object]');
  });

  it('uploads a Figma design file through the upload API and preserves the source reference', async () => {
    vi.spyOn(apiClient, 'createProject').mockResolvedValue({
      project: { id: 'project-id', name: 'Figma import', createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z' },
    });
    const reserveUpload = vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'upload-id', sourceType: 'FIGMA', status: 'PENDING', sizeBytes: '10' },
      contentUrl: '/api/v1/uploads/upload-id/content',
    });
    const uploadContent = vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    const completeUpload = vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: { id: 'upload-id', sourceType: 'FIGMA', status: 'READY', sha256: 'a'.repeat(64), completedAt: '2026-10-11T00:00:00.000Z' },
      sourceImport: {
        id: 'import-id', kind: 'FIGMA_FILE', status: 'READY', inputUrl: null,
        fileKey: null, fileName: 'Landing', summary: { pageCount: 2, nodeCount: 10 }, diagnostics: [],
        createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z',
      },
    });
    const file = new File(['figma json'], 'design.json', { type: 'application/json' });
    const onImportResult = vi.fn();
    render(<ProjectForm capabilities={capabilities} sourceType="figma" file={file} framerSiteUrl="" intake={{ onProgress: vi.fn(), onState: vi.fn(), onValidation: vi.fn(), onImportResult, onError: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Figma import' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project and parse Figma file' }));
    await waitFor(() => expect(reserveUpload).toHaveBeenCalledWith('project-id', {
      sourceType: 'figma',
      fileName: 'design.json',
      contentType: 'application/json',
      sizeBytes: file.size,
    }));
    expect(uploadContent).toHaveBeenCalledWith('upload-id', file, expect.any(Function), 'application/json');
    expect(completeUpload).toHaveBeenCalledWith('upload-id');
    expect(onImportResult).toHaveBeenCalledWith(expect.objectContaining({ id: 'import-id', kind: 'FIGMA_FILE' }));
  });

  it('uploads a native .fig file with the binary MIME type while JSON keeps application/json', async () => {
    vi.spyOn(apiClient, 'createProject').mockResolvedValue({
      project: { id: 'project-id', name: 'Figma native', createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z' },
    });
    const reserveUpload = vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'upload-id', sourceType: 'FIGMA', status: 'PENDING', sizeBytes: '10' },
      contentUrl: '/api/v1/uploads/upload-id/content',
    });
    const uploadContent = vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    const completeUpload = vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: { id: 'upload-id', sourceType: 'FIGMA', status: 'READY', sha256: 'b'.repeat(64), completedAt: '2026-10-11T00:00:00.000Z' },
      sourceImport: {
        id: 'import-id', kind: 'FIGMA_FILE', status: 'READY', inputUrl: null,
        fileKey: null, fileName: 'design.fig', summary: { pageCount: 1, nodeCount: 5 }, diagnostics: [],
        createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z',
      },
    });
    // Browsers report an empty string (or a generic binary type) for native .fig
    // files, so the form must force application/octet-stream instead of trusting file.type.
    const file = new File(['PK\x03\x04canvas.fig'], 'design.fig', { type: '' });
    const onImportResult = vi.fn();
    render(<ProjectForm capabilities={capabilities} sourceType="figma" file={file} framerSiteUrl="" intake={{ onProgress: vi.fn(), onState: vi.fn(), onValidation: vi.fn(), onImportResult, onError: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Figma native' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project and parse Figma file' }));
    await waitFor(() => expect(reserveUpload).toHaveBeenCalledWith('project-id', {
      sourceType: 'figma',
      fileName: 'design.fig',
      contentType: 'application/octet-stream',
      sizeBytes: file.size,
    }));
    expect(uploadContent).toHaveBeenCalledWith('upload-id', file, expect.any(Function), 'application/octet-stream');
    expect(completeUpload).toHaveBeenCalledWith('upload-id');
    expect(onImportResult).toHaveBeenCalledWith(expect.objectContaining({ id: 'import-id', kind: 'FIGMA_FILE' }));
  });

  it('surfaces parser failures instead of reporting a successful Figma parse', async () => {
    vi.spyOn(apiClient, 'createProject').mockResolvedValue({
      project: { id: 'project-id', name: 'Figma broken', createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z' },
    });
    vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'upload-id', sourceType: 'FIGMA', status: 'PENDING', sizeBytes: '10' },
      contentUrl: '/api/v1/uploads/upload-id/content',
    });
    vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'completeUpload').mockRejectedValue(new Error('The uploaded .fig archive could not be opened.'));
    const file = new File(['not-a-fig'], 'broken.fig', { type: 'application/octet-stream' });
    const onError = vi.fn();
    const onImportResult = vi.fn();
    render(<ProjectForm capabilities={capabilities} sourceType="figma" file={file} framerSiteUrl="" intake={{ onProgress: vi.fn(), onState: vi.fn(), onValidation: vi.fn(), onImportResult, onError }} />);
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Figma broken' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project and parse Figma file' }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringContaining('could not be opened')));
    expect(onImportResult).not.toHaveBeenCalled();
  });

  it('analyzes a Framer site through the source-aware API and preserves the source reference', async () => {
    vi.spyOn(apiClient, 'createProject').mockResolvedValue({
      project: { id: 'project-id', name: 'Framer import', createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z' },
    });
    const importFramer = vi.spyOn(apiClient, 'importFramer').mockResolvedValue({
      sourceImport: {
        id: 'import-id', kind: 'FRAMER_SITE', status: 'READY', inputUrl: 'https://example.framer.website/',
        fileKey: null, fileName: 'Example', summary: {}, diagnostics: [],
        createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z',
      },
    });
    const onImportResult = vi.fn();
    render(<ProjectForm capabilities={capabilities} sourceType="framer" file={null} framerSiteUrl="https://example.framer.website/" intake={{ onProgress: vi.fn(), onState: vi.fn(), onValidation: vi.fn(), onImportResult, onError: vi.fn() }} />);
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Framer import' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project and analyze Framer site' }));
    await waitFor(() => expect(importFramer).toHaveBeenCalledWith('project-id', { siteUrl: 'https://example.framer.website/' }));
    expect(onImportResult).toHaveBeenCalledWith(expect.objectContaining({ id: 'import-id', kind: 'FRAMER_SITE' }));
  });

  it('triggers createConversion with validated upload identifiers and deterministic idempotency key when Start Elementor Conversion is clicked', async () => {
    vi.spyOn(apiClient, 'createProject').mockResolvedValue({
      project: {
        id: 'cmv6ajfqg0000c4rf052ggsk0',
        name: 'Check',
        createdAt: '2026-10-12T10:00:00.000Z',
        updatedAt: '2026-10-12T10:00:00.000Z',
      },
    });
    vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'd0036301-66b6-44f6-b2f5-f7faf7a36396', sourceType: 'REACT_NEXT_ZIP', status: 'PENDING', sizeBytes: '10' },
      contentUrl: '/api/v1/uploads/d0036301-66b6-44f6-b2f5-f7faf7a36396/content',
    });
    vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: {
        id: 'd0036301-66b6-44f6-b2f5-f7faf7a36396',
        sourceType: 'REACT_NEXT_ZIP',
        detectedFramework: 'react',
        sourceImportId: 'cmv6ajo7k0001c4rfy0e0scpi',
        status: 'READY',
        sha256: 'a'.repeat(64),
        completedAt: '2026-10-12T10:01:00.000Z',
      },
    });
    const createConversion = vi.spyOn(apiClient, 'createConversion').mockResolvedValue({
      conversion: { id: 'cjobreal0000000000000000', status: 'QUEUED' },
      idempotentReplay: false,
    });

    const file = new File(['zip bytes'], 'christmas-sparkle-studio.zip', { type: 'application/zip' });
    render(
      <ProjectForm
        capabilities={capabilities}
        sourceType="react-next-zip"
        file={file}
        framerSiteUrl=""
        intake={{ onProgress: vi.fn(), onState: vi.fn(), onValidation: vi.fn(), onImportResult: vi.fn(), onError: vi.fn() }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Check' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project and validate ZIP' }));

    const startBtn = await screen.findByRole('button', { name: 'Start Elementor Conversion' });
    fireEvent.click(startBtn);

    await waitFor(() =>
      expect(createConversion).toHaveBeenCalledWith('cmv6ajfqg0000c4rf052ggsk0', {
        sourceType: 'react-next-zip',
        detectedFramework: 'react',
        uploadId: 'd0036301-66b6-44f6-b2f5-f7faf7a36396',
        sourceImportId: 'cmv6ajo7k0001c4rfy0e0scpi',
        targetProfile: {
          platform: 'elementor',
          architecture: 'atomic',
          licenseMode: 'free',
        },
        idempotencyKey: 'conv-cmv6ajfqg0000c4rf052ggsk0-d0036301-66b6-44f6-b2f5-f7faf7a36396',
      }),
    );
  });

  it('surfaces conversion creation errors clearly when Start Elementor Conversion fails', async () => {
    vi.spyOn(apiClient, 'createProject').mockResolvedValue({
      project: {
        id: 'cmv6ajfqg0000c4rf052ggsk0',
        name: 'Check',
        createdAt: '2026-10-12T10:00:00.000Z',
        updatedAt: '2026-10-12T10:00:00.000Z',
      },
    });
    vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'd0036301-66b6-44f6-b2f5-f7faf7a36396', sourceType: 'REACT_NEXT_ZIP', status: 'PENDING', sizeBytes: '10' },
      contentUrl: '/api/v1/uploads/d0036301-66b6-44f6-b2f5-f7faf7a36396/content',
    });
    vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: {
        id: 'd0036301-66b6-44f6-b2f5-f7faf7a36396',
        sourceType: 'REACT_NEXT_ZIP',
        detectedFramework: 'react',
        status: 'READY',
        sha256: 'a'.repeat(64),
        completedAt: '2026-10-12T10:01:00.000Z',
      },
    });
    vi.spyOn(apiClient, 'createConversion').mockRejectedValue(new Error('Conversion requires a ready React or Next.js project upload in this project'));

    const file = new File(['zip bytes'], 'christmas-sparkle-studio.zip', { type: 'application/zip' });
    render(
      <ProjectForm
        capabilities={capabilities}
        sourceType="react-next-zip"
        file={file}
        framerSiteUrl=""
        intake={{ onProgress: vi.fn(), onState: vi.fn(), onValidation: vi.fn(), onImportResult: vi.fn(), onError: vi.fn() }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Check' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create project and validate ZIP' }));

    const startBtn = await screen.findByRole('button', { name: 'Start Elementor Conversion' });
    fireEvent.click(startBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent('Conversion requires a ready React or Next.js project upload in this project');
  });
});
