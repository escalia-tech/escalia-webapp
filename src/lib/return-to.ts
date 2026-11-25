/**
 * `returnTo` validation. A return target must be an in-app, locale-less absolute path: it must start
 * with a single "/", must not be protocol-relative ("//host"), contain a backslash, a scheme or
 * control characters, and stays short. Anything else falls back to the provided default
 * (open-redirect protection).
 */
const MAX_LENGTH = 500;

export function safeReturnTo<T extends `/${string}`>(
  value: string | string[] | undefined | null,
  fallback: T,
): `/${string}` {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || candidate.length > MAX_LENGTH) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the intent
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return fallback;
  const beforeQuery = candidate.split("?")[0] ?? "";
  if (beforeQuery.includes(":")) return fallback;
  return candidate as `/${string}`;
}
