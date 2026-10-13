import { describe, expect, it } from 'vitest';
import { ApiNetworkError, ApiResponseError, ApiStorageCorsError, getErrorMessage } from './error-handling';

describe('getErrorMessage', () => {
  it('normalizes string and top-level message errors', () => {
    expect(getErrorMessage('Project name is required')).toBe('Project name is required');
    expect(getErrorMessage({ message: 'Request was rejected' })).toBe('Request was rejected');
  });

  it('extracts nested API messages and validation details', () => {
    expect(getErrorMessage({
      error: {
        code: 'PROJECT_NOT_FOUND',
        message: 'Project was not found',
      },
    })).toBe('Project was not found');

    expect(getErrorMessage(new ApiResponseError(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues: [
          { path: [], code: 'unrecognized_keys', message: "Unrecognized key(s) in object: 'sourceType', 'target'" },
          { path: ['name'], code: 'too_small', message: 'String must contain at least 1 character(s)' },
        ],
      },
    }))).toBe(
      "Request validation failed: Unrecognized key(s) in object: 'sourceType', 'target'; name: String must contain at least 1 character(s)",
    );
  });

  it('handles field-keyed validation details', () => {
    expect(getErrorMessage({ details: { name: ['Project name is required'] } }))
      .toBe('name: Project name is required');
  });

  it('provides a useful message for network failures', () => {
    const expected = 'Unable to connect to the server. Check your connection and try again.';
    expect(getErrorMessage(new ApiNetworkError())).toBe(expected);
    expect(getErrorMessage(new TypeError('Failed to fetch'))).toBe(expected);
  });

  it('reports a distinct CORS/storage message for browser-blocked presigned uploads', () => {
    const corsMessage = getErrorMessage(new ApiStorageCorsError(new TypeError('Failed to fetch')));

    // It must NOT claim the app server is offline, which is the old misleading behaviour.
    expect(corsMessage).not.toBe('Unable to connect to the server. Check your connection and try again.');
    expect(corsMessage).toMatch(/CORS|cross-origin/i);
    expect(corsMessage).toMatch(/storage/i);
    // It must remain distinct from credential/permission/bandwidth-cap errors, which
    // arrive as real HTTP responses and surface the backend-provided message.
    expect(getErrorMessage(new ApiResponseError(403, { error: { code: 'B2_ACCESS_DENIED', message: 'Access denied' } })))
      .toBe('Access denied');
    expect(getErrorMessage(new ApiResponseError(403, { error: { code: 'B2_BANDWIDTH_CAP', message: 'Daily download cap reached' } })))
      .toBe('Daily download cap reached');
  });

  it('never exposes object coercion or an empty unexpected error', () => {
    expect(getErrorMessage({})).toBe('An unexpected error occurred. Please try again.');
    expect(getErrorMessage(new Error('[object Object]'))).toBe('An unexpected error occurred. Please try again.');
  });
});
