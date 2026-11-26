import "server-only";

import { cookies } from "next/headers";

import type { ZodType } from "zod";

import { withTimeout } from "../bff/timeout";
import { getServerEnv } from "../config/env";
import { type BffActionResult, callBffAction, callBffPage } from "./call";

/** Fetches a BFF page for the current request: forwards the session cookie and the page language. */
export async function fetchBffPage<T>(
  operation: string,
  path: `/pages/${string}`,
  schema: ZodType<T>,
  options: { language: string; query?: Record<string, string | undefined> },
): Promise<T> {
  const cookie = (await cookies()).toString();
  const baseUrl = getServerEnv().bffBaseUrl;
  return withTimeout(operation, (signal) =>
    callBffPage({ baseUrl, path, query: options.query, cookie, language: options.language, schema, signal }),
  );
}

/** Sends an action to the BFF for the current request: session cookie, CSRF token and page language. */
export async function postBffAction(
  operation: string,
  path: `/actions/${string}`,
  body: unknown,
  language: string,
): Promise<BffActionResult> {
  const store = await cookies();
  const baseUrl = getServerEnv().bffBaseUrl;
  return withTimeout(operation, (signal) =>
    callBffAction({
      baseUrl,
      path,
      body,
      cookie: store.toString(),
      xsrfToken: store.get("XSRF-TOKEN")?.value,
      language,
      signal,
    }),
  );
}
