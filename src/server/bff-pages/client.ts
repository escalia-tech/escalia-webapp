import "server-only";

import { cookies } from "next/headers";

import type { ZodType } from "zod";

import { withTimeout } from "../bff/timeout";
import { getServerEnv } from "../config/env";
import { callBffPage } from "./call";

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
