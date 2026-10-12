import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReactNextZipDropzone } from '../components/ReactNextZipDropzone';
import { validateReactNextZipFile, uploadReactNextZipFile } from '../services/react-nextjs.service';
import { apiClient } from '@/lib/api-client';
import type { ProjectCapabilities } from '@/lib/schemas';

const capabilities: ProjectCapabilities = {
  sourceTypes: [
    {
      id: 'react-next-zip',
      label: 'React / Next.js Project ZIP',
      status: 'available',
      acceptedFormats: ['.zip'],
      maxBytes: 524_288_000,
      frameworkAutoDetection: true,
      conversionAvailable: true,
      unavailableReason: 'React/Next.js ZIP conversion uses REACT_NEXT.md and ELEMENTOR_SKILL.md.',
      importMethod: 'zip-upload',
      authorization: { type: 'none', connected: false, scopes: [] },
    },
    {
      id: 'figma',
      label: 'Figma Design File',
      status: 'available',
      acceptedFormats: ['.fig', '.json'],
      maxBytes: 524_288_000,
      frameworkAutoDetection: false,
      conversionAvailable: true,
      unavailableReason: 'Direct file upload; parsed locally.',
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
      conversionAvailable: true,
      unavailableReason: 'Published-site URL analysis only.',
      importMethod: 'published-site-url',
      authorization: { type: 'none', connected: false, scopes: [] },
    },
    {
      id: 'screenshot',
      label: 'screenshot',
      status: 'unavailable',
      acceptedFormats: [],
      maxBytes: null,
      frameworkAutoDetection: false,
      conversionAvailable: false,
      unavailableReason: 'Not implemented.',
      importMethod: 'unavailable',
      authorization: { type: 'none', connected: false, scopes: [] },
    },
  ],
  target: {
    platform: 'elementor',
    status: 'unavailable',
    architectures: [],
    licenseModes: [],
    unavailableReason: 'Markdown-driven conversion pipeline.',
  },
  defaults: null,
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('React/Next.js frontend feature module', () => {
  it('validates .zip files up to 500 MiB and rejects non-zip or empty files', () => {
    const validZip = new File(['PK\x03\x04'], 'app.zip', { type: 'application/zip' });
    expect(validateReactNextZipFile(validZip, 524_288_000)).toEqual({ valid: true, error: null });

    const nonZip = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect(validateReactNextZipFile(nonZip, 524_288_000).valid).toBe(false);

    const emptyZip = new File([], 'empty.zip', { type: 'application/zip' });
    expect(validateReactNextZipFile(emptyZip, 524_288_000).error).toMatch(/empty/i);
  });

  it('renders dropzone, accepts a .zip file, and displays static source analysis details', () => {
    const onFileChange = vi.fn();
    render(
      <ReactNextZipDropzone
        capabilities={capabilities}
        selectedFile={new File(['PK'], 'nextjs-app.zip', { type: 'application/zip' })}
        intakeState="ready"
        progress={100}
        statusDetail={null}
        error={null}
        onFileChange={onFileChange}
        validation={{
          framework: 'nextjs',
          sha256: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          routerConvention: 'nextjs-app-router',
          packageName: 'marketing-site',
          routeCount: 2,
          componentCount: 4,
          sourceFileCount: 12,
        }}
        importResult={{
          id: 'imp-1',
          kind: 'REACT_NEXT_PROJECT',
          status: 'READY',
          inputUrl: null,
          fileKey: null,
          fileName: 'nextjs-app.zip',
          summary: {
            detectedFramework: 'nextjs',
            routerConvention: 'nextjs-app-router',
            routeCount: 2,
            componentCount: 4,
            sourceFileCount: 12,
            routes: [
              { id: 'r1', path: '/', name: 'Home', sourceFile: 'src/app/page.tsx' },
              { id: 'r2', path: '/pricing', name: 'Pricing', sourceFile: 'src/app/pricing/page.tsx' },
            ],
            components: [
              { name: 'HeroBanner', sourceFile: 'src/components/HeroBanner.tsx' },
            ],
          },
          diagnostics: [],
          createdAt: '2026-10-12T00:00:00.000Z',
          updatedAt: '2026-10-12T00:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByText(/Detected Next\.js project/)).toBeInTheDocument();
    expect(screen.getByText(/Static Source Analysis Summary/)).toBeInTheDocument();
    expect(screen.getByText(/Router: nextjs-app-router/)).toBeInTheDocument();
    expect(screen.getByText('/pricing')).toBeInTheDocument();
    expect(screen.getByText('HeroBanner')).toBeInTheDocument();

    const input = screen.getByLabelText('Project ZIP file');
    const nextZip = new File(['PK\x03\x04'], 'fresh.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [nextZip] } });
    expect(onFileChange).toHaveBeenCalledWith(nextZip, null);
  });

  it('shows a source-specific ZIP rejection error and lets the user remove the file to retry', () => {
    const onFileChange = vi.fn();
    render(
      <ReactNextZipDropzone
        capabilities={capabilities}
        selectedFile={new File(['PK'], 'next-app.zip', { type: 'application/zip' })}
        intakeState="failed"
        progress={null}
        statusDetail={null}
        error="The archive contains too many files (12,483 entries; the limit is 10,000). Remove dependency folders such as node_modules and re-create the ZIP."
        onFileChange={onFileChange}
        validation={null}
        importResult={null}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/too many files \(12,483 entries; the limit is 10,000\)/i);
    expect(alert).toHaveTextContent(/node_modules/);
    expect(alert.textContent).not.toContain('[object Object]');

    // Removing the rejected file clears it and its error so a new file can be picked.
    fireEvent.click(screen.getByRole('button', { name: /Remove next-app\.zip/ }));
    expect(onFileChange).toHaveBeenCalledWith(null, null);
  });

  it('uploads via direct content upload when below multipart threshold', async () => {
    vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'up-1', sourceType: 'REACT_NEXT_ZIP', status: 'PENDING', sizeBytes: '100' },
      contentUrl: '/api/v1/uploads/up-1/content',
      uploadStrategy: 'direct',
    });
    const uploadContent = vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    const completeUpload = vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: {
        id: 'up-1',
        sourceType: 'REACT_NEXT_ZIP',
        detectedFramework: 'react',
        status: 'READY',
        sha256: 'a'.repeat(64),
        completedAt: '2026-10-12T00:00:00.000Z',
      },
    });

    const zip = new File(['PK\x03\x04'], 'react-app.zip', { type: 'application/zip' });
    const res = await uploadReactNextZipFile('proj-1', zip);
    expect(uploadContent).toHaveBeenCalledWith('up-1', zip, undefined);
    expect(completeUpload).toHaveBeenCalledWith('up-1');
    expect(res.upload.detectedFramework).toBe('react');
  });

  it('uploads multipart parts directly to Backblaze B2 presigned URLs without proxying through Express', async () => {
    const twelveMiB = new Uint8Array(12 * 1024 * 1024);
    const largeZip = new File([twelveMiB], 'large-next.zip', { type: 'application/zip' });

    vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'up-mp-1', sourceType: 'REACT_NEXT_ZIP', status: 'PENDING', sizeBytes: String(largeZip.size) },
      contentUrl: '/api/v1/uploads/up-mp-1/content',
      uploadStrategy: 'multipart',
      multipartPartSizeBytes: 8 * 1024 * 1024,
    });
    vi.spyOn(apiClient, 'initMultipartUpload').mockResolvedValue({
      uploadId: 'up-mp-1',
      multipartUploadId: 'b2-mp-id-1',
      partSizeBytes: 8 * 1024 * 1024,
    });
    const getMultipartPartUrl = vi
      .spyOn(apiClient, 'getMultipartPartUrl')
      .mockImplementation(async (_id, partNumber) => ({
        uploadId: 'up-mp-1',
        partNumber,
        url: `https://s3.us-east-005.backblazeb2.com/design-to-elementor-storage/uploads/proj-1/up-mp-1.zip?partNumber=${partNumber}&uploadId=b2-mp-id-1`,
        expiresInSeconds: 900,
        directPartPath: `/api/v1/uploads/up-mp-1/multipart/parts/${partNumber}`,
      }));
    const uploadPartToPresignedUrl = vi
      .spyOn(apiClient, 'uploadPartToPresignedUrl')
      .mockImplementation(async (_url, chunk) => ({
        etag: `"etag-b2-${chunk.size}"`,
        sizeBytes: chunk.size,
      }));
    const uploadMultipartPart = vi.spyOn(apiClient, 'uploadMultipartPart');
    const completeMultipartUpload = vi.spyOn(apiClient, 'completeMultipartUpload').mockResolvedValue({
      uploadId: 'up-mp-1',
      sizeBytes: largeZip.size,
      etag: '"etag-final"',
    });
    vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: {
        id: 'up-mp-1',
        sourceType: 'REACT_NEXT_ZIP',
        detectedFramework: 'nextjs',
        status: 'READY',
        sha256: 'b'.repeat(64),
        completedAt: '2026-10-12T00:00:00.000Z',
      },
    });

    const res = await uploadReactNextZipFile('proj-1', largeZip);
    expect(getMultipartPartUrl).toHaveBeenCalledTimes(2);
    expect(uploadPartToPresignedUrl).toHaveBeenCalledTimes(2);
    expect(uploadMultipartPart).not.toHaveBeenCalled();
    expect(completeMultipartUpload).toHaveBeenCalledWith('up-mp-1', [
      { partNumber: 1, etag: `"etag-b2-${8 * 1024 * 1024}"` },
      { partNumber: 2, etag: `"etag-b2-${4 * 1024 * 1024}"` },
    ]);
    expect(res.upload.detectedFramework).toBe('nextjs');
  });

  it('aborts multipart upload and never falls back to server proxy if direct B2 presigned part upload fails', async () => {
    const twelveMiB = new Uint8Array(12 * 1024 * 1024);
    const largeZip = new File([twelveMiB], 'fail-next.zip', { type: 'application/zip' });

    vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'up-mp-fail', sourceType: 'REACT_NEXT_ZIP', status: 'PENDING', sizeBytes: String(largeZip.size) },
      contentUrl: '/api/v1/uploads/up-mp-fail/content',
      uploadStrategy: 'multipart',
      multipartPartSizeBytes: 8 * 1024 * 1024,
    });
    vi.spyOn(apiClient, 'initMultipartUpload').mockResolvedValue({
      uploadId: 'up-mp-fail',
      multipartUploadId: 'b2-mp-fail',
      partSizeBytes: 8 * 1024 * 1024,
    });
    vi.spyOn(apiClient, 'getMultipartPartUrl').mockResolvedValue({
      uploadId: 'up-mp-fail',
      partNumber: 1,
      url: 'https://s3.us-east-005.backblazeb2.com/design-to-elementor-storage/uploads/proj-1/up-mp-fail.zip?partNumber=1',
      expiresInSeconds: 900,
      directPartPath: '/api/v1/uploads/up-mp-fail/multipart/parts/1',
    });
    vi.spyOn(apiClient, 'uploadPartToPresignedUrl').mockRejectedValue(new Error('B2 network timeout'));
    const uploadMultipartPart = vi.spyOn(apiClient, 'uploadMultipartPart');
    const abortMultipartUpload = vi.spyOn(apiClient, 'abortMultipartUpload').mockResolvedValue({
      uploadId: 'up-mp-fail',
      status: 'ABORTED',
    });

    await expect(uploadReactNextZipFile('proj-1', largeZip)).rejects.toThrow('B2 network timeout');
    expect(uploadMultipartPart).not.toHaveBeenCalled();
    expect(abortMultipartUpload).toHaveBeenCalledWith('up-mp-fail');
  });
});
