import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

const capabilities = {
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
      unavailableReason: 'Direct file upload.',
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
      status: 'unavailable',
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
    unavailableReason: 'The canonical DIR schema and Elementor compilation pipeline are not present.',
  },
  defaults: null,
};

describe('ApiClient.createProject', () => {
  it('sends only fields accepted by the project-creation route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      project: {
        id: 'project-id',
        name: 'Landing page refresh',
        createdAt: '2026-10-11T00:00:00.000Z',
        updatedAt: '2026-10-11T00:00:00.000Z',
      },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
    await client.createProject({ name: 'Landing page refresh' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      name: 'Landing page refresh',
    });
  });
});

describe('ApiClient capabilities and conversion requests', () => {
  it('loads and validates the supported capability response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(capabilities), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
    await expect(Promise.all([client.getCapabilities(), client.getCapabilities()]))
      .resolves.toEqual([capabilities, capabilities]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/v1/capabilities');
  });

  it('rejects an unsupported capability response instead of trusting it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...capabilities,
      target: { ...capabilities.target, status: 'available' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
    await expect(client.getCapabilities()).rejects.toThrow('unsupported conversion capabilities');
  });

  it('forwards conversion options to the conversion-job endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ conversion: {} }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
    const settings = {
      sourceType: 'react-next-zip' as const,
      detectedFramework: 'nextjs' as const,
      targetProfile: { platform: 'elementor' as const, architecture: 'hybrid' as const, licenseMode: 'pro' as const },
      uploadId: 'upload-id',
      idempotencyKey: 'conversion-key-123',
    };
    await client.createConversion('project-id', settings);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/v1/projects/project-id/conversions');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual(settings);
  });

  it('uploads ZIP content as binary rather than JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });
    const file = new File(['zip-content'], 'project.zip', { type: 'application/zip' });

    await client.uploadContent('upload-id', file);

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/v1/uploads/upload-id/content');
    expect(fetchMock.mock.calls[0][1].body).toBe(file);
    expect(fetchMock.mock.calls[0][1].headers.get('Content-Type')).toBe('application/zip');
  });

  it('routes Figma uploads through the upload reservation API, not OAuth or file URLs', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (String(url).endsWith('/uploads')) {
        return new Response(JSON.stringify({
          upload: { id: 'upload-id', sourceType: 'FIGMA', status: 'PENDING', sizeBytes: '10' },
          contentUrl: '/api/v1/uploads/upload-id/content',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        upload: { id: 'upload-id', sourceType: 'FIGMA', status: 'READY', sha256: 'a'.repeat(64), completedAt: '2026-10-11T00:00:00.000Z' },
        sourceImport: { id: 'import-id', kind: 'FIGMA_FILE' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new ApiClient({ baseUrl: 'http://localhost:4000/api/v1' });

    const reserved = await client.reserveUpload('project-id', {
      sourceType: 'figma',
      fileName: 'design.json',
      contentType: 'application/json',
      sizeBytes: 10,
    });
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:4000/api/v1/projects/project-id/uploads');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      sourceType: 'figma',
      fileName: 'design.json',
      contentType: 'application/json',
      sizeBytes: 10,
    });
    expect(reserved.upload.sourceType).toBe('FIGMA');

    await client.importFramer('project-id', { siteUrl: 'https://example.framer.website/' });
    expect(fetchMock.mock.calls[1][0]).toBe('http://localhost:4000/api/v1/projects/project-id/imports/framer');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({
      siteUrl: 'https://example.framer.website/',
    });

    const completed = await client.completeUpload('upload-id');
    expect(completed.sourceImport?.kind).toBe('FIGMA_FILE');
  });
});
