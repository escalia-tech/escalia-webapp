# Escalia — Spécification produit WebApp

Statut : document de cadrage évolutif, distinct du skill. Une capacité validée dans son principe ne constitue pas une autorisation de développement. Aucun endpoint, permission, workflow métier ou contrat backend ne doit être inventé. Le prompt d'initialisation fixe le périmètre effectivement autorisé.

## Périmètre validé
- WebApp unique Next.js avec BFF, destinée aux gestionnaires et locataires ; socle commun et expériences adaptées au contexte utilisateur.
- Français et anglais ; langue indépendante de la région, devise et fuseau horaire.
- Web responsive compatible avec une future encapsulation WebView iOS/Android. Technologie native à arbitrer.
- Design system Escalia partagé, Studio Admin comme template de référence, famille Barlow et principe chromatique pastel.

## Capacités validées dans leur principe, à spécifier avant développement
| Capacité | Intention |
|---|---|
| Tableaux métier | Recherche, filtres, pagination, colonnes, vues sauvegardées, sélection et export selon autorisations |
| Fiches détaillées | En-tête, sections, onglets, actions contextuelles, historique |
| Formulaires et workflows | Validation, brouillons, reprise, confirmation et protection des modifications non enregistrées |
| Recherche globale | Recherche et navigation rapide selon droits |
| Notifications | Catégories, lecture, préférences, liens contextuels |
| Calendrier | Échéances et événements |
| Tâches | Suivi, responsabilités et échéances |
| Journal d'activité | Traçabilité selon droits |
| Documents | Téléversement, consultation, classement et accès autorisé |
| Aide | Documentation et assistance contextuelle |
| Favoris et récents | Accès rapide aux ressources |
| Collaboration | Notes, commentaires et mentions selon droits |

## Domaines métier à spécifier
Immeubles, logements, locataires, baux, paiements, retards et requêtes : définir séparément les parcours, règles, contrats API, permissions et critères d'acceptation. Aucun workflow détaillé n'est validé par ce document.

## Futur / reporté
- Sélection du rôle et changement de contexte : préparer les frontières architecturales, sans implémenter de sélecteur ni inventer de RBAC.
- Dimension SaaS : organisations, abonnements, facturation, quotas et onboarding organisationnel à arbitrer ultérieurement.
- Encapsulation native, pont natif, notifications push et deep links : spécifications futures ; compatibilité web à préparer.

## Hors périmètre actuel
Back-office interne Escalia et site marketing public.

## Capacités validées dans leur principe — intégration à spécifier
- Authentification : connexion, récupération, réinitialisation, vérification, MFA et invitations selon fournisseur et contrats réels. Inscription publique retenue : prénom, nom, courriel, téléphone facultatif, mot de passe selon IdP, acceptation des conditions et lien vers la politique de confidentialité. Aucun rôle ni abonnement automatique. Vérification courriel selon contrat. États session expirée, 403, 404, 500 et maintenance.
- Graphiques financiers : tendances, comparaisons et répartitions ; aucune formule métier ni source de données présumée.
- Feedback : états chargement, vide, erreur, actualisation et confirmation serveur pour opérations financières.
- Accessibilité WCAG 2.2 AA et tests visuels bilingues, light/dark, desktop et mobile ; validation WebView réelle ultérieure.

## Initialisation autorisée
Le prompt INITIALIZE_PROJECT.md autorise uniquement le socle navigable, les écrans publics et les démonstrations isolées. Les capacités métier ci-dessus ne sont pas des tickets prêts à développer.

## Gouvernance
Le skill décrit comment concevoir et implémenter. Le design system décrit les conventions visuelles. La spécification produit décrit les intentions et leur maturité. Chaque feature nécessite une spécification et des critères d'acceptation propres avant implémentation. En cas de contradiction ou de contrat manquant, signaler le blocage plutôt que compléter par hypothèse.
