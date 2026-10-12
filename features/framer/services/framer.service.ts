import { apiClient } from '@/lib/api-client';
import { isFramerUrl } from '@/features/uploads/SourceSelector';

export function validateFramerPublishedUrl(siteUrl: string): boolean {
  return siteUrl.trim() ? isFramerUrl(siteUrl) : false;
}

export async function importFramerPublishedSite(projectId: string, siteUrl: string) {
  return apiClient.importFramer(projectId, { siteUrl: siteUrl.trim() });
}

