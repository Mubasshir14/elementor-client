import { apiClient } from '@/lib/api-client';
import { formatBytes } from '@/lib/error-handling';

export const MAX_FIGMA_UPLOAD_BYTES_DEFAULT = 524_288_000; // 500 MiB
const MULTIPART_CLIENT_THRESHOLD = 10 * 1024 * 1024; // 10 MiB

export const NATIVE_FIG_ERROR =
  'That file is not a supported Figma design file. You can upload an actual native .fig file directly from your computer (in Figma choose File → Save local copy), or a Figma REST API file JSON export (.json).';

export function validateFigmaDesignFile(
  file: File | null,
  maxBytes?: number | null,
): { valid: boolean; error: string | null } {
  if (!file) {
    return { valid: true, error: null };
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith('.fig') && !lower.endsWith('.json')) {
    return { valid: false, error: NATIVE_FIG_ERROR };
  }
  const effectiveMax = maxBytes ?? MAX_FIGMA_UPLOAD_BYTES_DEFAULT;
  if (effectiveMax != null && file.size > effectiveMax) {
    return {
      valid: false,
      error: `This file is too large. Maximum is ${formatBytes(effectiveMax)}.`,
    };
  }
  if (file.size === 0) {
    return {
      valid: false,
      error:
        'That file is empty. Select an actual native .fig file from your computer, or a Figma file JSON export (.json) with content.',
    };
  }
  return { valid: true, error: null };
}

export async function uploadFigmaDesignFile(
  projectId: string,
  file: File,
  onProgress?: (percentage: number) => void,
  signal?: AbortSignal,
) {
  const isFig = file.name.toLowerCase().endsWith('.fig');
  const contentType = isFig ? 'application/octet-stream' : 'application/json';

  const reservation = await apiClient.reserveUpload(projectId, {
    sourceType: 'figma',
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
    await apiClient.uploadContent(reservation.upload.id, file, onProgress, contentType);
  }

  return apiClient.completeUpload(reservation.upload.id);
}

