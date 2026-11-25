# Rapport de fondation — Escalia V7 WebApp

Date : 2026-11-25. Environnement : macOS, Node 20.19.2, npm 12 (via `npx npm@latest`), Google Chrome local.
Tous les résultats ci-dessous proviennent d'exécutions réelles en fin de session. Ce qui n'a **pas** été exécuté est
indiqué comme tel (section F).

## A. Résumé de l'implémentation

**Socle** : Next.js 16.4.6 (App Router, Turbopack, React Compiler), React 19.3, TypeScript 6 strict, Tailwind 4.3,
shadcn (radix-nova, 39 composants `ui`), Biome 2.6, npm + `package-lock.json`. Construit à partir du template Studio
Admin (licence : `THIRD_PARTY_LICENSE_STUDIO_ADMIN.txt`) ; la télémétrie `gtag` du template n'a pas été reprise.

**Design system V7** : tokens CSS (`src/styles/tokens.css`), Barlow, light / dark / système (next-themes),
densité Medium+, en-tête 64 px, menu latéral « seamless » 232 / 56 px, info-bulles ambre accessibles au clavier,
graphiques (aires, barres, anneau) avec alternative tableau.

**Internationalisation** : next-intl, `fr-CA` / `en-CA`, préfixe toujours présent, messages par domaine, parité des clés
testée, langue indépendante du pays/devise/fuseau, surcharge de langue de session.

**Écrans**
- Publics (split-screen 55/45) : connexion, inscription (téléphone international facultatif, E.164), mot de passe
  oublié, réinitialisation, vérification du courriel, session expirée, confidentialité / conditions (textes provisoires),
  403, 404, 500, 503. Authentification **démonstrative** : aucun IdP, aucun appel réseau, message « Authentification non
  configurée », aucun faux succès, aucun fournisseur social.
- Application : tableau de bord (KPI, 3 graphiques), Immeubles (liste recherche/filtre/tri/pagination pilotée par l'URL,
  fiche détail, formulaire de démonstration sans envoi), Configuration (profil, préférences, sécurité, confidentialité,
  notifications), 7 modules « À venir », galerie de composants (`/dev/components`, 404 hors mode démo).

**BFF** : `bffHandler` / `publicBffHandler`, DTO Zod, services `server-only`, adaptateur de démonstration, délai
d'expiration, mapping d'erreurs, contrôle d'origine sur mutations, `Cache-Control: private, no-store`, en-tête de
corrélation. Échoue fermé (401 sans session ; « source indisponible » sans source approuvée).

**Sécurité** : CSP à nonce (`script-src 'strict-dynamic'`), `frame-ancestors 'none'`, HSTS, nosniff, session de démo
HMAC HttpOnly, mode démo refusé en production, aucun secret en `NEXT_PUBLIC_*`, aucune donnée sensible en
`localStorage`, protection contre la redirection ouverte (`returnTo`).

### Défauts réels trouvés et corrigés pendant la validation
Chaque point a été découvert par un test ou un outil, et corrigé dans l'implémentation (aucun test affaibli).

| Défaut | Découvert par | Correction |
|---|---|---|
| Graphiques sans couleur (gris / noir) : le `<style>` injecté par shadcn `chart` était bloqué par la CSP à nonce | Revue des captures + test « aucune erreur console / CSP » | `chart.tsx` patché : couleurs en variables CSS inline (`style-src-attr`) |
| Styles de Sonner bloqués par la CSP (toasts non stylés) | Même test | Hachage CSP des styles tiers (`src/lib/security/style-hashes.ts`) + test qui recalcule le hachage depuis `node_modules` |
| Erreur d'hydratation React #418 sur `/register` (noms de pays ICU serveur ≠ navigateur) | Même test | Liste complète des pays construite côté client après hydratation |
| `label-content-name-mismatch` : bouton de recherche et menu du compte | axe | Nom accessible aligné sur le texte visible |
| Landmark manquant : menu latéral hors `<nav>` | axe (`region`) | `<nav aria-label>` autour des groupes |
| Ordre des titres (h1 → h3) sur Confidentialité et Sécurité | axe (`heading-order`) | `h2` |
| Contraste insuffisant du code 403/503 (`text-muted-foreground/50`) | axe (`color-contrast`) | Couleur `text-muted-foreground` |
| Libellé « À venir » tronqué dans le menu latéral | Revue des captures | `shrink-0` + retour à la ligne du libellé |
| Fuite possible de secret en ligne dans les journaux (`secret=…`) | Test de redaction | Règle `INLINE_SECRET_ASSIGNMENT` dans `redaction.ts` |

