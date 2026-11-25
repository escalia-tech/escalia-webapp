import { expect, test } from "@playwright/test";

import { APP_ROUTES, enterDemo, PUBLIC_ROUTES, settle } from "./helpers";

test.describe("access control", () => {
  test("redirects an anonymous visitor from the app to the sign-in screen", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1, name: "Connexion" })).toBeVisible();
  });

  test("keeps clean URLs without a locale prefix", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    expect(new URL(page.url()).pathname).not.toMatch(/^\/(fr|en)-CA/);
  });

  test("redirects legacy prefixed URLs to clean paths", async ({ page }) => {
    await page.goto("/en-CA/register?from=legacy");
    await expect(page).toHaveURL(/\/register\?from=legacy$/);
  });

  test("BFF refuses anonymous reads with 401 and no data", async ({ request }) => {
    const response = await request.get("/api/bff/properties");
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("auth.unauthenticated");
    expect(body).not.toHaveProperty("items");
  });

  test("BFF refuses cross-origin mutations", async ({ request }) => {
    const response = await request.post("/api/bff/demo/session", {
      data: { locale: "fr-CA" },
      headers: { origin: "https://evil.example", "content-type": "application/json" },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe("public authentication screens", () => {
  test("login shows the demonstrative form, never a fake success, and no social provider", async ({ page }) => {
    await page.goto("/login");
    await settle(page);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Ce champ est obligatoire.").first()).toBeVisible();

    await page.getByLabel("Courriel").fill("camille@example.org");
    await page.getByLabel("Mot de passe", { exact: true }).fill("not-a-real-password");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Authentification non configurée")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("button", { name: /google|microsoft|apple|facebook/i })).toHaveCount(0);
  });

  test("password visibility toggle works and the value is never put in the URL or storage", async ({ page }) => {
    await page.goto("/login");
    const password = page.getByLabel("Mot de passe", { exact: true });
    await password.fill("s3cret-value");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Afficher le mot de passe" }).click();
    await expect(password).toHaveAttribute("type", "text");
    expect(page.url()).not.toContain("s3cret-value");
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }) + document.cookie);
    expect(stored).not.toContain("s3cret-value");
  });

  test("editorial signature remains stable across language and theme combinations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("L’esprit Escalia")).toBeVisible();

    await page.getByRole("button", { name: "Thème" }).click();
    await page.getByRole("menuitemradio", { name: "Clair" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByLabel("L’esprit Escalia")).toBeVisible();

    const initialSignature = await page.evaluate(() => sessionStorage.getItem("escalia_auth_signature"));
    await page.getByRole("button", { name: "Signature suivante" }).click();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("escalia_auth_signature")))
      .not.toBe(initialSignature);
    const selectedSignature = await page.evaluate(() => sessionStorage.getItem("escalia_auth_signature"));

    await page.getByRole("button", { name: "Thème" }).click();
    await page.getByRole("menuitemradio", { name: "Sombre" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByLabel("L’esprit Escalia")).toBeVisible();

    await page.getByRole("button", { name: /Changer de langue/ }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.getByLabel("The Escalia spirit")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await page.evaluate(() => sessionStorage.getItem("escalia_auth_signature"))).toBe(selectedSignature);

    await page.getByRole("button", { name: "Theme" }).click();
    await page.getByRole("menuitemradio", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByLabel("The Escalia spirit")).toBeVisible();
  });

  test("register collects the planned fields with an optional international phone normalised to E.164", async ({
    page,
  }) => {
    await page.goto("/register");
    await settle(page); // wait for hydration so the first fill is not overwritten
    await page.getByLabel("Prénom").fill("Camille");
    await page.getByLabel("Nom", { exact: true }).fill("Démo");
    await page.getByLabel("Courriel").fill("camille@example.org");
    await page.getByLabel("Numéro").fill("514 555 0199");
    await expect(page.getByText("+15145550199")).toBeVisible();
    await page.getByLabel("Mot de passe", { exact: true }).fill("x");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Vous devez accepter les conditions")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Authentification non configurée")).toBeVisible();
  });

  test("legal pages are provisional, reachable and bilingual", async ({ page }) => {
    await page.goto("/en-CA/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible();
    await expect(page.getByText("Provisional document")).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { level: 1, name: "Conditions d’utilisation" })).toBeVisible();
  });

  test("status screens render localised content", async ({ page }) => {
    await page.goto("/en-CA/forbidden");
    await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
    await page.goto("/service-unavailable");
    await expect(page.getByRole("heading", { name: "Maintenance en cours" })).toBeVisible();
    await page.goto("/session-expired");
    await expect(page.getByRole("heading", { name: "Votre session a expiré" })).toBeVisible();
  });
});

