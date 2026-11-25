import { reportError } from "./lib/observability/errors/error-reporter";
import { getClientLogger } from "./lib/observability/logger/logger.client";

/**
 * Browser instrumentation, executed before hydration. Reports uncaught errors and unhandled promise
 * rejections to the browser logger (console only, and only when NEXT_PUBLIC_CLIENT_LOGGING_ENABLED).
 */
try {
  const logger = getClientLogger("window");

  window.addEventListener("error", (event) => {
    reportError(logger, "ui.runtime.failed", event.error ?? new Error("Uncaught error without Error object"), {
      boundary: "window.error",
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(logger, "ui.promise.rejected", event.reason, { boundary: "window.unhandledrejection" });
  });

  window.addEventListener("offline", () => logger.warn("network.connection.degraded", { online: false }));
  window.addEventListener("online", () => logger.info("network.connection.restored", { online: true }));
} catch {
  // Instrumentation must never prevent the application from starting.
}
