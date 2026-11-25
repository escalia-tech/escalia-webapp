# Escalia — Design system V7

## Direction artistique V7 — Pastel Enterprise Tech-Finance
- App Shell : header global blanc 64 px, logo horizontal officiel à gauche, réduction sidebar, emplacement organisation/portefeuille réservé (pas de sélecteur actif avant spécification), recherche globale, aide, notifications, FR/EN, compte. Breadcrumb dans le contenu. Header fixe, navigation sous le header, scroll indépendant si nécessaire.
- Seamless Sidebar : largeur 232 px (réduite 56 px), fond #EDF3F0, sélection #D4E6DE, texte actif #1D5C4F. Aucun espace extérieur, bordure, ombre ou radius du conteneur ; jointive au header et au contenu. Radius uniquement sur les items. Logo dans le header, pas dans la sidebar. Mobile : drawer accessible.
- Medium+ : navigation 36 px, tableaux 44 px, champs 38 px, boutons 36 px, cartes padding 20 px, gaps 16 px, sections 20 px, contenu 24 px, radius 8 px. Adapter les cibles tactiles à 44 px lorsque pertinent. Texte 14 px, métadonnées 12–13 px, titres 24–28 px.
- Barlow sur toute l’application principale, graisses 400/500/600/700 selon hiérarchie ; next/font/local avec fichiers licenciés ou next/font/google, fallback sans-serif, vérifier accents FR et chiffres tabulaires (fallback si non supportés). Space Grotesk + IBM Plex Sans réservé à une piste back-office interne, hors périmètre.
- Surfaces pastel, accents maîtrisés, saturation réservée aux actions importantes. Repère indicatif 87/10/3 neutres/marque/accents, pas un quota. Cartes blanches, fond Brume, chiffres Encre, graphiques Épinette désaturée, ambre ponctuel, brique pour anomalies. Aucun gradient décoratif. Dashboard plus expressif que formulaires et configuration.
- Assistance : InfoTooltip avec icône Lucide Info 14–16 px, sans fond coloré, zone interactive transparente. InfoPopover au clic/tactile pour contenu long ; InlineHelp visible pour information indispensable. Tooltip non interactif, focus clavier, Escape, aria-describedby, contenu survolable et persistant selon WCAG. Délai 200 ms, animation 120–150 ms avec reduced motion, largeur max 280 px, padding 10–12 px, radius 6 px, texte 13 px. Ne pas confondre assistance et avertissement (triangle + libellé). Vérifier contrastes dans chaque thème.
- Tokens light additionnels : sidebar #EDF3F0, sidebar-accent #D4E6DE, border #DCE4DF, info-icon #B58A25 (sur blanc ; sur fond pastel vérifier et assombrir si nécessaire), info-surface #FFFAEE, info-border #F0E5C9, info-foreground #665634. Ambre officiel #E0A526 inchangé. Dark : appliquer Black & Amber ci-dessous, sans inverser mécaniquement le light. Centraliser les tokens ; aucune couleur brute dans les écrans.

## Validation
Vérifier le contraste AA (texte 4,5:1, composants graphiques nécessaires 3:1), les états hover/focus, le clavier, le tactile, le mode sombre, les captures desktop/mobile et la lisibilité réelle de Barlow. Les couleurs de marque restent celles de la planche originale. Aucun changement des assets.

## Tokens V7
| Token | Light | Dark |
|---|---|---|
| background | #F3F5F4 | #101010 |
| header | #FFFFFF | #151515 |
| sidebar | #EDF3F0 | #151515 |
| sidebar-accent | #D4E6DE | #30291B |
| card | #FFFFFF | #1C1C1C |
| foreground | #10201C | #F1F1EF |
| muted-foreground | #52645B | #A3A3A3 |
| primary | #1D5C4F | #E0A526 |
| primary-foreground | #FFFFFF | #17130B |
| border décorative | #DCE4DF | #303030 |
| info-icon | #B58A25 | #D6AD55 |
| info-surface | #FFFAEE | #282419 |
| info-border | #F0E5C9 | #665634 |
| info-foreground | #665634 | #F1DFB5 |
| warning-surface | #FBF1D9 | #30291B |
| warning-foreground | #7A4F00 | #F0CB78 |
| danger-surface | #FCE9DF | #35231E |
| danger-foreground | #A3370A | #E79B7A |
| success-foreground | #1D5C4F | #8DBEAA |
| success-surface | #E3EFEB | #20332C |
Les couleurs dark complémentaires sont des choix de mise en œuvre à vérifier. Bordures de champs, focus et icônes nécessaires doivent atteindre 3:1 : ne pas utiliser une bordure décorative comme seul repère. Assombrir info-icon light si nécessaire. Texte normal 4,5:1, grand texte 3:1. Dark : surfaces noires neutres dominantes, ambre pour actions et sélection, jamais pour tous les statuts.

