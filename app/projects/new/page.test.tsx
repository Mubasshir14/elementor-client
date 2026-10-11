import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NewProjectPage from './page';
import { apiClient } from '@/lib/api-client';
import { ApiResponseError } from '@/lib/error-handling';
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
      unavailableReason: 'Conversion is disabled until the approved DIR and compiler are available.',
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
      unavailableReason: 'This import adapter is not implemented.',
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NewProjectPage capabilities loading', () => {
  it('shows an actionable error and retries the capabilities request', async () => {
    const getCapabilities = vi.spyOn(apiClient, 'getCapabilities')
      .mockRejectedValueOnce(new ApiResponseError(404, { error: { message: 'Endpoint was not found' } }))
      .mockResolvedValueOnce(capabilities);

    render(<NewProjectPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Could not load supported source options');
    expect(alert).toHaveTextContent('Endpoint was not found');
    expect(alert).toHaveTextContent('Check that you are signed in and the API is running, then retry.');
    expect(alert.textContent).not.toContain('[object Object]');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByRole('radiogroup', { name: 'Source type' })).toBeInTheDocument());
    expect(getCapabilities).toHaveBeenNthCalledWith(2, { refresh: true });
    expect(screen.getByRole('radio', { name: /React \/ Next\.js Project ZIP/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/canonical DIR schema and Elementor compilation pipeline/i)).toBeInTheDocument();
  });

  it('renders three source cards and switches panels without stale input', async () => {
    vi.spyOn(apiClient, 'getCapabilities').mockResolvedValue(capabilities);
    render(<NewProjectPage />);
    const group = await screen.findByRole('radiogroup', { name: 'Source type' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /React \/ Next\.js Project ZIP/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Figma Design File/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Framer Project/ })).toBeInTheDocument();
    expect(screen.getByText(/Drag and drop your project ZIP here/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Figma Design File/ }));
    expect(await screen.findByLabelText('Figma design file')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Connect Figma/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Drag and drop your project ZIP here/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Framer Project/ }));
    expect(await screen.findByLabelText('Published site URL')).toBeInTheDocument();
    expect(screen.queryByLabelText('Figma design file')).not.toBeInTheDocument();
  });

  it('validates Figma file selection and Framer inputs before submission', async () => {
    vi.spyOn(apiClient, 'getCapabilities').mockResolvedValue(capabilities);
    render(<NewProjectPage />);
    await screen.findByRole('radiogroup', { name: 'Source type' });

    fireEvent.click(screen.getByRole('radio', { name: /Figma Design File/ }));
    const fileInput = await screen.findByLabelText('Figma design file');
    const bad = new File(['not json'], 'design.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [bad] } });
    expect(await screen.findByText(/not a supported Figma design file/)).toBeInTheDocument();
    expect(screen.getByText(/not a supported Figma design file/).textContent).not.toContain('[object Object]');

    fireEvent.click(screen.getByRole('radio', { name: /Framer Project/ }));
    const framerInput = await screen.findByLabelText('Published site URL');
    fireEvent.change(framerInput, { target: { value: 'ftp://example.com/site' } });
    expect(await screen.findByText(/Localhost, private addresses/)).toBeInTheDocument();
  });
});