test.describe("demo session and application shell", () => {
  test("demo entry from the login screen opens the dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Entrer en mode démonstration" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 1, name: "Tableau de bord" })).toBeVisible();
    await expect(page.getByText("Données fictives").first()).toBeVisible();
  });

  test("dashboard shows KPIs, charts with a table alternative and keyboard-reachable tooltips", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/dashboard");
    await settle(page);
    await expect(page.getByText("Loyers dus (mois)")).toBeVisible();
    await expect(page.getByRole("img", { name: /Graphique en aires/ })).toBeVisible();

    await page.getByText("Afficher les données sous forme de tableau").first().click();
    await expect(page.getByRole("table").first()).toBeVisible();

    const info = page.getByRole("button", { name: "Loyers dus (mois)" });
    await info.focus();
    await expect(page.getByRole("tooltip").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });

  test("sidebar collapses and the state survives a reload (cookie)", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Afficher ou réduire le menu latéral/ }).click();
    await page.reload();
    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "escalia_sidebar")?.value).toBe("false");
  });

  test("language switch keeps the route and query string", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/properties?q=lac&type=condominium");
    await page.getByRole("button", { name: /Changer de langue/ }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page).toHaveURL(/\/properties\?q=lac&type=condominium/);
    await expect(page.getByRole("heading", { level: 1, name: "Properties" })).toBeVisible();
  });

  test("Escalia Assist opens demonstration resources without a support request", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Ouvrir Escalîa Assist" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Comment pouvons-nous vous orienter ?" })).toBeVisible();
    await page.getByRole("button", { name: "Contacter l’assistance" }).click();
    await expect(page.getByText("Aucun canal de contact n’est configuré.")).toBeVisible();
    await expect(page.locator("[data-slot='sheet-content']").getByRole("textbox")).toHaveCount(0);
  });

  test("theme choice persists across reloads", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Thème" }).click();
    await page.getByRole("menuitemradio", { name: "Sombre" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("planned modules state their status and offer no fake action", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/tenants");
    await expect(page.getByRole("heading", { level: 1, name: "Locataires" })).toBeVisible();
    await expect(page.getByText("Cette section n’est pas encore disponible")).toBeVisible();
  });

  test("unknown routes render the localised 404", async ({ page }) => {
    await enterDemo(page);
    await page.goto("/nope");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
    await page.goto("/en-CA/properties/does-not-exist");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});

test.describe("properties reference module", () => {
  test.beforeEach(async ({ page }) => enterDemo(page));

  test("search, filter, sort and paginate are reflected in the URL", async ({ page }) => {
    await page.goto("/properties");
    await settle(page);
    await expect(page.getByRole("link", { name: "Centre Démo Frêne" })).toBeVisible();

    await page.getByRole("searchbox", { name: "Rechercher un immeuble" }).fill("lac");
    await expect(page).toHaveURL(/q=lac/);
    await expect(page.getByRole("link", { name: "Condos du Lac (fictif)" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Centre Démo Frêne" })).toHaveCount(0);

    await page.getByRole("button", { name: "Effacer les filtres" }).click();
    await expect(page).not.toHaveURL(/q=/);

    await page.getByRole("button", { name: /Trier par Logements/ }).click();
    await expect(page).toHaveURL(/sort=unitCount/);
    await expect(page.getByRole("columnheader", { name: /Logements/ })).toHaveAttribute("aria-sort", "ascending");

    await page.getByRole("button", { name: "Aller à la page suivante" }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test("no result state offers to clear filters", async ({ page }) => {
    await page.goto("/properties?q=zzzzzz");
    await expect(page.getByText("Aucun résultat").first()).toBeVisible();
    await page.getByRole("button", { name: "Effacer les filtres" }).last().click();
    await expect(page.getByRole("link", { name: "Centre Démo Frêne" })).toBeVisible();
  });

  test("failure scenario shows a recoverable error with a support reference", async ({ page }) => {
    await page.goto("/properties?scenario=error");
    await expect(page.getByRole("alert").filter({ hasText: "Impossible de charger les immeubles" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/Référence de support/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
  });

  test("detail page links back to the filtered list through a validated returnTo", async ({ page }) => {
    await page.goto("/properties?q=cedre");
    await page.getByRole("link", { name: "Résidence Démo Cèdre" }).click();
    await expect(page).toHaveURL(/\/properties\/demo-cedre/);
    await expect(page.getByRole("heading", { level: 1, name: "Résidence Démo Cèdre" })).toBeVisible();
    await page.getByRole("link", { name: "Retour à la liste des immeubles" }).click();
    await expect(page).toHaveURL(/\/properties\?q=cedre/);
  });

  test("a hostile returnTo falls back to the list", async ({ page }) => {
    await page.goto("/properties/demo-cedre?returnTo=https%3A%2F%2Fevil.example");
    const back = page.getByRole("link", { name: "Retour à la liste des immeubles" });
    await expect(back).toHaveAttribute("href", /\/properties$/);
  });

  test("demo note form validates and sends nothing", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto("/properties/demo-cedre");
    await settle(page);
    const before = requests.length;
    await page.getByRole("button", { name: "Valider la note" }).click();
    await expect(page.getByText("La note doit contenir au moins 3 caractères.")).toBeVisible();
    await page.getByLabel("Note", { exact: true }).fill("Une note de test");
    await page.getByRole("button", { name: "Valider la note" }).click();
    await expect(page.getByText("Démonstration : aucune donnée n’a été enregistrée.").first()).toBeVisible();
    expect(requests.slice(before).filter((url) => url.includes("/api/"))).toEqual([]);
  });
});

test.describe("settings", () => {
  test.beforeEach(async ({ page }) => enterDemo(page));

  test("saving the language preference switches locale and is announced as a demo adapter", async ({ page }) => {
    await page.goto("/settings/preferences");
    await expect(page.getByText("Adaptateur de démonstration")).toBeVisible();
    await page.getByLabel("Langue préférée").click();
    await page.getByRole("option", { name: "English (Canada)" }).click();
    await page.getByRole("button", { name: "Enregistrer les préférences" }).click();
    await expect(page).toHaveURL(/\/settings\/preferences/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });

  test("privacy page lists every cookie and storage entry with its purpose", async ({ page }) => {
    await page.goto("/settings/privacy");
    for (const name of [
      "escalia_locale",
      "escalia_sidebar",
      "escalia_prefs",
      "escalia_demo_session",
      "escalia-theme",
    ]) {
      await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
    }
  });

  test("security and notifications state that nothing is configured", async ({ page }) => {
    await page.goto("/settings/security");
    await expect(page.getByText("Fournisseur d’identité non configuré")).toBeVisible();
    await page.goto("/settings/notifications");
    await expect(page.getByText("Non disponible pour le moment")).toBeVisible();
  });
});

test.describe("production safety", () => {
  test("no screen raises console errors or CSP violations", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`${page.url()} :: ${message.text().slice(0, 200)}`);
    });
    page.on("pageerror", (error) => problems.push(`${page.url()} :: pageerror ${error.message.slice(0, 200)}`));
    for (const route of PUBLIC_ROUTES) {
      await page.goto(`/${route}`);
      await settle(page);
    }
    await enterDemo(page);
    for (const route of APP_ROUTES) {
      await page.goto(`/${route}`);
      await settle(page);
    }
    expect(problems).toEqual([]);
  });

  test("responses carry a nonce-based CSP and security headers", async ({ request }) => {
    const response = await request.get("/login");
    const csp = response.headers()["content-security-policy"];
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-correlation-id"]).toBeTruthy();
    expect(response.headers()["x-powered-by"]).toBeUndefined();
  });

  test("the HTML never contains secrets or demo secret material", async ({ request }) => {
    const html = await (await request.get("/login")).text();
    expect(html).not.toContain("e2e-demo-session-secret");
    expect(html).not.toContain("DEMO_SESSION_SECRET");
  });
});
