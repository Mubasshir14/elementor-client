import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FigmaUploadPanel } from '../components/FigmaUploadPanel';
import { validateFigmaDesignFile, uploadFigmaDesignFile } from '../services/figma.service';
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

describe('Figma frontend feature module', () => {
  it('validates .fig and .json files up to 500 MiB and rejects invalid extensions', () => {
    const figFile = new File(['PK\x03\x04'], 'design.fig', { type: 'application/octet-stream' });
    expect(validateFigmaDesignFile(figFile, 524_288_000)).toEqual({ valid: true, error: null });

    const jsonFile = new File(['{}'], 'design.json', { type: 'application/json' });
    expect(validateFigmaDesignFile(jsonFile, 524_288_000)).toEqual({ valid: true, error: null });

    const invalidFile = new File(['abc'], 'design.sketch', { type: 'application/octet-stream' });
    expect(validateFigmaDesignFile(invalidFile, 524_288_000).valid).toBe(false);
  });

  it('renders parsed Figma page breakdown and diagnostics', () => {
    render(
      <FigmaUploadPanel
        capabilities={capabilities}
        selectedFile={new File(['PK'], 'landing.fig', { type: 'application/octet-stream' })}
        intakeState="ready"
        progress={100}
        statusDetail={null}
        error={null}
        onFileChange={vi.fn()}
        validation={{ pageCount: 2, nodeCount: 24, componentCount: 3, styleCount: 5 }}
        importResult={{
          id: 'fig-imp-1',
          kind: 'FIGMA_FILE',
          status: 'READY',
          inputUrl: null,
          fileKey: null,
          fileName: 'Landing.fig',
          summary: {
            pageCount: 2,
            nodeCount: 24,
            pages: [
              { id: '0:1', name: 'Marketing Home', nodeCount: 16 },
              { id: '0:2', name: 'Design System', nodeCount: 8 },
            ],
          },
          diagnostics: [{ code: 'INFO', message: 'Parsed native .fig binary locally.' }],
          createdAt: '2026-10-12T00:00:00.000Z',
          updatedAt: '2026-10-12T00:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByText(/Parsed Figma design file/)).toBeInTheDocument();
    expect(screen.getByText(/Parsed Figma Pages/)).toBeInTheDocument();
    expect(screen.getByText('Marketing Home')).toBeInTheDocument();
    expect(screen.getByText('Design System')).toBeInTheDocument();
  });

  it('uploads native .fig with application/octet-stream content type', async () => {
    vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'up-fig', sourceType: 'FIGMA', status: 'PENDING', sizeBytes: '120' },
      contentUrl: '/api/v1/uploads/up-fig/content',
      uploadStrategy: 'direct',
    });
    const uploadContent = vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: {
        id: 'up-fig',
        sourceType: 'FIGMA',
        status: 'READY',
        sha256: 'b'.repeat(64),
        completedAt: '2026-10-12T00:00:00.000Z',
      },
    });

    const figFile = new File(['PK\x03\x04'], 'hero.fig', { type: '' });
    await uploadFigmaDesignFile('proj-1', figFile);
    expect(uploadContent).toHaveBeenCalledWith('up-fig', figFile, undefined, 'application/octet-stream');
  });
});
