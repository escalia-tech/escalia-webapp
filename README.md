# Escalia V7 — WebApp Foundation Kit
Les artisans de la gestion immobilière.

Ce package est un kit documentaire et de configuration, pas une application Next.js déjà construite. Il consolide V6 et les décisions V7 : Pastel Enterprise light, Black & Amber dark, Barlow, Studio Admin, WebView First, inscription publique, observabilité native et trois skills.

## Démarrage
1. Extraire le contenu du dossier escalia-v7 à la racine du repository (fusionner avec prudence, ne pas écraser un projet existant).
2. Ouvrir le repository dans Claude Code ou Cursor. Lire AGENTS.md ; Claude utilise CLAUDE.md, Cursor .cursor/rules/escalia.mdc. Les skills canoniques sont .agents/skills. Si nécessaire, créer des liens locaux dans .claude/skills ou .cursor/skills vers ../../.agents/skills/<nom> (vérifier support de la version ; sinon lecture directe via instructions). Ne pas maintenir des copies divergentes.
3. Vérifier et autoriser les MCP du projet (.mcp.json / .cursor/mcp.json). Node/npm nécessaires. Examiner les packages avant exécution ; configurer Context7 localement si clé requise. Voir docs/development/MCP_TOOLING.md.
4. Donner à l'agent : « Lis AGENTS.md et les trois skills, puis exécute INITIALIZE_PROJECT.md par étapes. Respecte les limites du périmètre et fournis les résultats réels des tests. »
5. Après génération, utiliser les commandes documentées par l'agent dans le README applicatif. Aucun npm install/dev n'est possible dans ce kit seul : package.json sera créé par l'initialisation.

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
IdP, contrats backend, onboarding, rôles, SaaS, conteneur natif, textes juridiques, centralisation/rétention/alertes logs non arrêtés. Nuances dark complémentaires et choix techniques E.164, Pino/OTEL, routes, surcharge de langue temporaire sont des conventions à vérifier à l'intégration. Versions MCP @latest à figer après validation. Aucun MCP, build, test navigateur, contraste complet ou WebView natif exécuté dans ce kit. Les données démo ne doivent jamais être accessibles en production. Aucun faux succès d'authentification.

## Après initialisation
Développer chaque feature avec spécification et critères d'acceptation approuvés. Les skills expliquent comment travailler, le produit ce qui est envisagé, le prompt ce qui est autorisé. Ne pas confondre ces niveaux.
