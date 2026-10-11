import { describe, expect, it } from 'vitest';
import { ApiNetworkError, ApiResponseError, getErrorMessage } from './error-handling';

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

  it('never exposes object coercion or an empty unexpected error', () => {
    expect(getErrorMessage({})).toBe('An unexpected error occurred. Please try again.');
    expect(getErrorMessage(new Error('[object Object]'))).toBe('An unexpected error occurred. Please try again.');
  });
});
