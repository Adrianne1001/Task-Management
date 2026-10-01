import { HttpErrorResponse } from '@angular/common/http';

import { ApiError, errorMessage } from './api-error';

function response(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('ApiError.fromResponse', () => {
  it('keeps the message and field errors of a 422', () => {
    const error = ApiError.fromResponse(
      response(422, {
        message: 'The client name field is required.',
        errors: { clientName: ['The client name field is required.'] },
      }),
    );

    expect(error.status).toBe(422);
    expect(error.isValidation).toBe(true);
    expect(error.message).toBe('The client name field is required.');
    expect(error.fieldErrors).toEqual({ clientName: ['The client name field is required.'] });
  });

  it("uses the server's 404 message", () => {
    const error = ApiError.fromResponse(response(404, { message: 'Project not found.' }));

    expect(error.isNotFound).toBe(true);
    expect(error.message).toBe('Project not found.');
  });

  it.each([
    [0, "Can't reach the server"],
    [419, 'session has expired'],
    [429, 'Too many requests'],
    [500, 'Something went wrong'],
    [503, 'Something went wrong'],
  ])('gives status %i a friendly message', (status, expected) => {
    const error = ApiError.fromResponse(response(status, { message: 'Server Error' }));

    expect(error.message).toContain(expected);
    expect(error.fieldErrors).toEqual({});
  });

  it('copes with a non-JSON body', () => {
    expect(ApiError.fromResponse(response(404, '<html>')).message).toContain("couldn't find");
  });
});

describe('errorMessage', () => {
  it('uses the ApiError message, or a generic one for anything else', () => {
    expect(errorMessage(new ApiError(404, 'Project not found.'))).toBe('Project not found.');
    expect(errorMessage(new TypeError('boom'))).toContain('Something went wrong');
  });
});
