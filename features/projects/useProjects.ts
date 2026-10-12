'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-handling';
import { ProjectSummary } from '@/lib/schemas';

// Validate the exact envelope the backend returns for GET /projects:
// { projects: [{ id, name, createdAt, updatedAt }] }. Parsing failures are
// surfaced as errors so a broken/expired session never renders as an empty list.
function parseProjectsResponse(payload: unknown): ProjectSummary[] {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('The project list response was not a valid object.');
  }
  const record = payload as Record<string, unknown>;
  if (!Array.isArray(record.projects)) {
    throw new Error('The project list response did not contain a projects array.');
  }
  return record.projects.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`Project entry ${index} was not an object.`);
    }
    const project = entry as Record<string, unknown>;
    if (typeof project.id !== 'string' || typeof project.name !== 'string') {
      throw new Error(`Project entry ${index} was missing an id or name.`);
    }
    if (typeof project.createdAt !== 'string' || typeof project.updatedAt !== 'string') {
      throw new Error(`Project entry ${index} was missing timestamps.`);
    }
    return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  });
}

export type ProjectsState = {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

// Fetch the authenticated user's projects from the backend on mount (and on
// every `refresh`), so reloading the page always shows the persisted records.
// Distinct loading / error / empty / populated states keep "No projects yet"
// honest: it only renders after a successful, parsed, empty response.
export function useProjects(): ProjectsState {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .listProjects()
      .then((payload) => {
        const parsed = parseProjectsResponse(payload);
        if (cancelled) return;
        setProjects(parsed);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProjects([]);
        setError(getErrorMessage(err));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return { projects, loading, error, refresh };
}