## Typographie
Barlow 400 texte 14/20, 500 labels/navigation, 600 titres de page 28/34 et sections 20/26, cartes 16/22, KPI 30–32/36, 700 emphase. Métadonnées 12/16, tooltip 13/18. Barlow Semi Condensed pour tableaux denses et graphiques, Condensed pour affichages contraints, italique ponctuel. Charger uniquement variantes utilisées, vérifier chiffres tabulaires et accents. Aucun remplacement du logo par une police.

## Catalogue Template First
Inventorier le template gratuit Studio Admin et ses dépendances avant installation. Réutiliser shadcn : Button, Input, Select, Checkbox, Radio, Switch, Tabs, Badge, Card, Table, Dialog, AlertDialog, Sheet, DropdownMenu, Command, Tooltip, Popover, Calendar, Skeleton, Alert, Sonner et primitives de navigation selon disponibilité. Ne pas installer tout le catalogue sans besoin. Compositions : PageHeader, DataTable, FilterBar, EntityDetailLayout, FormSection, FormStepper, StatusBadge, InfoTooltip, CurrencyInput, MoneyDisplay, DocumentViewer, ActivityTimeline, EmptyState, ErrorState, ConfirmDialog, UnsavedChangesGuard. Les composants non nécessaires au socle restent au catalogue, sans faux workflows. Documenter variantes, focus, disabled, pending, invalid, readonly, mobile et exemples dans une galerie dev.

## Patterns
Listes : recherche, filtres URL, tri, pagination, retour conservant contexte ; vues sauvegardées, colonnes, bulk et export seulement selon spécification. Détail : titre, résumé, actions autorisées, onglets, historique réel. Formulaires : labels, validation serveur, erreurs associées, garde modifications non sauvegardées ; brouillons et reprise selon contrat. Dialog court, sheet contextuel, page pour workflow long.

## Graphiques financiers
Recharts via template/shadcn si compatible. Line/area pour tendances, barres pour comparaisons, stacked pour composition, donut pour peu de catégories, barres horizontales pour immeubles, sparkline KPI, progress occupation. Série principale Épinette light / Ambre dark ; comparaison #C7DCD3 / #665634 avec motifs, libellés ou styles distincts. Axes discrets, unités/devise/période explicites, barres à zéro, pas de 3D ni gradients décoratifs. Alternative tabulaire accessible, tooltip clavier/tactile, données manquantes distinctes de zéro. Ne jamais inventer une formule ou assimiler loyer dû et paiement reçu.

## Feedback
Skeleton de structure stable, actualisation conservant données existantes, spinner local au bouton et prévention double soumission, progression réelle si disponible. Empty state distingue absence de données et filtres sans résultat. Erreur récupérable avec retry sûr, erreur bloquante persistante, erreurs de champs inline. Toast neutre avec icône sémantique ; annoncer via live region adaptée. Aucune confirmation optimiste financière ; attendre confirmation backend. Ne pas bloquer tout le shell pour une section.

## Authentification publique
Split screen 55/45 : formulaire blanc/noir à gauche, panneau illustratif pastel/noir légèrement inset à droite, architecture minimaliste, slogan officiel. Logo réel en haut, FR/EN et thème, liens confidentialité et conditions sur tous les écrans publics. Mobile : formulaire pleine largeur, panneau masqué, safe areas. Connexion : courriel, mot de passe selon IdP, récupération, lien inscription. Inscription : prénom, nom, courriel, téléphone facultatif avec indicatif international, mot de passe selon IdP, conditions et lien confidentialité, retour connexion. Normaliser téléphone E.164 si fourni ; pas de SMS obligatoire. Consultation juridique sans perdre formulaire (ne jamais persister le mot de passe). Pas de rôle ni organisation à l'inscription. OAuth/OIDC selon IdP réel. Aucun faux fournisseur social. Illustrations originales non assimilées au logo ; pas de photos génériques, faux témoignages ni gros gradients.

## Validation visuelle
WCAG 2.2 AA : clavier, focus non masqué, labels, erreurs associées, zoom 200%, reflow 320px, reduced motion, cibles tactiles recommandées 44px. Matrice 1440/1280/768/390/320px, FR/EN et light/dark. Captures dashboard, liste/détail, auth, configuration, galerie et états. Playwright Test + axe-core, contrôle manuel clavier et contrastes ; axe seul ne certifie pas AA. Tests WebView natifs ultérieurs.