## B. Validation technique (résultats exacts)

| Contrôle | Commande | Résultat |
|---|---|---|
| Lint + format | `npm run check` | 0 erreur, **12 avertissements** (voir F) — 187 fichiers |
| Types | `npm run typecheck` | 0 erreur |
| Unitaires + intégration | `npm run test` | **15 fichiers, 152 tests passés** |
| Build de production | `npm run build` | Succès (Turbopack, TypeScript OK) ; toutes les routes applicatives sont dynamiques (nonce CSP) |
| Secrets / code serveur dans le client | `npm run check:bundle` | OK — 45 fichiers client, 7 marqueurs (pino, `DEMO_SESSION_SECRET`, `createHmac`, `server-only`, `AsyncLocalStorage`, `Bearer …`, clé privée). Le contrôle a été vérifié en négatif (un faux marqueur est bien détecté, code de sortie 1) |
| Assets officiels | `npm run check:assets` | 23 / 23 OK (aucun asset modifié) |
| e2e + responsive | `npx playwright test --project=e2e` | **68 passés** (28 smoke, 40 responsive) |
| Accessibilité axe | `npx playwright test --project=a11y` | **80 passés** : 20 routes × FR/EN × clair/sombre, balises wcag2a/aa, 2.1, 2.2 AA, best-practice, **0 violation** |
| Total Playwright | `npx playwright test` | **148 passés, 0 échec** (~5 min) |
| Production fail-closed | `APP_ENV=production DEMO_MODE_ENABLED=true next start` + `curl` | `POST /api/bff/demo/session` → **404 `demo.disabled`** ; le bouton de démonstration n'est pas rendu sur `/login` ; journal serveur `"demo":false` |
| Next DevTools MCP | `nextjs_index`, `get_compilation_issues`, `get_errors` (serveur dev) | 0 problème de compilation ; 0 erreur de session navigateur |

Les tests Playwright s'exécutent contre le **build de production** (`next start`, `APP_ENV=test`).
Routes couvertes par axe : login, register, forgot-password, reset-password, verify-email, session-expired,
privacy, terms, forbidden, service-unavailable ; dashboard, properties, properties/demo-cedre, units,
settings/{profile,preferences,security,privacy,notifications}, dev/components.

## C. Validation visuelle

