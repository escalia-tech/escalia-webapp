# Guide de développement (agents IA et humains)

Ce guide dit **comment** étendre l'application sans casser ses garde-fous. Il ne dit pas **quoi** construire :
une fonctionnalité réelle exige une spécification approuvée (`docs/features/TEMPLATE.md`). Les pages `À venir`
(logements, locataires, baux, paiements, entretien, documents, rapports) restent des emplacements honnêtes tant
qu'aucun parcours, contrat d'API ni permission n'est validé. N'inventez ni contrat, ni rôle, ni workflow.

Lire d'abord : `AGENTS.md`, `README.md`, les trois skills (`.agents/skills/*/SKILL.md` s'ils existent localement),
`docs/architecture/ARCHITECTURE.md`, `docs/architecture/OBSERVABILITY.md`, `docs/branding/DESIGN_SYSTEM.md`.

## 1. Cartographie du code

```
src/app/[locale]/(app|auth|legal|status)/…   Routes localisées (toujours /fr-CA ou /en-CA)
src/app/api/bff/…                            BFF : seule porte vers les données (hors locale)
src/proxy.ts                                 CSP à nonce, corrélation, i18n, langue préférée
src/app/[locale]/(app)/layout.tsx            Garde de session des pages (redirige vers /login ; échoue fermé)
src/features/<feature>/                      components/, schemas/, server/, lib/ — feature-first
src/components/{ui,layout,feedback,charts}   Primitives shadcn, shell, états, graphiques
src/server/{bff,config,session,security,adapters}   Code serveur uniquement (`import "server-only"`)
src/lib/observability/                       Logger, redaction, corrélation, rapport d'erreurs
messages/{fr-CA,en-CA}/<domaine>.json        Traductions par domaine (clés identiques, test de parité)
```

## 2. Ajouter une fonctionnalité (feature)

1. Vérifier qu'une spécification approuvée existe (sinon la demander, ne pas la déduire).
2. Créer `src/features/<feature>/` avec `schemas/` (Zod = contrat), `server/` (repository + service),
   `components/`, `lib/`.
3. Le **repository** est une interface ; l'adaptateur de démonstration vit dans `src/server/adapters/demo/`.
   Aucune logique métier, calcul fiscal ou règle de statut côté interface : la source fait foi, « non disponible »
   n'est jamais `0`.
4. Le **service** (`server-only`) valide, applique `withTimeout`, journalise (`<domaine>.<opération>.<résultat>`)
   et mappe les erreurs en `ApplicationError`. Il échoue fermé s'il n'y a pas de source approuvée.
5. Ajouter les domaines de traduction dans `src/i18n/config.ts` (`MESSAGE_DOMAINS`), puis les deux fichiers de langue.
6. Ajouter tests unitaires (schémas, mapping), intégration (service) et au moins un scénario e2e.

## 3. Ajouter un écran

1. Créer `src/app/[locale]/(app)/<route>/page.tsx` (Server Component par défaut). Tout appel de données passe par un
   service serveur ; ne jamais appeler un backend depuis le navigateur.
2. `await params` / `cookies()` / `headers()` (asynchrones dans Next 16).
3. Utiliser `PageHeader`, les états `LoadingState` / `EmptyState` / `ErrorState` (`src/components/feedback`),
   et un fichier `loading.tsx` / `error.tsx` si l'écran charge des données.
4. Ajouter l'entrée de navigation dans `src/config/navigation.ts` (`status: "available"` seulement quand l'écran est réel).
   Masquer un lien n'est **pas** un contrôle d'accès.
5. Respecter le design system V7 : tokens CSS (`--control-height`, `--row-height`, surfaces sémantiques), densité
   Medium+, Barlow, thèmes light/dark, 320 px sans défilement horizontal, info-bulles ambre accessibles au clavier.
6. Composants shadcn : chercher d'abord (`npx shadcn@latest search` ou MCP shadcn), réutiliser, ne pas dupliquer.
   `src/components/ui/chart.tsx` est **patché** (variables CSS en ligne au lieu de `<style>`, voir §8).

## 4. Ajouter un endpoint BFF

```ts
// src/app/api/bff/<ressource>/route.ts
import { bffHandler, parseSearchParams } from "@/server/bff/with-bff";

export const GET = bffHandler({ route: "/api/bff/<ressource>", operation: "<ressource>.list" }, async ({ request }) => {
  const query = parseSearchParams(schema, request.url);
  return { data: await service(query) };
});
```

