import { apiClient } from '@/lib/api-client';
import { formatBytes } from '@/lib/error-handling';

export const MAX_UPLOAD_BYTES_DEFAULT = 524_288_000; // 500 MiB
const MULTIPART_CLIENT_THRESHOLD = 10 * 1024 * 1024; // 10 MiB

export function validateReactNextZipFile(
  file: File | null,
  maxBytes?: number | null,
): { valid: boolean; error: string | null } {
  if (!file) {
    return { valid: true, error: null };
  }
  if (!file.name.toLowerCase().endsWith('.zip')) {
    return {
      valid: false,
      error: 'Choose a ZIP archive (.zip). Other formats are not supported.',
    };
  }
  const effectiveMax = maxBytes ?? MAX_UPLOAD_BYTES_DEFAULT;
  if (effectiveMax != null && file.size > effectiveMax) {
    return {
      valid: false,
      error: `This file is too large. Maximum is ${formatBytes(effectiveMax)}.`,
    };
  }
  if (file.size === 0) {
    return {
      valid: false,
      error: 'That ZIP is empty. Select a project archive with package.json.',
    };
  }
  return { valid: true, error: null };
}

export async function uploadReactNextZipFile(
  projectId: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) {
  const contentType =
    file.type === 'application/x-zip-compressed'
      ? 'application/x-zip-compressed'
      : 'application/zip';

  const reservation = await apiClient.reserveUpload(projectId, {
    sourceType: 'react-next-zip',
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
  });

  const useMultipart =
    reservation.uploadStrategy === 'multipart' && file.size > MULTIPART_CLIENT_THRESHOLD;

  if (useMultipart) {
    const partSize = reservation.multipartPartSizeBytes ?? 8 * 1024 * 1024;
    await apiClient.initMultipartUpload(reservation.upload.id);
    const totalParts = Math.ceil(file.size / partSize);
    const completedParts: Array<{ partNumber: number; etag: string }> = [];

    try {
      for (let i = 0; i < totalParts; i++) {
        if (signal?.aborted) {
          throw new DOMException('Upload aborted by user', 'AbortError');
        }
        const partNumber = i + 1;
        const start = i * partSize;
        const end = Math.min(start + partSize, file.size);
        const chunk = file.slice(start, end);
        let etag: string | undefined;

        if (typeof apiClient.getMultipartPartUrl === 'function') {
          const partTarget = await apiClient.getMultipartPartUrl(
            reservation.upload.id,
            partNumber,
            chunk.size,
          );
          if (partTarget?.url && /^https?:\/\//i.test(partTarget.url)) {
            const directRes = await apiClient.uploadPartToPresignedUrl(
              partTarget.url,
              chunk,
              3,
              signal,
            );
            etag = directRes.etag;
          }
        }

        if (!etag) {
          const uploaded = await apiClient.uploadMultipartPart(
            reservation.upload.id,
            partNumber,
            chunk,
          );
          etag = uploaded.etag;
        }

        completedParts.push({ partNumber, etag });
        onProgress?.(Math.min(99, Math.round((end / file.size) * 100)));
      }
      await apiClient.completeMultipartUpload(reservation.upload.id, completedParts);
      onProgress?.(100);
    } catch (error) {
      await apiClient.abortMultipartUpload(reservation.upload.id).catch(() => undefined);
      throw error;
    }
  } else if (
    reservation.presignedPutUrl &&
    /^https?:\/\//i.test(reservation.presignedPutUrl) &&
    typeof apiClient.uploadToPresignedPutUrl === 'function'
  ) {
    await apiClient.uploadToPresignedPutUrl(
      reservation.presignedPutUrl,
      file,
      contentType,
      onProgress,
      signal,
    );
  } else {
    await apiClient.uploadContent(reservation.upload.id, file, onProgress);
  }

  return apiClient.completeUpload(reservation.upload.id);
}

export async function fetchReactNextUploadInspection(projectId: string, uploadId: string) {
  return apiClient.getReactNextInspection(projectId, uploadId);
}