- Matrice **1440 / 1280 / 768 / 390 / 320 px × FR/EN × clair/sombre** exécutée par `tests/e2e/responsive.spec.ts`
  (vérifie l'absence de défilement horizontal sur les écrans publics et applicatifs) : 40 tests passés.
- **30 captures** régénérables (`CAPTURE_SCREENSHOTS=true npx playwright test --project=e2e`) dans
  `docs/development/screenshots/` : connexion, tableau de bord, immeubles, fiche immeuble et préférences, à 1440 / 768 / 390 / 320 px
  (échantillon représentatif, pas la matrice complète).
- Captures **relues visuellement** : tableau de bord clair 1440 (graphiques colorés), tableau de bord sombre 390,
  immeubles sombre 1440, immeubles EN clair 320, fiche immeuble clair 768, connexion clair 1440 et sombre 390.
  C'est cette relecture qui a révélé les graphiques sans couleur et le libellé tronqué (voir A).
- Playwright MCP : navigation sur le serveur dev, entrée en mode démo par clic, console du navigateur relue
  (0 erreur après correction de la CSP de développement).
- Non fait : revue visuelle manuelle de **toutes** les captures de la matrice, mesure de contraste hors règles axe,
  rendu dans un WebView natif.

## D. Observabilité

- Logger serveur Pino (`getLogger`) et logger navigateur (`getClientLogger`) sur un cœur commun : liste blanche de
  métadonnées, masquage récursif (mots de passe, jetons, témoins, données bancaires, courriels, téléphones,
  affectations `secret=…`), événements `domaine.opération.résultat`, messages techniques en anglais.
- Corrélation : `x-correlation-id` + W3C `traceparent` (proxy → BFF → services), contexte via `AsyncLocalStorage`.
- Erreurs : `ApplicationError`, `reportError` une seule fois par frontière (`markReported`), error boundaries
  (`error.tsx`, `global-error.tsx`) avec référence de support affichée, sans détail technique.
- Web Vitals journalisés en local uniquement. **Aucun export distant** (`OTEL_ENABLED=false`).
- Aucun `console.*` dispersé (règle Biome `noConsole` en erreur). Tests : redaction, cœur du logger, corrélation,
  mapping d'erreurs, intégration BFF.
- Contrôle automatique « aucun écran ne produit d'erreur console / violation CSP » (e2e, 20 écrans).

## E. Documentation

- `README.md` (application + kit de gouvernance conservé), `docs/development/DEVELOPMENT_GUIDE.md` (nouvelle feature,
  écran, endpoint BFF, logs, traductions, commandes, pièges), `docs/development/COOKIES_AND_STORAGE.md`, ce rapport,
  `.env.example`. Les documents d'architecture, d'observabilité et de design system existants n'ont pas été modifiés.

## F. Points ouverts et limites

**Décisions à arbitrer (non inventées)**
1. Fournisseur d'identité, contrats backend, rôles/permissions, onboarding : non définis ; l'authentification reste démonstrative.
2. Textes juridiques (confidentialité, conditions) **provisoires** ; qualification Loi 25 / consentement à valider.
3. Slogan : traduction anglaise non validée, le texte français est affiché dans les deux langues.
4. Sous-logos fonctionnels : non livrés (`BRAND_ASSETS_PENDING`) ; les assets officiels n'ont pas été modifiés.
5. Centralisation, rétention et alertes des journaux : non arrêtées (aucun export distant activé).

**Écarts et limites connus**
- `/properties/<id inconnu>` renvoie HTTP **200** (contenu « introuvable » diffusé en streaming derrière `loading.tsx`).
- 12 avertissements Biome restants (non bloquants) : `noArrayIndexKey` ×4 (squelettes de chargement),
  `noNestedTernary` ×3, `noUnnecessaryConditions` ×4, `noDocumentCookie` ×1 (écriture du cookie de langue de session côté client).
- `src/components/ui/chart.tsx` est une version **patchée** de shadcn (voir guide §3) ; une mise à jour shadcn doit conserver ce patch.
- Le hachage CSP de Sonner (2.0.8) doit être régénéré à chaque mise à jour de Sonner (un test échoue sinon).
- Dépendances exigeant Node 22 évitées (Node local 20.19.2) ; bug npm 11 contourné via `npx npm@latest`.
- `.cursor/rules/escalia.mdc` absent et `.agents/skills` vide dans ce dépôt : la lecture des skills s'est appuyée sur les
  skills disponibles dans l'environnement ; `AGENTS.md` et `CLAUDE.md` n'ont pas été modifiés (`agentRules: false` dans `next.config.ts`).
- En développement (`next dev`), la CSP autorise `style-src 'unsafe-inline'` (Turbopack/HMR injecte des styles sans nonce) ;
  la production n'a pas cette exception (vérifié par le test e2e sur le build).
- Les MCP : Next DevTools et Playwright MCP ont été utilisés réellement (voir B et C) ; shadcn MCP (`get_project_registries`)
  et Context7 (recherche Sonner/CSP : aucune documentation sur un nonce, d'où l'approche par hachage) ont été interrogés
  ponctuellement. Playwright MCP ne remplace pas la suite Playwright Test, qui fait foi.
- Non exécuté : test sur appareil réel ou WebView natif ; test de charge ; revue juridique ; déploiement
  (explicitement exclu) ; envoi de télémétrie ou de code vers un service externe (explicitement exclu).
- `.mcp.json` : un reformatage automatique a été annulé ; le fichier est exclu de Biome.
