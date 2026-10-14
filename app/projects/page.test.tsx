import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from './page';
import ProjectDetailPage from './[projectId]/page';
import { apiClient } from '@/lib/api-client';
import { ApiResponseError, ApiNetworkError } from '@/lib/error-handling';

const project = {
  id: 'proj-1',
  name: 'Landing page refresh',
  createdAt: '2026-10-12T10:00:00.000Z',
  updatedAt: '2026-10-12T10:05:00.000Z',
};

const listResponse = { projects: [project] };

function mockList(payload: unknown) {
  return vi.spyOn(apiClient, 'listProjects').mockResolvedValue(payload as never);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Projects library page', () => {
  it('renders real persisted projects returned by the backend', async () => {
    mockList(listResponse);
    render(<ProjectsPage />);

    expect(await screen.findByText('Landing page refresh')).toBeInTheDocument();
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Landing page refresh/ })).toHaveAttribute(
      'href',
      '/projects/proj-1',
    );
  });

  it('shows the empty state only after a successful empty response', async () => {
    mockList({ projects: [] });
    render(<ProjectsPage />);

    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
    expect(apiClient.listProjects).toHaveBeenCalledTimes(1);
  });

  it('shows an error state instead of the empty state when the API fails', async () => {
    vi.spyOn(apiClient, 'listProjects').mockRejectedValue(new ApiResponseError(500, { error: { message: 'Server exploded' } }));
    render(<ProjectsPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Could not load your projects/);
    expect(alert).toHaveTextContent('Server exploded');
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
  });

  it('shows an error state when the session is unauthorized', async () => {
    vi.spyOn(apiClient, 'listProjects').mockRejectedValue(new ApiResponseError(401, { error: { message: 'AUTH_REQUIRED' } }));
    render(<ProjectsPage />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
  });

  it('shows an error state when the response envelope is unparseable', async () => {
    mockList({ notProjects: true });
    render(<ProjectsPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/did not contain a projects array/);
    expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
  });

  it('re-fetches on refresh so persisted projects survive a page reload', async () => {
    const list = mockList(listResponse);
    render(<ProjectsPage />);
    expect(await screen.findByText('Landing page refresh')).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByRole('button', { name: /Refresh projects/ });
    fireEvent.click(refreshButton);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Landing page refresh')).toBeInTheDocument();
  });
});

describe('create → list lifecycle (validated ZIP stays with its project)', () => {
  it('a project created through the API appears in the library', async () => {
    // Step 1: creation persists the project and returns its id.
    const createProject = vi.spyOn(apiClient, 'createProject').mockResolvedValue({ project } as never);
    const created = await apiClient.createProject({ name: 'Landing page refresh' });
    expect(createProject).toHaveBeenCalledWith({ name: 'Landing page refresh' });
    expect(created.project.id).toBe('proj-1');

    // Step 2: the validated React ZIP upload targets that exact project id.
    const reserveUpload = vi.spyOn(apiClient, 'reserveUpload').mockResolvedValue({
      upload: { id: 'upload-1', sourceType: 'REACT_NEXT_ZIP', status: 'PENDING', sizeBytes: '100' },
      contentUrl: '/api/v1/uploads/upload-1/content',
      uploadStrategy: 'direct',
    });
    const uploadContent = vi.spyOn(apiClient, 'uploadContent').mockResolvedValue(undefined);
    const completeUpload = vi.spyOn(apiClient, 'completeUpload').mockResolvedValue({
      upload: { id: 'upload-1', sourceType: 'REACT_NEXT_ZIP', detectedFramework: 'nextjs', status: 'READY', sha256: 'a'.repeat(64), completedAt: '2026-10-12T10:05:00.000Z' },
    });
    const zip = new File(['PK\x03\x04'], 'site.zip', { type: 'application/zip' });
    await apiClient.reserveUpload('proj-1', {
      sourceType: 'react-next-zip',
      fileName: 'site.zip',
      contentType: 'application/zip',
      sizeBytes: zip.size,
    });
    await apiClient.uploadContent('upload-1', zip);
    await apiClient.completeUpload('upload-1');
    expect(reserveUpload).toHaveBeenCalledWith('proj-1', expect.objectContaining({ sourceType: 'react-next-zip' }));
    expect(uploadContent).toHaveBeenCalledWith('upload-1', zip);
    expect(completeUpload).toHaveBeenCalledWith('upload-1');

    // Step 3: the library lists exactly that project.
    mockList(listResponse);
    render(<ProjectsPage />);
    expect(await screen.findByText('Landing page refresh')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Landing page refresh/ })).toHaveAttribute('href', '/projects/proj-1');
  });
});

