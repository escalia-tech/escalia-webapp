"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/observability/errors/error-reporter";

/**
 * Last-resort boundary (root layout failed). It renders outside every provider, so it has no i18n or
 * theme: copy is bilingual and styled with plain inline styles. Logged once, no technical detail shown.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, "global");
  }, [error]);

  return (
    <html lang="fr-CA">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ffffff", color: "#1a1a1a" }}>
        <main
          role="alert"
          style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}
        >
          <div style={{ maxWidth: "28rem" }}>
            <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>Une erreur est survenue · Something went wrong</h1>
            <p style={{ margin: "0 0 1.5rem", color: "#555" }}>
              Veuillez réessayer. · Please try again.
              {error.digest ? (
                <span style={{ display: "block", marginTop: "0.5rem", fontFamily: "monospace" }}>{error.digest}</span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 40,
                padding: "0 1rem",
                borderRadius: 8,
                border: "1px solid #888",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Réessayer · Retry
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
