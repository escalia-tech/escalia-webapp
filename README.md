# Escalia V7 — WebApp
Les artisans de la gestion immobilière.

Fondation applicative Next.js (App Router + BFF) construite à partir du template Studio Admin (gratuit, licence
conservée dans `THIRD_PARTY_LICENSE_STUDIO_ADMIN.txt`), avec le design system Escalia V7 « Pastel Enterprise »
(thèmes light / dark / système, Barlow, densité Medium+), `fr-CA` / `en-CA`, observabilité native et tests.

> **Périmètre.** Il s'agit d'une **fondation** : coque applicative, écrans publics d'authentification **démonstratifs**,
> tableau de bord et immeubles de **référence** alimentés par des données **fictives**, galerie de composants.
> Aucun fournisseur d'identité, contrat backend, rôle ni règle métier n'est défini ; rien n'est inventé.
> Les modules Logements, Locataires, Baux, Paiements, Entretien, Documents et Rapports sont des pages « À venir ».

## Prérequis
Node.js 20.19+ (testé avec 20.19.2), npm, Google Chrome (tests Playwright).
Si `npm install` échoue avec une erreur d'arborist (npm 11), utiliser `npx npm@latest install`.

## Démarrage rapide
```bash
npm install
cp .env.example .env.local        # APP_ENV=local, DEMO_MODE_ENABLED=true (aucun secret requis en local)
npm run dev                       # http://localhost:3000 → redirige vers /fr-CA/login
```
Sur l'écran de connexion, « Entrer en mode démonstration » ouvre une **session de démonstration** (cookie HttpOnly signé,
8 h). Le mode démo n'est honoré que si `APP_ENV` est `local`, `development` ou `test` : **en production il est refusé
même si `DEMO_MODE_ENABLED=true`**. Les formulaires de connexion/inscription ne simulent jamais un succès.

## Commandes
| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Développement, build et serveur de production |
| `npm run check` / `check:fix` | Biome (lint + format) |
| `npm run typecheck` | TypeScript strict |
| `npm run test` | Vitest (unitaires + intégration) |
| `npx playwright test` | e2e, matrice responsive, accessibilité axe (voir le guide) |
| `npm run check:bundle` | Aucun secret ni code serveur dans le JavaScript client |
| `npm run check:assets` | Intégrité des assets de marque officiels |
| `npm run validate` | check + typecheck + test + build |

## Documentation applicative
- `docs/development/DEVELOPMENT_GUIDE.md` — ajouter une feature, un écran, un endpoint BFF, des logs, des traductions ; commandes ; pièges.
- `docs/development/COOKIES_AND_STORAGE.md` — inventaire des témoins et du stockage navigateur.
- `docs/development/FOUNDATION_REPORT.md` — rapport de fondation : résultats réels, captures, points ouverts.
- `docs/architecture/` — architecture et observabilité ; `docs/branding/DESIGN_SYSTEM.md` — design system.

## Sécurité en bref
BFF seul accès aux données, secrets uniquement côté serveur (aucun `NEXT_PUBLIC_*` secret), CSP à nonce, contrôle
d'origine sur les mutations, aucune donnée sensible dans `localStorage`, journaux masqués, aucune télémétrie distante
par défaut. Ne pas déployer ni publier sans décision explicite.

# Kit de gouvernance Escalia V7 (conservé)

## Démarrage du kit (agents IA)
1. Extraire le contenu du dossier escalia-v7 à la racine du repository (fusionner avec prudence, ne pas écraser un projet existant).
2. Ouvrir le repository dans Claude Code ou Cursor. Lire AGENTS.md ; Claude utilise CLAUDE.md, Cursor .cursor/rules/escalia.mdc. Les skills canoniques sont .agents/skills. Si nécessaire, créer des liens locaux dans .claude/skills ou .cursor/skills vers ../../.agents/skills/<nom> (vérifier support de la version ; sinon lecture directe via instructions). Ne pas maintenir des copies divergentes.
3. Vérifier et autoriser les MCP du projet (.mcp.json / .cursor/mcp.json). Node/npm nécessaires. Examiner les packages avant exécution ; configurer Context7 localement si clé requise. Voir docs/development/MCP_TOOLING.md.
4. Donner à l'agent : « Lis AGENTS.md et les trois skills, puis exécute INITIALIZE_PROJECT.md par étapes. Respecte les limites du périmètre et fournis les résultats réels des tests. »
5. L'initialisation a été exécutée : voir la section « Application » ci-dessus et `docs/development/FOUNDATION_REPORT.md`.

## Sources de vérité
| Fichier | Responsabilité |
|---|---|
| AGENTS.md | Gouvernance et découverte |
| .agents/skills/escalia-ui-expert/SKILL.md | Méthode UI/frontend |
| .agents/skills/escalia-mcp-expert/SKILL.md | Usage des outils |
| .agents/skills/escalia-observability-expert/SKILL.md | Logs et diagnostics |
| docs/product/PRODUCT_SPECIFICATION.md | Intentions produit et maturité |
| docs/branding/DESIGN_SYSTEM.md | Règles visuelles et composants |
| docs/architecture/ARCHITECTURE.md | Frontières et sécurité |
| docs/architecture/OBSERVABILITY.md | Contrat de journalisation |
| docs/development/MCP_TOOLING.md | Configuration et limites MCP |
| docs/features/TEMPLATE.md | Spécification future par feature |
| INITIALIZE_PROJECT.md | Travail autorisé maintenant |

## Branding
public/branding contient 23 fichiers du groupe 1 V2 repris de V6. Planche et README source conservés. Vérifier intégrité depuis racine avec `sha256sum -c docs/branding/ASSET_MANIFEST.sha256` (macOS : `shasum -a 256 -c docs/branding/ASSET_MANIFEST.sha256`). Les SVG sont des reconstructions simplifiées fournies ; validation visuelle nécessaire. Ne jamais redessiner ni recolorer.

## Limites et décisions ouvertes
IdP, contrats backend, onboarding, rôles, SaaS, conteneur natif, textes juridiques, centralisation/rétention/alertes logs non arrêtés. Nuances dark complémentaires et choix techniques E.164, Pino/OTEL, routes, surcharge de langue temporaire sont des conventions à vérifier à l'intégration. Versions MCP @latest à figer après validation. Les validations réellement exécutées sont consignées dans `docs/development/FOUNDATION_REPORT.md`. Aucun WebView natif n'a été testé. Les données démo ne doivent jamais être accessibles en production. Aucun faux succès d'authentification.

## Après initialisation
Développer chaque feature avec spécification et critères d'acceptation approuvés. Les skills expliquent comment travailler, le produit ce qui est envisagé, le prompt ce qui est autorisé. Ne pas confondre ces niveaux.
