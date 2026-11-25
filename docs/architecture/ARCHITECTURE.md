# Escalia — Architecture V7

## Architecture Next.js BFF
Adopter une architecture feature-first avec App Router. Adapter cette arborescence au dépôt existant ; ne pas migrer sans accord.

```text
messages/{fr-CA,en-CA}/   # JSON par domaine, clés identiques
public/branding/{logos,icons}/
src/
  app/
    [locale]/
      layout.tsx
      (auth)/{login,register,forgot-password,reset-password,verify-email}/page.tsx
      (app)/
        layout.tsx
        dashboard/page.tsx
        properties/page.tsx
        properties/[id]/page.tsx
        units/page.tsx
        tenants/page.tsx
        leases/page.tsx
        payments/page.tsx
        maintenance/page.tsx
        documents/page.tsx
        reports/page.tsx
        settings/preferences/page.tsx
      (legal)/privacy/page.tsx
      (legal)/terms/page.tsx
      error.tsx
      loading.tsx
      not-found.tsx
    api/bff/               # routes non localisées
    globals.css
  components/{ui,layout,shared,feedback,privacy}/
  features/
    properties/{components,hooks,api,schemas,types,server}/
    auth/
    units/
    tenants/
    leases/
    payments/
    maintenance/
    settings/{profile,preferences,security,privacy,notifications,organization}/
  server/{auth,session,security,cookies,clients,bff,config}/
  lib/observability/
  instrumentation-client.ts
  i18n/{routing,request,navigation,config}.ts
  providers/
  hooks/
  lib/
  styles/
  proxy.ts                 # Next 16 ; adapter à la version réelle
  instrumentation.ts
tests/{unit,integration,e2e}/
```

### Flux et frontières
```text
Client Component -> /api/bff/* -> feature/server -> server/clients -> backend
Server Component -> feature/server -> server/clients -> backend
```
- Les Server Components accèdent directement à la couche serveur, sans requête HTTP vers leur propre BFF. Les Route Handlers exposent des contrats adaptés aux besoins du navigateur.
- Server Components par défaut ; Client Components uniquement pour l'interactivité, hooks et APIs navigateur.
- Utiliser `server-only` pour les modules sensibles. Aucun secret, token backend ou URL interne dans le bundle navigateur. Ne jamais placer de secret dans NEXT_PUBLIC_*.
- Les Route Handlers sont minces : authentifier, autoriser, valider, appeler l'orchestration, mapper la réponse. Ne pas créer de proxy générique ouvert.
- Le BFF agrège les données et adapte les DTO aux vues ; les règles métier autoritatives et transactions restent dans les services backend.
- Vérifier l'autorisation et le tenant sur chaque opération serveur ; le filtrage de la sidebar ne constitue pas un contrôle d'accès. Ne pas faire confiance à un tenantId fourni par le client.
- Si l'authentification utilise des cookies : HttpOnly, Secure en production, SameSite adapté et protection CSRF pour les mutations. Choisir le mécanisme de session selon l'IdP réel.
- Valider les entrées, encoder les paramètres, définir des timeouts, normaliser les erreurs, journaliser sans secrets ni données personnelles inutiles. Ne pas réessayer automatiquement une mutation non idempotente.
- Pour les données privées, éviter les caches partagés ; définir explicitement la stratégie de cache et d'invalidation selon la version Next.js et le contexte tenant/utilisateur.
- Utiliser TanStack Query pour les données interactives lorsque pertinent ; ne pas dupliquer systématiquement les fetchs RSC. Zustand pour l'état UI partagé seulement si nécessaire. Utiliser les paramètres URL pour filtres et pagination partageables.
- Server Actions possibles si cohérentes avec l'existant, avec les mêmes contrôles de sécurité. Ne pas créer deux chemins de mutation sans justification.
- Respecter les contrats API réels ; ne pas inventer de endpoints backend. Les mocks doivent être identifiés et isolés.

