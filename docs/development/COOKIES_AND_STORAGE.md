# Cookies et stockage navigateur

Source de vérité du code : `src/lib/cookies.ts` (`COOKIE_NAMES`, `STORAGE_KEYS`, `COOKIE_INVENTORY`).
Le même inventaire est affiché dans **Configuration > Confidentialité**. Toute nouvelle entrée doit être
ajoutée aux trois endroits (code, cette page, libellés `messages/*/settings.json`) avant d'être utilisée.

Aucun témoin d'analytique, de publicité ou de pistage n'existe. Aucun jeton, mot de passe, donnée bancaire
ou donnée personnelle brute n'est stocké dans le navigateur. **Rien n'est stocké dans `localStorage` à part
le thème visuel.**

| Nom | Stockage | Finalité | Durée | HttpOnly | Posé par |
|---|---|---|---|---|---|
| `escalia_locale` | cookie | Dernière langue choisie explicitement (fr-CA / en-CA) | 1 an | non | next-intl (proxy) |
| `escalia_locale_session` | cookie | Surcharge **temporaire** de la langue depuis le sélecteur FR/EN de l'en-tête | session (sans Max-Age) | non | `LocaleSwitcher` |
| `escalia_sidebar` | cookie | État ouvert/réduit du menu latéral (évite le saut de mise en page) | 1 an | non | composant Sidebar |
| `escalia_prefs` | cookie | Adaptateur **de démonstration** des préférences (langue, fuseau) | 1 an | oui | BFF `/api/bff/preferences` |
| `escalia_demo_session` | cookie | Session de démonstration signée HMAC. N'existe que si le mode démo est actif (jamais en production) | 8 h | oui | BFF `/api/bff/demo/session` |
| `escalia-theme` | localStorage | Thème `light` / `dark` / `system` | persistant | n/a | next-themes |

Attributs : `Path=/` et `SameSite=Lax` partout. `Secure` est posé quand `NODE_ENV=production` sur les cookies
du BFF (`escalia_prefs`, `escalia_demo_session`). Les cookies `escalia_sidebar` et `escalia_locale_session` sont
écrits côté client (`document.cookie`) et ne contiennent aucune donnée sensible ; `escalia_sidebar` n'a pas
l'attribut `SameSite` explicite (valeur par défaut du navigateur : Lax).

## Points à confirmer (non décidés par le produit)

- Qualification juridique (Loi 25 / consentement) : les témoins ci-dessus sont tous « nécessaires » au
  fonctionnement ou à une préférence explicite. Les textes de confidentialité sont **provisoires**.
- Le remplacement des adaptateurs de démonstration (`escalia_prefs`, `escalia_demo_session`) par un vrai
  fournisseur d'identité et un vrai profil serveur retirera ces deux témoins.
- Le cookie de session réel sera défini avec le fournisseur d'identité (non arrêté).
