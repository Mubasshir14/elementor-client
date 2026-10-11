import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FigmaPanel } from './FigmaPanel';
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

function renderPanel(overrides: Partial<Parameters<typeof FigmaPanel>[0]> = {}) {
  const onFileChange = overrides.onFileChange ?? vi.fn();
  render(
    <FigmaPanel
      capabilities={capabilities}
      selectedFile={null}
      intakeState="idle"
      progress={null}
      statusDetail={null}
      error={null}
      validation={null}
      importResult={null}
      {...overrides}
      onFileChange={onFileChange}
    />,
  );
  return { onFileChange: onFileChange as ReturnType<typeof vi.fn> };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FigmaPanel direct file upload', () => {
  it('renders a drag-and-drop upload area and Browse Files with no OAuth action, URL field, or token prompt', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /Figma file dropzone/ })).toBeInTheDocument();
    expect(screen.getByText('Browse files')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Connect Figma/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Figma file URL')).not.toBeInTheDocument();
    expect(screen.getByText(/No Figma account, OAuth/i)).toBeInTheDocument();
  });

  it('accepts .fig and .json and displays the selected filename, size, and format', () => {
    const { onFileChange } = renderPanel();
    const input = screen.getByLabelText('Figma design file') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', expect.stringContaining('.fig'));
    const file = new File(['PK'], 'design.fig', { type: 'application/octet-stream' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFileChange).toHaveBeenCalledWith(file, null);
  });

  it('shows selected file info and lets the user replace or remove it', () => {
    const onFileChange = vi.fn();
    const file = new File(['{}'], 'design.json', { type: 'application/json' });
    renderPanel({ selectedFile: file, onFileChange });
    expect(screen.getByText('design.json')).toBeInTheDocument();
    expect(screen.getByText(/Figma file JSON/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Remove design\.json/ }));
    expect(onFileChange).toHaveBeenCalledWith(null, null);
  });

  it('accepts a native .fig file directly (no OAuth, URL, or token)', () => {
    const { onFileChange } = renderPanel();
    const input = screen.getByLabelText('Figma design file');
    const fig = new File(['PK'], 'design.fig', { type: 'application/octet-stream' });
    fireEvent.change(input, { target: { files: [fig] } });
    expect(onFileChange).toHaveBeenCalledWith(fig, null);
  });

  it('rejects unsupported extensions with a clear message and accepts .fig/.json', () => {
    const { onFileChange } = renderPanel();
    const input = screen.getByLabelText('Figma design file');
    const txt = new File(['x'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [txt] } });
    expect((onFileChange.mock.calls[0] as [File | null, string | null])[1]).toMatch(/not a supported Figma design file/);

    const json = new File(['{}'], 'design.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [json] } });
    expect(onFileChange).toHaveBeenLastCalledWith(json, null);
  });

  it('renders upload progress, validation success, and failure states without [object Object]', () => {
    const { unmount } = render(
      <FigmaPanel
        capabilities={capabilities}
        selectedFile={new File(['{}'], 'design.json', { type: 'application/json' })}
        intakeState="uploading"
        progress={42}
        statusDetail={null}
        error={null}
        onFileChange={vi.fn()}
        validation={null}
        importResult={null}
      />,
    );
    expect(screen.getByRole('progressbar', { name: 'Upload progress' })).toHaveAttribute('aria-valuenow', '42');
    unmount();

    renderPanel({
      intakeState: 'ready',
      validation: { pageCount: 2, componentCount: 1, nodeCount: 10 },
      importResult: {
        id: 'import-id', kind: 'FIGMA_FILE', status: 'READY', inputUrl: null,
        fileKey: null, fileName: 'Landing', summary: { pageCount: 2, nodeCount: 10 }, diagnostics: [],
        createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z',
      },
    });
    expect(screen.getByText(/Parsed Figma design file/)).toBeInTheDocument();
    expect(screen.getByText(/Imported Landing/)).toBeInTheDocument();
  });
});
