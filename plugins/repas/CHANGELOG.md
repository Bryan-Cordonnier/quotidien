# Repas et recettes : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).
Chaque version a sa section ; elle devient les « Nouveautés » affichées dans le catalogue.

## [Non publié]

## [0.3.0] — 2026-10-16

### Modifié

- Le plugin s'appelle **Repas**. La page s'ouvre sur les recettes : bouton **Concocter** bien visible (les questions s'enchaînent, puis « Retour aux recettes »), recherche, **favoris** (étoile), assiette **« Ce que je mange »** (moyenne par portion des repas concoctés), toutes les recettes par rayon.
- **Ajouter cette recette aux courses** (dans la fiche) : l'IA compare avec la liste ouverte de Courses (ingrédients en commun, quantités à changer, ce qui manque), montre ce qui change, puis l'écrit après validation.
- Valeurs nutritionnelles par portion : données par l'IA pour les recettes concoctées, « Estimer les valeurs » pour les autres.
- Les ustensiles sont un réglage (Paramètres → Repas). Les prix relevés s'ouvrent depuis l'en-tête.


## [0.2.0] — 2026-10-16

### Modifié

- **Concocter est un onglet de Recettes** (plus de page à part) : il crée plusieurs recettes d'un coup à partir de vos réglages.
- **Invités repas par repas** : chaque jour a sa carte, chaque repas son interrupteur et son bouton « + invité » ; « Absent » vide une journée, « tous / aucun » règle tous les midis ou tous les soirs.
- **Nouvelle étape « En cuisine »** : temps pour cuisiner en semaine et le week-end, niveau, restes, gamelle les midis, préparation le week-end.
- Budget plus lisible (budget Courses, habituel, visé et prix par part).

### Ajouté

- **Aperçu de la bibliothèque** : nombre de recettes, temps moyen, recettes rapides, répartition par rayon (anneau) et coût par part des plans (courbe).

## [0.1.0] — 2026-10-16

### Ajouté

- **Concocter** : un questionnaire pas à pas (premier jour et nombre de jours, chaque repas — petit-déjeuner, midi, soir — et pour combien de personnes, le budget, vos envies), puis l'IA propose les plats et la liste de courses. Les prix et le magasin le moins cher pour toute la liste sont calculés avec vos prix (tickets de Courses et prix relevés). Une semaine avec beaucoup d'invités est reconnue comme exceptionnelle : le budget suit le nombre de parts.
- **Recettes** : une bibliothèque rangée par rayons, avec recherche, fiches (ingrédients, ustensiles, étapes, notes), et la liste de courses de recettes cochées, chiffrée au magasin le moins cher.
- **Mes ustensiles** : l'IA ne propose que ce qu'on peut cuisiner avec.
- **Prix relevés** : les prix trouvés ailleurs que sur les tickets (par Max ou par recherche) complètent ceux de Courses.
- Les listes partent dans Courses d'un clic. Si le plugin Santé est installé, ses objectifs sont pris en compte.
