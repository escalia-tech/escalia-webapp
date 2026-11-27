import { isApplicationError } from "@/lib/observability/errors/application-error";

export type FailureState = "notConnected" | "unauthenticated" | "forbidden" | "notFound" | "unavailable";

/** The signed-in person has no organization yet: the page offers to create one instead of an error. */
export function isMissingOrganization(error: unknown): boolean {
  return isApplicationError(error) && error.code === "organization.missing";
}

/** The safe state a page shows when a BFF call failed; it never exposes the reason beyond these few words. */
export function failureState(error: unknown): FailureState {
  if (!isApplicationError(error)) return "unavailable";
  switch (error.code) {
    case "auth.unauthenticated":
      return "unauthenticated";
    case "auth.forbidden":
      return "forbidden";
    case "resource.not_found":
    case "organization.missing":
      return "notFound";
    case "upstream.unavailable":
      return error.retryable ? "unavailable" : "notConnected";
    default:
      return "unavailable";
  }
}
