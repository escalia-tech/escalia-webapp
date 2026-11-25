/**
 * Fallback 404 outside the localized app tree. Renders its own <html> because the root layout is a pass-through.
 */
export default function RootNotFound() {
  return (
    <html lang="fr-CA">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#ffffff", color: "#1a1a1a" }}>
        <main
          style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "2rem", textAlign: "center" }}
        >
          <div style={{ maxWidth: "28rem" }}>
            <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem" }}>Page introuvable · Page not found</h1>
            <p style={{ margin: "0 0 1.5rem", color: "#555" }}>
              <a href="/dashboard">Français</a> · <a href="/dashboard">English</a>
            </p>
          </div>
        </main>
      </body>
    </html>
  );
}
