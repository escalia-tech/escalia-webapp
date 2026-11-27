import { ApplicationError } from "@/lib/observability/errors/application-error";

/**
 * Local sign-in for a developer, without DevTools: signs a fixture user in at the BFF dev mode
 * (`POST /auth/dev/login`, escalia.auth.mode=dev) and, for a landlord, creates the organization so the
 * first screen is usable. Pure (the fetcher is injected) so it is tested without a server.
 */

export const DEV_USERS = ["landlord-1", "coowner-1", "tenant-1", "applicant-1"] as const;
export type DevUser = (typeof DEV_USERS)[number];

export interface BffCookie {
  name: string;
  value: string;
}

export function parseSetCookies(values: readonly string[]): BffCookie[] {
  return values.flatMap((line) => {
    const pair = line.split(";", 1)[0] ?? "";
    const at = pair.indexOf("=");
    return at > 0 ? [{ name: pair.slice(0, at).trim(), value: pair.slice(at + 1).trim() }] : [];
  });
}

export async function signInDevUser(options: {
  baseUrl: string;
  user: DevUser;
  signal: AbortSignal;
  fetcher?: typeof fetch;
}): Promise<BffCookie[]> {
  const fetcher = options.fetcher ?? fetch;
  const login = await fetcher(new URL("/auth/dev/login", options.baseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ user: options.user }),
    cache: "no-store",
    signal: options.signal,
  });
  if (!login.ok) {
    throw new ApplicationError("upstream.unavailable", `The BFF dev sign-in answered ${login.status}`, {
      retryable: false,
    });
  }
  const cookies = parseSetCookies(login.headers.getSetCookie());
  const xsrf = cookies.find((cookie) => cookie.name === "XSRF-TOKEN")?.value;
  if (options.user === "landlord-1" && xsrf) {
    // 201 created, 409 already there: both leave the landlord with an organization.
    await fetcher(new URL("/actions/create-organization", options.baseUrl), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-xsrf-token": xsrf,
        cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; "),
      },
      body: "{}",
      cache: "no-store",
      signal: options.signal,
    });
  }
  return cookies;
}

/** Local only: the BFF is configured, demo mode is on and the environment is a developer's own. */
export function devSignInAvailable(env: {
  bffBaseUrl: string | undefined;
  demoModeEnabled: boolean;
  appEnv: string;
}): boolean {
  return Boolean(env.bffBaseUrl) && env.demoModeEnabled && ["local", "development", "test"].includes(env.appEnv);
}
