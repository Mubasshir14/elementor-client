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
  it('loads the real project by id and links into the conversion workflow', async () => {
    const getProject = vi.spyOn(apiClient, 'getProject').mockResolvedValue({ project } as never);
    render(<ProjectDetailPage params={{ projectId: 'proj-1' }} />);

    expect(await screen.findByRole('heading', { name: 'Landing page refresh' })).toBeInTheDocument();
    expect(getProject).toHaveBeenCalledWith('proj-1');
    expect(screen.getByRole('link', { name: /Review conversion/ })).toHaveAttribute(
      'href',
      '/conversions/proj-1',
    );
  });

  it('shows an error state (not fake data) when the project request fails', async () => {
    vi.spyOn(apiClient, 'getProject').mockRejectedValue(new ApiNetworkError(new Error('offline')));
    render(<ProjectDetailPage params={{ projectId: 'proj-1' }} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Could not load this project/);
    expect(screen.queryByText('Landing page refresh')).not.toBeInTheDocument();
  });

  it('shows a not-found state when the project does not exist', async () => {
    vi.spyOn(apiClient, 'getProject').mockRejectedValue(new ApiResponseError(404, { error: { message: 'PROJECT_NOT_FOUND' } }));
    render(<ProjectDetailPage params={{ projectId: 'missing-id' }} />);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to projects/ })).toHaveAttribute('href', '/projects');
  });
});