## Internationalisation et configuration
- next-intl avec `localePrefix: "never"` : fr-CA et en-CA restent internes (`app/[locale]`), les URL publiques cibles sont propres (`/login`, `/dashboard`, `/properties`). `src/proxy.ts` délègue la réécriture à `createIntlMiddleware`, redirige les anciens chemins `/fr-CA/...` et `/en-CA/...` vers le chemin sans préfixe (308) et pose le cookie `escalia_locale`. API BFF non localisée. Détection : surcharge de session (`escalia_locale_session`) > préférence démo (`escalia_prefs`) > cookie `escalia_locale` > Accept-Language > fr-CA (`src/lib/resolve-public-locale.ts`). Les composants `Link` / `redirect` / `useRouter` de `@/i18n/navigation` doivent conserver les URL sans préfixe. **Point ouvert (avant publication)** : sur Next.js 16.4.6 + next-intl 4.16.2, `/login` peut boucler en 308 (réécriture interne + redirection externe) ; valider une montée de version ou un correctif framework avant mise en production.
- Langue, pays, province, devise, fuseau et juridiction fiscale sont indépendants. EN ne signifie pas Ontario. La fiscalité dépend des données métier, notamment de la localisation des immeubles, jamais de la locale.
- Configuration > Préférences : langue préférée, thème light/dark/system, fuseau, notifications. Persister via BFF dans le profil backend lorsqu'il existe ; adapter de démonstration explicitement identifié sinon. Séparer configuration personnelle et organisationnelle, protéger cette dernière par permissions.
- Header : sélecteur FR/EN immédiat, conserver route, paramètres et contexte ; changement temporaire de session, sans modifier la préférence permanente. Effacer cette surcharge à la déconnexion. Préférence de session > profil > défaut pour utilisateur connecté ; choix navigateur > Accept-Language > fr-CA pour visiteur. Une sauvegarde explicite dans Configuration remplace la surcharge correspondante.
- Configuration organisation : future, hors initialisation. Ne pas simuler de droits réels.

## Cookies, confidentialité et sécurité transversale
- Session opaque côté navigateur ; tokens backend côté serveur uniquement. Cookie de session HttpOnly, Secure en production, SameSite adapté, Path=/, sans Domain si possible ; expiration, rotation et révocation selon IdP. Aucun token dans localStorage. CSRF : contrôle Origin et mécanisme adapté pour mutations ; vérifier auth et tenant indépendamment du proxy Next.
- Inventorier cookies/session/locale/theme/sidebar/consent, finalité, durée, attributs et stockage. Minimiser les données ; préférences locales non sensibles uniquement. Durées indicatives : locale/thème/sidebar 1 an, consentement 6 mois, session selon politique. Ne pas créer de refresh cookie navigateur si tokens serveur. Ne pas imposer de cookie CSRF si mécanisme alternatif approprié.
- Aucun tracking publicitaire ni analytics tiers par défaut. Bloquer tout traitement facultatif soumis au consentement avant accord ; refus aussi accessible que l’acceptation, retrait via Configuration > Confidentialité. Pas de bannière artificielle si seuls les cookies nécessaires sont utilisés ; documenter la qualification réelle et faire valider Loi 25 et autres obligations. Pages légales provisoires explicitement signalées, sans prétendre à la conformité.
- CSP adaptée, HSTS en production HTTPS, headers de sécurité, validation des entrées, logs expurgés, correlation ID, timeout et erreurs normalisées. Ne pas exposer de secrets ou données personnelles. Isoler les caches et les vider lors du changement de compte/organisation.


## WebView First
Next.js BFF hébergé, pas de static export supposé. Responsive, 100dvh, safe areas, clavier, retour natif, touch 44px, tableaux adaptés, réseau intermittent et reprise sûre. Contrôler navigation externe, téléchargements et previews. Pont natif minimal allowlisté, aucune injection de tokens. OAuth/OIDC via navigateur système si nécessaire, PKCE/state/nonce selon protocole, callback/deep link validé ; ne pas supposer cookies partagés. Capacitor est une option non arrêtée. Tests iOS/Android réels avant certification.
## Auth et démo
Une WebApp gestionnaire/locataire ; pas de sélecteur de rôle ni RBAC inventé. Session opaque serveur, IdP à intégrer selon contrat. Mode démo explicite local/test uniquement, fixtures isolées, aucune collecte réelle de credentials, production fail closed même si flag démo activé. Routes publiques accessibles, mutations réelles désactivées tant que contrat absent. Préférences session vs profil : conserver route/query, reset surcharge logout ; choix permanent dans Configuration. FR/EN indépendant des paramètres régionaux. Les pages légales provisoires ne constituent pas une conformité juridique.
## Qualité
Lockfile, versions compatibles, TypeScript strict, lint, tests unitaires/intégration/e2e, build, CI reproductible. Aucun déploiement sans demande. Voir OBSERVABILITY.md pour logs et traces.
