# Agenda : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).
Chaque version a sa section ; elle devient les « Nouveautés » affichées dans le catalogue.

## [Non publié]

## [0.2.6] — 2026-10-26

### Modifié

- Trajets : le point de départ (un domicile ou la position GPS) se règle dans Paramètres → Trajets ; le bloc Trajet ne garde que les adresses des lieux et les prochains trajets.
- Un trajet de plus de 4 h est ignoré (adresse sûrement mal trouvée) ; le calcul se refait toutes les 30 min pour aujourd'hui et demain.

## [0.2.5] — 2026-10-16

### Modifié

- En-tête : un seul grand bouton « Ajouter un événement », centré. L'export .ics et le bouton Paramètres de la page disparaissent (les réglages s'ouvrent depuis la roue de la barre de titre).

## [0.2.4] — 2026-10-16

### Modifié

- Un événement qui commence à minuit (jour de réserve entier) ne crée plus de « Préparation » ni d'heure de lever avancée.


## [0.2.3] — 2026-10-16

### Modifié

- **Repos légal** : les jours de réserve (à la base jour et nuit) ne comptent plus dans le repos légal de la semaine.

## [0.2.2] — 2026-10-15

### Modifié

- **Les événements posés par l'assistant se modifient** comme les tiens : un clic sur l'événement ouvre sa fiche (modifier, supprimer)

## [0.2.1] — 2026-10-15

### Ajouté

- **Supprimer n'importe quel événement** depuis la journée : un bouton ✕ (puis « Supprimer ? ») sur chaque événement, y compris ceux posés par un autre plugin ou par l'assistant. Un événement qui vient de Travail revient tant qu'il n'est pas supprimé dans Travail.
- **Calculer le trajet** d'un événement d'après son adresse, avec la circulation prévue (clé TomTom dans Paramètres → Trajets), et **Ouvrir dans Waze**.

### Modifié

- **Widgets** : les petites tailles resserrent le texte.

### Ajouté

- **Widgets** « Aujourd'hui » et « Coucher conseillé » pour l'accueil ; le bloc « Repos légal » est retiré de la page Calendrier ; boutons à pictogrammes cohérents.

### Modifié

- **Calendrier** : le mois sans vide sur les côtés, la journée en cartes pleine largeur, « Objectif » et « Moyenne » plus gros, coucher conseillé mis en évidence ; la page utilise l'icône « calendrier » de Quotidien.

### Modifié

- **Calendrier** : quadrillage des ronds à écarts égaux, grille de sommeil pleine largeur (le nombre de semaines suit la place), « Objectif » et « Moyenne » alignés, bloc Trajet plus étroit, barre de la journée plus large.

### Modifié

- **Rappels** : la page n'apparaît plus dans le menu de Quotidien (les rappels continuent de fonctionner).

## [0.2.0] — 2026-10-08

### Modifié

- **Calendrier refait** : le mois en ronds (une couleur par type de contrat : intérim, réserve, CDD, CDI ; bordure sur aujourd'hui ; la légende ne montre que les contrats que vous avez) et, à côté, la journée choisie du lever au coucher estimé (préparation, trajet, travail, trajet retour, temps libre), avec des flèches pour changer de jour. Un bloc de travail montre le temps de travail du contrat, pas la durée entre le début et la fin.
- **« + Événement »** ne crée que des événements quelconques (nom, adresse, jour, heures, trajet, répétition) ; les contrats viennent de Travail. Un événement saisi ici se modifie en cliquant sur son bloc.
- **Deux événements proches** (moins de 90 minutes, réglable) s'enchaînent : un trajet direct, sans retour à la maison ni nouvel aller.
- **Les réglages de la chronologie sont des paramètres du moteur** (Paramètres → Agenda) : préparation, mise en route, marge d'arrivée, majoration du trajet, enchaînement, cible de sommeil, rappels.
- Les événements portent un type de contrat et un temps de travail du contrat (facultatifs, remplis par Travail).

### Ajouté

- **Sommeil** : la grille des nuits (rouge → vert selon la cible), le sommeil moyen sur 30 jours et « Je vais dormir maintenant » qui note le coucher.
- **Trajet** : « Je suis parti » et « Je suis arrivé ». Le logiciel devine de quel trajet de la journée il s'agit d'après l'heure et refuse un bouton hors de propos (déjà parti, pas encore parti, prochain trajet dans plus d'une heure). Les heures réelles sont gardées.
- **Repos légal** de la semaine en une ligne : total, plus longue journée, plus court repos entre deux journées.