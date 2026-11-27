/**
 * Normalised application errors. Codes are stable identifiers (also used as i18n keys under
 * `errors.*`); messages are English, technical and free of personal data.
 */

export const ERROR_CODES = [
  "validation.failed",
  "request.invalid_origin",
  "request.method_not_allowed",
  "auth.unauthenticated",
  "auth.forbidden",
  "auth.provider_unavailable",
  "resource.not_found",
  "organization.missing",
  "upstream.timeout",
  "upstream.unavailable",
  "demo.disabled",
  "service.maintenance",
  "internal.unexpected",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  "validation.failed": 400,
  "request.invalid_origin": 403,
  "request.method_not_allowed": 405,
  "auth.unauthenticated": 401,
  "auth.forbidden": 403,
  "auth.provider_unavailable": 503,
  "resource.not_found": 404,
  "organization.missing": 404,
  "upstream.timeout": 504,
  "upstream.unavailable": 502,
  "demo.disabled": 404,
  "service.maintenance": 503,
  "internal.unexpected": 500,
};

export interface ApplicationErrorOptions {
  status?: number;
  cause?: unknown;
  /** Names of invalid fields (never values) for `validation.failed`. */
  invalidFields?: string[];
  /** Retrying the same request is safe and may succeed (idempotent reads only). */
  retryable?: boolean;
}

export class ApplicationError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly invalidFields: string[];
  readonly retryable: boolean;

  constructor(code: ErrorCode, message: string, options: ApplicationErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApplicationError";
    this.code = code;
    this.status = options.status ?? DEFAULT_STATUS[code];
    this.invalidFields = options.invalidFields ?? [];
    this.retryable = options.retryable ?? (code === "upstream.timeout" || code === "upstream.unavailable");
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

/** Wire format returned by every BFF error response. */
export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    /** Stable English message for diagnostics; the UI translates from `code`. */
    message: string;
    correlationId: string;
    retryable: boolean;
    invalidFields?: string[];
  };
}

/** Map any thrown value to a safe public payload. Unknown errors never leak their message. */
export function toErrorResponse(error: unknown, correlationId: string): { status: number; body: ErrorResponseBody } {
  if (isApplicationError(error)) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          correlationId,
          retryable: error.retryable,
          ...(error.invalidFields.length > 0 ? { invalidFields: error.invalidFields } : {}),
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: "internal.unexpected",
        message: "An unexpected error occurred",
        correlationId,
        retryable: false,
      },
    },
  };
}
