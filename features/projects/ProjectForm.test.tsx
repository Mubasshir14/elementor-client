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
});
