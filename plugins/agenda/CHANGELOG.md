# Agenda : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).
Chaque version a sa section ; elle devient les « Nouveautés » affichées dans le catalogue.

## [Non publié]

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