describe('Project detail page', () => {
  it('shows the real project and links into conversion history using real job ids (never the project id)', async () => {
    vi.spyOn(apiClient, 'getProject').mockResolvedValue({ project } as never);
    vi.spyOn(apiClient, 'getProjectConversions').mockResolvedValue({
      conversions: [
        {
          id: 'cjobabcdef0000000000000',
          status: 'SUCCEEDED',
          sourcePlatform: 'REACT_NEXT_ZIP',
          hasArtifact: true,
          createdAt: '2026-10-12T10:00:00.000Z',
          updatedAt: '2026-10-12T10:05:00.000Z',
        },
      ],
    } as never);

    render(<ProjectDetailPage params={{ projectId: 'proj-1' }} />);

    expect(await screen.findByRole('heading', { name: 'Landing page refresh' })).toBeInTheDocument();
    expect(apiClient.getProject).toHaveBeenCalledWith('proj-1');
    expect(apiClient.getProjectConversions).toHaveBeenCalledWith('proj-1');

    // The history link must point at the real ConversionJob id, not the project id.
    const historyLink = await screen.findByRole('link', { name: /REACT_NEXT_ZIP/ });
    expect(historyLink).toHaveAttribute('href', '/conversions/cjobabcdef0000000000000');
    expect(historyLink).not.toHaveAttribute('href', '/conversions/proj-1');

    // The old buggy "Review conversion" link (which used the project id) is gone.
    expect(screen.queryByRole('link', { name: /Review conversion/ })).not.toBeInTheDocument();
  });

  it('shows an empty conversion history state (no fabricated entries)', async () => {
    vi.spyOn(apiClient, 'getProject').mockResolvedValue({ project } as never);
    vi.spyOn(apiClient, 'getProjectConversions').mockResolvedValue({ conversions: [] } as never);

    render(<ProjectDetailPage params={{ projectId: 'proj-1' }} />);

    expect(await screen.findByText('No conversions yet for this project.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Review conversion/ })).not.toBeInTheDocument();
  });

  it('shows multiple conversion jobs when the project has several', async () => {
    vi.spyOn(apiClient, 'getProject').mockResolvedValue({ project } as never);
    vi.spyOn(apiClient, 'getProjectConversions').mockResolvedValue({
      conversions: [
        { id: 'cjobone000000000000000000', status: 'QUEUED', sourcePlatform: 'REACT_NEXT_ZIP', hasArtifact: false, createdAt: '2026-10-12T10:00:00.000Z', updatedAt: '2026-10-12T10:00:00.000Z' },
        { id: 'cjobtwo000000000000000000', status: 'FAILED', sourcePlatform: 'FIGMA', hasArtifact: false, createdAt: '2026-10-12T09:00:00.000Z', updatedAt: '2026-10-12T09:30:00.000Z' },
      ],
    } as never);

    render(<ProjectDetailPage params={{ projectId: 'proj-1' }} />);

    const links = await screen.findAllByRole('link', { name: /REACT_NEXT_ZIP|FIGMA/ });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/conversions/cjobone000000000000000000');
    expect(links[1]).toHaveAttribute('href', '/conversions/cjobtwo000000000000000000');
  });

  it('shows a conversion-history error state when the history request fails', async () => {
    vi.spyOn(apiClient, 'getProject').mockResolvedValue({ project } as never);
    vi.spyOn(apiClient, 'getProjectConversions').mockRejectedValue(new ApiResponseError(500, { error: { message: 'History unavailable' } }));

    render(<ProjectDetailPage params={{ projectId: 'proj-1' }} />);

    expect(await screen.findByRole('heading', { name: 'Landing page refresh' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load this project's conversion history/);
    expect(screen.queryByText('No conversions yet for this project.')).not.toBeInTheDocument();
  });

  it('shows an error state (not fake data) when the project request fails', async () => {
    vi.spyOn(apiClient, 'getProject').mockRejectedValue(new ApiNetworkError(new Error('offline')));
    vi.spyOn(apiClient, 'getProjectConversions').mockResolvedValue({ conversions: [] } as never);
    render(<ProjectDetailPage params={{ projectId: 'proj-1' }} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Could not load this project/);
    expect(screen.queryByText('Landing page refresh')).not.toBeInTheDocument();
  });

  it('shows a not-found state when the project does not exist', async () => {
    vi.spyOn(apiClient, 'getProject').mockRejectedValue(new ApiResponseError(404, { error: { message: 'PROJECT_NOT_FOUND' } }));
    vi.spyOn(apiClient, 'getProjectConversions').mockResolvedValue({ conversions: [] } as never);
    render(<ProjectDetailPage params={{ projectId: 'missing-id' }} />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to projects/ })).toHaveAttribute('href', '/projects');
  });

  it('shows Start Elementor Conversion for an existing project with a ready upload and creates a conversion job', async () => {
    vi.spyOn(apiClient, 'getProject').mockResolvedValue({
      project: {
        ...project,
        id: 'cmv6ajfqg0000c4rf052ggsk0',
        name: 'Check',
        uploads: [
          {
            id: 'd0036301-66b6-44f6-b2f5-f7faf7a36396',
            fileName: 'christmas-sparkle-studio.zip',
            sourceType: 'REACT_NEXT_ZIP',
            detectedFramework: 'react',
            sourceImportId: 'cmv6ajo7k0001c4rfy0e0scpi',
            completedAt: '2026-10-12T10:05:00.000Z',
          },
        ],
      },
    } as never);
    vi.spyOn(apiClient, 'getProjectConversions').mockResolvedValue({ conversions: [] } as never);
    const createConversion = vi.spyOn(apiClient, 'createConversion').mockResolvedValue({
      conversion: { id: 'cjobreal0000000000000000', status: 'QUEUED' },
      idempotentReplay: false,
    });

    render(<ProjectDetailPage params={{ projectId: 'cmv6ajfqg0000c4rf052ggsk0' }} />);

    expect(await screen.findByText(/Validated source: React ZIP \(christmas-sparkle-studio\.zip\)/)).toBeInTheDocument();
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
});

