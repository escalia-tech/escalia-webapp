# Kubernetes — recommandations Escalia WebApp

Pas de chart Helm ni de déploiement cluster dans ce livrable : ce document décrit comment exploiter l’image OCI versionnée (`escalia-webapp:<version>` depuis `package.json`).

## Image

- Construire et pousser manuellement : voir `docs/deployment/DOCKER.md` (`DOCKER_PUSH=true`).
- Tirer par tag versionné (`:0.1.0`), pas uniquement `latest`.
- Même image entre environnements ; différencier par **ConfigMap** / **Secret** runtime (Twelve-Factor).

## Déploiement (extrait indicatif)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: escalia-webapp
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: web
          image: registry.example.com/escalia/escalia-webapp:0.1.0
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - configMapRef:
                name: escalia-webapp-config
            - secretRef:
                name: escalia-webapp-secrets
                optional: true
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
          startupProbe:
            httpGet:
              path: /api/health/live
              port: http
            failureThreshold: 30
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /api/health/live
              port: http
            periodSeconds: 15
            timeoutSeconds: 5
          readinessProbe:
            httpGet:
              path: /api/health/ready
              port: http
            periodSeconds: 10
            timeoutSeconds: 5
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 5"]
```

## ConfigMap (exemple)

Les clés suivent `deploy/runtime.env.example` (même contenu qu’un fichier `env_file` Compose). Pour créer une ConfigMap depuis ce fichier :

```bash
kubectl create configmap escalia-webapp-config --from-env-file=deploy/runtime.env
```

Extrait YAML équivalent :

```yaml
data:
  NODE_ENV: production
  APP_ENV: production
  LOG_LEVEL: info
  LOG_FORMAT: json
  OTEL_ENABLED: "false"
  DEMO_MODE_ENABLED: "false"
```

## Secret (exemple)

```yaml
stringData:
  DEMO_SESSION_SECRET: "" # uniquement si démo multi-process en test — pas en production
```

Ne jamais monter de fichier `.env` de développement.

## Ingress / Service

- Service `ClusterIP` port 3000 → conteneur 3000.
- Ingress ou Gateway API selon votre plateforme ; Escalia n’impose pas de reverse proxy particulier.
- TLS terminé en amont ; l’Ingress doit envoyer `X-Forwarded-Host` et `X-Forwarded-Proto` (origine déduite par l’app).

## Observabilité

- Logs JSON sur stdout/stderr (collecteur côté cluster : Fluent Bit, Alloy, etc. — non imposé).
- Champs `service` et version applicative dans les logs de démarrage (`appName`, `appVersion`).
- Correlation IDs conservés (`x-correlation-id`).

## Sécurité

- `runAsUser: 1001` correspond à l’utilisateur `nextjs` du Dockerfile.
- Pas de `privileged`, pas de port debug exposé.
- NetworkPolicy : restreindre l’egress selon la politique tenant (aucun backend Escalia obligatoire aujourd’hui).

## Limites

- Health readiness ne vérifie pas de dépendance externe tant qu’aucun backend n’est contracté.
- Variables `NEXT_PUBLIC_*` nécessitent une image reconstruite pour changer entre environnements.
- Valider le comportement des URL propres (`/login`) avant mise en production (voir architecture).