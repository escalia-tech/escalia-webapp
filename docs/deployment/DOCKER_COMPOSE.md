# Docker Compose — Escalia WebApp

`compose.yaml` ne liste **pas** les variables applicatives : elle charge un fichier runtime (même rôle qu’une **ConfigMap** Kubernetes).

| Fichier | Rôle |
|---------|------|
| `.env.compose` (généré) | Image versionnée + port hôte (`npm run docker:compose:env`) |
| `deploy/runtime.env` (local, gitignored) | Config applicative injectée dans le conteneur via `env_file` |
| `deploy/runtime.env.example` | Modèle versionné ; mêmes clés que l’exemple ConfigMap dans `KUBERNETES.md` |

Les **secrets** restent hors du dépôt (fichier local additionnel, ou Secret K8s) — voir `.env.example`.

## Démarrage

```bash
cp deploy/runtime.env.example deploy/runtime.env   # une fois, puis éditer
npm run docker:build
npm run docker:compose:env
docker compose --env-file .env.compose up -d
```

Changer l’emplacement du runtime :

```bash
export ESCALIA_RUNTIME_ENV_FILE=/chemin/vers/mon/runtime.env
docker compose --env-file .env.compose up -d
```

## `.env.compose` (généré)

Contient uniquement l’orchestration Compose, pas la config métier :

- `ESCALIA_IMAGE=escalia-webapp:0.1.0` (depuis `package.json`)
- `ESCALIA_HOST_PORT` (défaut 3000)

## `deploy/runtime.env`

Variables lues par `getServerEnv()` au démarrage du conteneur : `APP_ENV`, `LOG_*`, `OTEL_*`, `DEMO_*`, etc. L’origine HTTP est inférée par requête (`Host`, `X-Forwarded-*`).

Exemple démo (non production) : éditer `deploy/runtime.env` → `APP_ENV=staging`, `DEMO_MODE_ENABLED=true`.

## Santé et arrêt

```bash
docker compose --env-file .env.compose ps
curl -sS "http://localhost:${ESCALIA_HOST_PORT:-3000}/api/health/ready"
docker compose --env-file .env.compose down
```

## Registry

```bash
export DOCKER_REGISTRY=registry.example.com
export DOCKER_NAMESPACE=escalia
npm run docker:compose:env
docker compose --env-file .env.compose up -d
```

Aucun `docker push` automatique.