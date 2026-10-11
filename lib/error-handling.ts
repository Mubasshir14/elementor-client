type UnknownRecord = Record<string, unknown>;

const UNEXPECTED_ERROR_MESSAGE = 'An unexpected error occurred. Please try again.';
const NETWORK_ERROR_MESSAGE = 'Unable to connect to the server. Check your connection and try again.';

export class ApiResponseError extends Error {
  constructor(
    readonly status: number,
    readonly responseBody: unknown,
  ) {
    super(`Request failed with status ${status}`);
    this.name = 'ApiResponseError';
  }
}

export class ApiNetworkError extends Error {
  constructor(cause?: unknown) {
    super(NETWORK_ERROR_MESSAGE, { cause });
    this.name = 'ApiNetworkError';
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const message = value.trim();
  return message === '[object Object]' ? undefined : message;
}

function getValidationDetails(payload: unknown): string[] {
  if (!isRecord(payload)) {
    return [];
  }

  const error = isRecord(payload.error) ? payload.error : undefined;
  const issues = error?.issues ?? payload.issues;
  if (Array.isArray(issues)) {
    return issues.flatMap((issue) => {
      if (!isRecord(issue)) {
        return [];
      }

      const message = getString(issue.message);
      const path = Array.isArray(issue.path)
        ? issue.path.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number')
        : [];
      if (message) {
        return [`${path.length > 0 ? `${path.join('.')}: ` : ''}${message}`];
      }

      const code = getString(issue.code);
      if (code === 'unrecognized_keys') {
        return ['The request contains unsupported fields.'];
      }
      return code ? [`${path.length > 0 ? `${path.join('.')}: ` : ''}is invalid.`] : [];
    });
  }

  const details = error?.details ?? payload.details;
  if (isRecord(details)) {
    return Object.entries(details).flatMap(([field, value]) => {
      if (typeof value === 'string') {
        return [`${field}: ${value}`];
      }
      if (Array.isArray(value)) {
        return value.flatMap((detail) => {
          const message = getString(detail) ?? (isRecord(detail) ? getString(detail.message) : undefined);
          return message ? [`${field}: ${message}`] : [];
        });
      }
      return [];
    });
  }

  return [];
}

function normalizeResponseError(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (isRecord(payload)) {
    const nestedError = isRecord(payload.error) ? payload.error : undefined;
    const message = getString(nestedError?.message) ?? getString(payload.message) ?? getString(payload.error);
    const details = Array.from(new Set(getValidationDetails(payload)));
    if (message && details.length > 0) {
      return `${message}: ${details.join('; ')}`;
    }
    if (message) {
      return message;
    }
    if (details.length > 0) {
      return details.join('; ');
    }
  }

  return `The request failed (HTTP ${status}). Please review your input and try again.`;
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return getString(error) ?? UNEXPECTED_ERROR_MESSAGE;
  }

  if (error instanceof ApiNetworkError) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (error instanceof ApiResponseError) {
    return normalizeResponseError(error.responseBody, error.status);
  }

  if (error instanceof TypeError) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (error instanceof Error) {
    return getString(error.message) ?? UNEXPECTED_ERROR_MESSAGE;
  }

  if (isRecord(error)) {
    const nestedError = isRecord(error.error) ? error.error : undefined;
    const message = getString(nestedError?.message) ?? getString(error.message) ?? getString(error.error);
    const details = Array.from(new Set(getValidationDetails(error)));
    if (message && details.length > 0) {
      return `${message}: ${details.join('; ')}`;
    }
    if (message) {
      return message;
    }
    if (details.length > 0) {
      return details.join('; ');
    }
  }

  return UNEXPECTED_ERROR_MESSAGE;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function toDateLabel(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
