# Déploiement Docker (Escalia WebApp)

Escalia utilise Next.js `output: "standalone"` : l’image finale exécute `node server.js` (BFF et rendu serveur préservés, pas de `next export`).

## Prérequis

- Docker 24+ (Buildx pour le multi-architecture)
- Node.js 20.19+ sur l’hôte pour les scripts npm (le build s’exécute dans l’image)

## Versionnement de l’image

La **seule** source de vérité pour le nom et la version applicative est `package.json`. Les scripts sous `scripts/docker/` lisent ces champs et produisent :

```text
escalia-webapp:0.1.0
```

Avec un registry et un namespace (variables d’environnement, sans modifier `package.json`) :

```bash
export DOCKER_REGISTRY=registry.example.com
export DOCKER_NAMESPACE=escalia
npm run docker:version
# → registry.example.com/escalia/escalia-webapp:0.1.0
```

Le tag `latest` n’est appliqué que si `DOCKER_TAG_LATEST=true` (jamais seul tag implicite).

## Construction locale

```bash
npm run docker:version    # affiche image, labels OCI, révision Git si disponible
npm run docker:build      # docker build avec labels OCI et build-args ESCALIA_APP_*
```

## Exécution locale

```bash
npm run docker:run        # ESCALIA_HOST_PORT=3000 par défaut
curl -sS http://localhost:3000/api/health/live
curl -sS http://localhost:3000/api/health/ready
npm run docker:stop
```

Variables utiles au run : `APP_ENV` (défaut `staging` dans le script), `APP_URL`, `LOG_LEVEL`, `LOG_FORMAT`.

## Multi-architecture (Buildx)

| Mode | Commande | Résultat |
|------|----------|----------|
| Build local une plateforme | `DOCKER_PLATFORMS=linux/amd64 npm run docker:build:multiarch` | `--load` dans le daemon local |
| Export OCI (fichier) | `DOCKER_OUTPUT=oci DOCKER_OCI_DEST=./dist/escalia-webapp.oci.tar npm run docker:build:multiarch` | Archive portable, **sans** push automatique |
| Publication registry | `DOCKER_REGISTRY=... DOCKER_PUSH=true npm run docker:build:multiarch` | Push manuel explicite |

`linux/amd64` et `linux/arm64` par défaut (`DOCKER_PLATFORMS`).

## Image : contenu et sécurité

- Base `node:20.19.2-bookworm-slim`, multi-stage (`deps` → `builder` → `runner`)
- Utilisateur `nextjs` (non-root), `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, port **3000**
- `CMD ["node", "server.js"]` (forme exec), `STOPSIGNAL SIGTERM`
- Aucun fichier `.env` local dans l’image ; pas de skills, MCP ni devDependencies dans le runner
- `public/`, `.next/static`, traductions `messages/` compilées dans le build

## Labels OCI

Appliqués au build via `npm run docker:build` :

- `org.opencontainers.image.title`, `.description`, `.version` (depuis `package.json`)
- `org.opencontainers.image.created` (horodatage du build)
- `org.opencontainers.image.revision` et `.source` **uniquement** si `git` est disponible (pas d’URL inventée)

Vérification :

```bash
docker image inspect escalia-webapp:0.1.0 --format '{{json .Config.Labels}}'
```

## Configuration runtime (Twelve-Factor)

| Variable | Build | Runtime | Publique | Sensible |
|----------|-------|---------|----------|----------|
| `NEXT_PUBLIC_CLIENT_LOGGING_ENABLED` | ✓ | — | oui | non |
| `APP_ENV`, `APP_URL` | — | ✓ | non | non |
| `DEMO_MODE_ENABLED`, `DEMO_SESSION_SECRET` | — | ✓ | non | secret (demo) |
| `LOG_*`, `OTEL_*`, `BFF_UPSTREAM_TIMEOUT_MS` | — | ✓ | non | non |

En production conteneurisée : `APP_ENV=production`, `DEMO_MODE_ENABLED=false`, `LOG_FORMAT=json`, `APP_URL` = URL publique réelle.

Limitation Next.js : toute variable `NEXT_PUBLIC_*` exige un **rebuild** pour changer de valeur entre environnements.

## Health checks

- `GET /api/health/live` — processus OK (200)
- `GET /api/health/ready` — configuration serveur valide (`getServerEnv()`, 200 ou 503)
- Hors i18n et auth ; `Cache-Control: no-store` ; corps JSON avec `name` et `version`

Le `Dockerfile` et `compose.yaml` utilisent ces endpoints.

## Compatibilité Vercel

Vercel continue d’utiliser `npm run build` sur son infrastructure ; `output: "standalone"` n’empêche pas un déploiement Vercel (le mode standalone sert surtout à l’auto-hébergement OCI). Aucune dépendance cloud spécifique n’a été ajoutée.

## Limitations connues

- Boucle 308 possible sur `/login` (Next 16.4.6 + next-intl) — voir `docs/architecture/ARCHITECTURE.md` ; valider avant exposition publique.
- Readiness ne sonde pas de backend externe (aucun contrat upstream pour l’instant).