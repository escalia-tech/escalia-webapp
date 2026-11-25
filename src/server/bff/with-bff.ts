import "server-only";

import { NextResponse } from "next/server";

import type { z } from "zod";

import { ApplicationError, toErrorResponse } from "@/lib/observability/errors/application-error";
import { reportError } from "@/lib/observability/errors/error-reporter";
import { getLogger } from "@/lib/observability/logger/logger.server";
import { CORRELATION_ID_HEADER } from "@/lib/observability/tracing/correlation";
import { createRequestContext, elapsedMs, runWithRequestContext } from "@/lib/observability/tracing/request-context";

import { getSession, type Session } from "../auth/session";
import { assertSameOrigin } from "../security/origin";

/**
 * Thin BFF route-handler wrapper. Every handler gets, in this order:
 *  1. a request context (validated/generated correlation id, trace context) bound to AsyncLocalStorage;
 *  2. CSRF protection (same-origin) for mutations;
 *  3. authentication (fail closed: no session, no data) unless the endpoint is explicitly public;
 *  4. normalised error mapping, a single error log at this boundary, and duration measurement.
 * Handlers only validate input, call a feature server service and return a DTO.
 * There is no generic/open proxy: each endpoint is declared explicitly.
 */

const SLOW_REQUEST_THRESHOLD_MS = 2000;

export interface BffOptions {
  /** Templated route used in logs, e.g. `/api/bff/properties/[id]` (never the raw URL). */
  route: string;
  /** Stable operation name for events, e.g. `properties.list`. */
  operation: string;
  /** Mutations (non-GET) are protected by the same-origin check. */
  mutation?: boolean;
}

export interface BffHandlerContext<Params, S extends Session | null> {
  request: Request;
  params: Params;
  session: S;
  correlationId: string;
}

type RouteContext<Params> = { params: Promise<Params> };
type HandlerResult = Response | { data: unknown; status?: number };

function buildHandler<Params, S extends Session | null>(
  options: BffOptions,
  authenticate: (() => Promise<S>) | null,
  handler: (context: BffHandlerContext<Params, S>) => Promise<HandlerResult>,
) {
  return async (request: Request, routeContext: RouteContext<Params>): Promise<Response> => {
    const requestContext = createRequestContext(request.headers);
    const { correlationId } = requestContext;

    return runWithRequestContext(requestContext, async () => {
      const logger = getLogger("bff", "bff");
      const method = request.method;

      try {
        if (options.mutation) assertSameOrigin(request.headers);
        const session = (authenticate ? await authenticate() : null) as S;
        const params = await routeContext.params;

        const result = await handler({ request, params, session, correlationId });
        const response =
          result instanceof Response ? result : NextResponse.json(result.data, { status: result.status ?? 200 });

        const durationMs = elapsedMs(requestContext.startedAt);
        response.headers.set(CORRELATION_ID_HEADER, correlationId);
        response.headers.set("Cache-Control", "private, no-store");

        const metadata = {
          operation: options.operation,
          route: options.route,
          method,
          statusCode: response.status,
          durationMs,
        };
        if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
          logger.warn("bff.request.slow", { ...metadata, timeoutMs: SLOW_REQUEST_THRESHOLD_MS });
        } else {
          logger.info("bff.request.completed", metadata);
        }
        return response;
      } catch (error) {
        const durationMs = elapsedMs(requestContext.startedAt);
        const { status, body } = toErrorResponse(error, correlationId);
        reportError(
          logger,
          error instanceof ApplicationError ? `bff.${eventForCode(error.code)}` : "bff.request.failed",
          error,
          { operation: options.operation, route: options.route, method, statusCode: status, durationMs },
        );
        return NextResponse.json(body, {
          status,
          headers: { [CORRELATION_ID_HEADER]: correlationId, "Cache-Control": "private, no-store" },
        });
      }
    });
  };
}

async function requireSessionOrThrow(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApplicationError("auth.unauthenticated", "Authentication is required");
  return session;
}

/** Authenticated endpoint: no session, no data (401). */
export function bffHandler<Params = Record<string, never>>(
  options: BffOptions,
  handler: (context: BffHandlerContext<Params, Session>) => Promise<HandlerResult>,
) {
  return buildHandler<Params, Session>(options, requireSessionOrThrow, handler);
}

/** Explicitly public endpoint (e.g. demo session entry). Keep the list of these minimal and reviewed. */
export function publicBffHandler<Params = Record<string, never>>(
  options: BffOptions,
  handler: (context: BffHandlerContext<Params, null>) => Promise<HandlerResult>,
) {
  return buildHandler<Params, null>(options, null, handler);
}

/** Map an error code to a stable `bff.<area>.<outcome>` event suffix. */
function eventForCode(code: ApplicationError["code"]): string {
  switch (code) {
    case "upstream.timeout":
      return "upstream.timeout";
    case "upstream.unavailable":
      return "upstream.failed";
    case "auth.unauthenticated":
      return "auth.rejected";
    case "auth.forbidden":
      return "auth.denied";
    case "request.invalid_origin":
      return "request.rejected";
    case "validation.failed":
      return "request.invalid";
    case "resource.not_found":
      return "resource.missing";
    case "demo.disabled":
      return "demo.refused";
    default:
      return "request.failed";
  }
}

/** Validate query parameters with a Zod schema; failures list field NAMES only, never values. */
export function parseSearchParams<Schema extends z.ZodType>(schema: Schema, url: string): z.output<Schema> {
  const entries = Object.fromEntries(new URL(url).searchParams.entries());
  const parsed = schema.safeParse(entries);
  if (!parsed.success) {
    const invalidFields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "query"))];
    throw new ApplicationError("validation.failed", "Invalid query parameters", { invalidFields });
  }
  return parsed.data;
}

/** Validate a JSON body; failures list field NAMES only, never values. */
export async function parseJsonBody<Schema extends z.ZodType>(
  schema: Schema,
  request: Request,
): Promise<z.output<Schema>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApplicationError("validation.failed", "Request body must be valid JSON", { invalidFields: ["body"] });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const invalidFields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".") || "body"))];
    throw new ApplicationError("validation.failed", "Invalid request body", { invalidFields });
  }
  return parsed.data;
}
