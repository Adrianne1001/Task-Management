import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody } from '../../models/api';

const FALLBACK_MESSAGES: Record<number, string> = {
  0: "Can't reach the server. Check your connection and try again.",
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  419: 'Your session has expired. Please sign in again.',
  422: 'Please correct the highlighted fields.',
  429: 'Too many requests. Please wait a moment and try again.',
};

const SERVER_ERROR_MESSAGE = 'Something went wrong on our side. Please try again later.';

/**
 * Statuses whose server message is written for end users (e.g. "Project not
 * found.", validation summaries). Others get a friendlier client-side message.
 */
const TRUSTED_SERVER_MESSAGES = new Set([403, 404, 422]);

/**
 * Normalised API failure. Every HTTP error leaves the interceptor as one of
 * these, so components only deal with a message and optional field errors.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: Readonly<Record<string, string[]>> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: HttpErrorResponse): ApiError {
    const body = isErrorBody(response.error) ? response.error : {};
    const fallback = FALLBACK_MESSAGES[response.status] ?? SERVER_ERROR_MESSAGE;
    const message =
      TRUSTED_SERVER_MESSAGES.has(response.status) && body.message ? body.message : fallback;

    return new ApiError(response.status, message, body.errors ?? {});
  }

  get isValidation(): boolean {
    return this.status === 422;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Turns anything caught from an HTTP call into a user-facing message. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : SERVER_ERROR_MESSAGE;
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null;
}
