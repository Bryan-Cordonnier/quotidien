# Quotidien : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).
Chaque version a sa section ici avant d'être publiée : ce texte devient la Release GitHub et le message de mise à jour affiché dans l'application.
Les changements propres à un plugin sont dans `plugins/<id>/CHANGELOG.md`.

## [Non publié]
## [0.1.2] — 2026-10-09

### Ajouté

- **Un thème et une icône propres à Quotidien** : le thème « Jour » (sable et corail) et le thème « Nuit » (violet et orange), choisis par « Comme Windows » ou à la main dans Paramètres → Apparence, un logo dans la colonne et une nouvelle icône d'application (un soleil qui se lève). Les thèmes sont fixes : on ne peut pas en importer.

### Modifié

- **La page Plugins n'est plus dans le menu** : les plugins de Quotidien sont fixes ; ils restent visibles dans Paramètres → Plugins installés.
- **Les réglages de l'aperçu rapide sont dans « Raccourcis clavier ».**
- **Calendrier** : le quadrillage des ronds a le même écart entre les colonnes et entre les lignes ; la grille de sommeil remplit toute la largeur (plus de carrés quand le menu est replié) ; « Objectif » et « Moyenne » sont alignés l'un sous l'autre ; le bloc Sommeil est plus large et le bloc Trajet plus étroit ; la barre de la journée est plus large.
- **Mes finances** : les prochains paiements sont à droite de la courbe ; le bloc « Ajouter » (prix, libellé, et deux gros boutons + vert et − rouge) remplace « Ajustement rapide » ; « Recaler » se réduit à un prix et un bouton coloré.

## [0.1.1] — 2026-10-08

### Modifié

- **Le menu ne garde que les cinq pages prévues** : Calendrier, Courses, Liste de courses, Mes finances et Travail. Les anciennes pages Tableau de bord, Courbe du mois, Prévisions et Rappels sont retirées du menu ; les plugins Finances, Budget et Agenda continuent de travailler en coulisses.

## [0.1.0] — 2026-10-08

Première version publiée : l'application se met à jour toute seule à partir de celle-ci.

### Ajouté

- **Mes finances** : l'estimé de la vie courante, « jusqu'à quand je tiens », la courbe des prochains jours, les prochains paiements, l'ajustement rapide, le recalage sur le solde réel, et un widget d'accueil.
- **Travail** : contrats, bulletins, historique et agences ; les missions sont transmises au Calendrier et à Budget.
- **Courses** : budget par semaine, tickets, listes de courses à régler.
- **Calendrier** : mois, journée, sommeil, trajets et repos légal.
- **Accueil à widgets** : le tableau de l'accueil se modifie (ajout, déplacement, taille, retrait).
- **Catégories** : Paramètres → Apparence, « Ranger les pages par catégories » (Argent, Temps).
- **Mises à jour automatiques** : Quotidien cherche une nouvelle version au démarrage et propose de l'installer ; rien ne s'installe sans votre clic.

[Non publié]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Bryan-Cordonnier/quotidien/releases/tag/v0.1.0
