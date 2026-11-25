---
name: escalia-assist-expert
description: Concevoir, implémenter et maintenir le widget Escalia Assist, son accessibilité, ses ressources d'aide et ses futurs adaptateurs de conversation, sans inventer de service actif.
---
# Escalia Assist Expert
Lire AGENTS.md, le design system, l'architecture, les skills UI et observabilité et la spécification Assist avant toute modification. Inspecter les composants existants ; réutiliser shadcn, Lucide, Barlow et les tokens. Nom technique Escalia Assist ; rendu de marque Escalîa Assist avec le chapeau ambré officiel sur le i, via le logo officiel non modifié et un suffixe Assist. Ne pas recréer le logo.

## Expérience
Launcher flottant 56 px en bas à droite, Épinette en clair, Ambre en sombre ; tooltip traduit, focus visible, aucune ouverture automatique ni faux badge. Panneau desktop 360–380 px, hauteur maximale 560 px adaptée au viewport ; mobile Drawer/Bottom Sheet, safe areas, clavier, 100dvh. Ne pas masquer les actions essentielles. Escape, retour du focus, navigation clavier, reduced motion, WCAG 2.2 AA. FR/EN, Barlow, thèmes existants.
Accueil, centre d'aide, FAQ, contact, conversation future. Afficher uniquement des ressources réelles ou explicitement démonstratives. Pas de faux agent en ligne, de délai de réponse inventé, de faux succès d'envoi. Pas de champ conversation actif sans fournisseur réel. Sur pages publiques, aucun contexte privé. Réinitialiser état sensible à la déconnexion ou au changement de périmètre.

## Architecture
Feature-first, montage unique dans les layouts concernés ; composants Launcher, Panel, Header, Home, ResourceView, Conversation selon besoin. Provider local seulement si utile. Contrats typés et adaptateur futur sans SDK ni backend fictif. Toute intégration future passe par BFF, autorisation serveur, isolation tenant, validation, limites et politique de confidentialité approuvée. Aucun secret client, aucun LLM ni transmission externe au stade socle. Ne pas envoyer automatiquement le contexte de page ou les données métier.

## Observabilité et validation
Logs techniques utiles uniquement, selon skill observabilité ; jamais contenu conversationnel, PII, tokens ou payloads. Pas de tracking ni cookie supplémentaire sans justification. Tester ouverture/fermeture, focus, navigation, thèmes, locales, mobile, clavier, absence de chevauchement et de requêtes externes. Rapporter tests réellement exécutés, limites et écarts. Ne pas élargir le périmètre métier.