- `bffHandler` : session obligatoire (401 sinon), corrélation, journal `bff.request.*`, mapping d'erreurs, `Cache-Control: private, no-store`.
- `publicBffHandler` : routes publiques (aucune session). À utiliser avec parcimonie.
- Mutations (POST/PUT/PATCH/DELETE) : contrôle d'origine (same-origin) automatique. Valider le corps avec Zod.
- Réponses d'erreur : `{ error: { code, message, retryable, correlationId } }`. Pas de stack, pas de détail interne.
- Côté client : `bffFetch` (`src/lib/bff-client.ts`) + TanStack Query ; les nouvelles tentatives ne portent que sur
  les lectures marquées `retryable`.
- Tests : intégration avec `tests/integration/with-bff.test.ts` comme modèle.

## 5. Journalisation

- **Serveur** : `getLogger("<module>")` (`src/lib/observability/logger/logger.server.ts`). **Navigateur** :
  `getClientLogger("<module>")`. Jamais `console.*` (règle Biome `noConsole` en erreur).
- Événements : `<domaine>.<opération>.<résultat>` (ex. `properties.list.completed`), messages techniques **en anglais**.
- Métadonnées : liste blanche + masquage récursif (mots de passe, jetons, témoins, données bancaires, courriels,
  téléphones, affectations `secret=…` dans les chaînes). Ne jamais journaliser de donnée personnelle brute.
- Erreurs : `reportError(logger, "<événement>", error)` **une seule fois** par frontière (`markReported`).
- Aucune exportation distante par défaut (`OTEL_ENABLED=false`) ; la corrélation W3C `traceparent` + `x-correlation-id`
  est propagée.

## 6. Traductions (fr-CA / en-CA)

- Un fichier par domaine dans `messages/<locale>/<domaine>.json`, **mêmes clés** dans les deux langues
  (`tests/unit/i18n-parity.test.ts`). Pas de point dans une clé (utiliser `_` ou camelCase).
- Aucune chaîne visible en dur dans un composant ; ICU pour pluriels et variables.
- Formats : `src/lib/format.ts` (montants en **cents**, CAD ; `null` → « Non disponible »).
- Langue ≠ pays ≠ devise ≠ fuseau. Le slogan est affiché en français dans les deux langues tant que la traduction
  anglaise n'est pas validée.

## 7. Commandes de validation

```bash
npm install                 # npm (lockfile reproductible)
npm run check               # Biome (lint + format)
npm run typecheck           # tsc --noEmit
npm run test                # Vitest : unitaires + intégration
APP_ENV=test DEMO_MODE_ENABLED=true npm run build   # build de production
npm run check:bundle        # aucun secret / pino / DEMO_SESSION_SECRET dans le client
npm run check:assets        # intégrité des assets de marque officiels
npx playwright test         # e2e + responsive + axe (démarre `next start` sur 127.0.0.1:3100)
CAPTURE_SCREENSHOTS=true npx playwright test --project=e2e   # régénère docs/development/screenshots
npm run validate            # check + typecheck + test + build
```

Prérequis Playwright : `npm run build` préalable (le serveur de test sert le build) et Google Chrome installé
(`channel: "chrome"`). Ne jamais affaiblir ou supprimer un test pour masquer un défaut : corriger l'implémentation.

## 8. Pièges connus (rencontrés pendant l'initialisation)

- **CSP à nonce** : tout `<style>` injecté à l'exécution sans nonce est bloqué. Le CSS de Sonner est autorisé par
  hachage (`src/lib/security/style-hashes.ts`, vérifié par `tests/unit/style-hashes.test.ts` à chaque mise à jour de
  Sonner). Les couleurs de graphiques passent par des variables CSS en ligne (attribut `style`, autorisé).
- **Hydratation** : ne pas rendre dans le HTML serveur des textes dépendant de l'ICU du navigateur (ex. noms de pays
  via `Intl.DisplayNames`) ; construire côté client après hydratation (voir `phone-field.tsx`).
- **Tests e2e** : attendre l'hydratation (`settle(page)`) avant de remplir un formulaire contrôlé.
- **AGENTS.md** : `next` peut réécrire ce fichier ; `agentRules: false` est positionné dans `next.config.ts`.
- **Node 20** : dépendances exigeant Node 22 évitées ; npm 11 a un bug d'arborist, installation via `npx npm@latest`.
- **Mode démo** : honoré seulement si `APP_ENV` ∈ {local, development, test}. En production il est refusé même si
  `DEMO_MODE_ENABLED=true` (vérifié : POST `/api/bff/demo/session` → 404 `demo.disabled`).
