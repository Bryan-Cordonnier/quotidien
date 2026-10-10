# Quotidien : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).
Chaque version a sa section ici avant d'être publiée : ce texte devient la Release GitHub et le message de mise à jour affiché dans l'application.
Les changements propres à un plugin sont dans `plugins/<id>/CHANGELOG.md`.

## [Non publié]

## [0.1.15] — 2026-10-10

### Modifié

- **Accueil du téléphone plus soigné** : le logo et le nom sont centrés, chaque page est une carte avec le nom de son plugin, la date du jour s'affiche.
- **Paramètres sur téléphone** : d'abord la liste des sections, puis la section en plein écran.
- **Icônes** : les dessins sont plus grands dans leur pastille, et les icônes Paramètres et Panneau latéral reprennent le style de Quotidien.
- **Boutons du téléphone** : tous font au moins 44 px, et les fenêtres se ferment avec une croix ronde.
- **Icône Android** : le Q est plus petit, sa barre n'est plus coupée et le fond se voit.

## [0.1.14] — 2026-10-10

### Ajouté

- **Mise à jour de l'application Android** : au démarrage (et dans *Paramètres → À propos*), Quotidien cherche une nouvelle version ; un bandeau propose de la télécharger, puis il suffit d'ouvrir le fichier pour installer par-dessus, sans perdre ses données. L'APK est désormais signé avec une clé fixe : **cette version-ci demande de désinstaller l'ancienne une dernière fois**.

### Corrigé

- Liste de courses : le message « Créez-en une à gauche » ne dépend plus de la disposition (téléphone).

## [0.1.13] — 2026-10-10

### Modifié

- **Une interface pensée pour le téléphone** : l'accueil est une liste des pages, comme une messagerie (le nom de l'application en haut, les pages au centre, les paramètres en bas). Une page s'ouvre en plein écran ; le geste « retour » d'Android ou la flèche revient à la liste. Plus de panneau latéral, plus de recherche en haut, et les fenêtres (scanner, réglages…) occupent tout l'écran.
- **Le titre des pages est centré**, sur PC comme sur téléphone, et les blocs sont mieux centrés sur téléphone.
- **L'icône de l'application Android est le logo Quotidien.**

## [0.1.12] — 2026-10-10

### Ajouté

- **Reliez Quotidien à votre serveur** (PC et téléphone) : *Paramètres → Serveur*, saisissez l'adresse, l'identifiant et le mot de passe. Vos calculs et les données de vos plugins sont alors gardés sur le serveur, avec une copie sur l'appareil qui repart au serveur dès que la connexion revient ; le PC et le téléphone voient les mêmes données. Les plugins, la clé IA et les réglages de l'appareil restent sur l'appareil.
## [0.1.11] — 2026-10-09

### Ajouté

- **Le magasin le moins cher pour votre liste** : écrivez des choses simples (« Lait cru 1L », « salade », « coca », « 2 pâtes ») ; Quotidien retrouve ces articles dans vos tickets scannés (hors budget compris), estime le prix de chaque ligne et conseille le magasin le moins cher pour toute la liste, avec le total estimé et celui des autres magasins. Le prix de chaque article s'affiche à côté (« ≈ 1,10 € »), la liste des listes montre le total estimé et le magasin, et « Régler la course » propose d'abord le magasin conseillé. Tout est calculé sur votre PC, sans IA ni internet ; un article jamais vu sur un ticket n'est pas chiffré.
## [0.1.10] — 2026-10-09

### Corrigé

- **Le titre en haut de l'application était cassé** : l'icône de la page se plaçait au-dessus du titre et était coupée. Le titre et son icône sont de nouveau sur la même ligne, dans la barre.
## [0.1.9] — 2026-10-09

### Ajouté

- **Proposer des repas avec l'IA** (Courses ou Liste de courses → « Proposer des repas (IA) ») : on indique le nombre de personnes, de repas, le budget (proposé : ce qu'il reste cette semaine) et ses envies. L'IA part d'abord de vos données (les articles et prix déjà vus sur vos tickets, hors budget compris), puis, si la case est cochée, cherche sur internet les recettes et les prix qui manquent. Elle propose des plats avec leurs ingrédients ; le total se compare au budget en direct, on retire les plats qu'on ne veut pas, « Autre proposition » en donne d'autres, « Moins cher » refait une proposition quand le budget est dépassé. « Créer la liste de courses » fusionne les ingrédients (un même ingrédient n'apparaît qu'une fois, ses quantités s'additionnent) dans une nouvelle liste.
## [0.1.8] — 2026-10-09

### Ajouté

- **Tickets hors budget** (Courses → Tickets → « Hors budget ») : on scanne un ticket uniquement pour garder ses articles et leurs prix, sans que la dépense compte dans les courses de la semaine, les moyennes ni le budget transmis à Budget. La case « Hors budget » se coche aussi au moment de vérifier un ticket scanné normalement. Ces tickets portent une pastille « hors budget » et un compteur indique combien d'articles ont été gardés pour les prix.
## [0.1.7] — 2026-10-09

### Corrigé

- **La clé Gemini n'était pas acceptée** : les clés récentes de Google contiennent un point (`AQ.…`) et étaient refusées avant même d'être essayées. Toute clé collée est maintenant acceptée (les guillemets collés avec elle sont retirés) ; c'est Google qui dit, avec « Essayer », si elle fonctionne.
## [0.1.6] — 2026-10-09

### Ajouté

- **Scanner un ticket de caisse** (Courses → Tickets → « Scanner un ticket ») : on prend le ticket en photo (ou on choisit un fichier), l'IA lit le magasin, la date, le total et les articles, puis vous vérifiez et corrigez avant d'enregistrer. Le ticket entre dans le budget de la semaine ; un avertissement signale quand le total ne correspond pas à la somme des lignes. Le bouton « Détail » d'un ticket montre ses articles. La photo n'est pas conservée.
- **Intelligence artificielle** (Paramètres → Intelligence artificielle) : on colle sa clé Gemini (gratuite, créée sur aistudio.google.com), on choisit le modèle et on « Essaie » ; la clé reste sur ce poste. La page explique ce qui part chez Google.
- **L'aperçu rapide montre vos widgets** au lieu des favoris : un clic sur un widget ouvre sa page dans Quotidien.
## [0.1.5] — 2026-10-09

### Ajouté

- **Une icône pour l'Accueil**, dans le même style que celles des autres pages, avec une pastille violette.
- **L'accueil n'a plus de limite** : on peut ajouter autant de widgets qu'on veut (Accueil → Modifier → Ajouter un widget, ou la case « Ajouter un widget » au bout de la grille), et poser plusieurs fois le même ; le widget « Un compte » garde son propre compte pour chaque exemplaire.
- **Chaque widget montre l'icône de son plugin** dans un coin.

### Modifié

- **Le logo et l'icône d'application** : un Q blanc seul sur le fond violet, dont la barre découpe l'anneau (plus de soleil orange).
- **Déplacer un widget est plus naturel** : il suit la souris, les autres se serrent pour lui faire de la place, et l'accueil défile quand on approche du haut ou du bas ; les poignées des bords sont plus grandes.
- **Les widgets ont été vérifiés dans chacune de leurs tailles** : la courbe de l'argent épouse maintenant exactement sa case (elle débordait dans les petites tailles) et les petits widgets resserrent leur texte.
## [0.1.4] — 2026-10-09

### Ajouté

- **Des widgets pour presque toutes les pages** (Accueil → Modifier → Ajouter un widget) : l'argent actuel, jusqu'à quand je tiens, l'argent d'un compte au choix, la courbe de l'argent, les prochains paiements, le budget des courses, la liste de courses (un clic l'ouvre en grand), la journée du jour, le coucher conseillé et la mission en cours.
- **L'accueil se modifie comme l'écran d'un téléphone** : on clique sur un widget pour le sélectionner, on le déplace à la souris, on tire ses bords ou son coin pour le redimensionner, on le retire avec sa croix.
- **Un logo Quotidien dans l'application** : le même Q que l'icône, dans la colonne de gauche ; les icônes des pages et leurs couleurs reprennent la palette du logo (corail, violet, or).

### Modifié

- **Plus d'onglets** : une seule page à la fois ; la barre du haut montre le titre de la page, la recherche et les boutons de la fenêtre.
- **Une icône d'application retravaillée** : la barre du Q est blanche, aux bouts arrondis, comme l'anneau.
- **Des boutons cohérents** : les +, −, ✓, ×, flèches et triangles sont tous dessinés avec le même trait.
- **Calendrier** : le bloc « Repos légal » est retiré.
- **Mes finances** : « Jusqu'à quand je tiens » montre la date de fin en grand, en toutes lettres (« jusqu'au vendredi 17 octobre ») ; les boutons + et − de « Ajout » sont plus petits.
- **Liste de courses** : à gauche on crée une liste ; à droite « Mes listes » ne contient que la liste des listes en cours, qu'on ouvre en grand pour la consulter, la modifier et la régler ; les listes réglées restent en bas.
## [0.1.3] — 2026-10-09

### Ajouté

- **Une nouvelle icône d'application et des icônes de pages dans le même style** : un Q flat avec un soleil levant (l'icône de l'application et le logo de la colonne), et des icônes en aplats pour Calendrier, Courses, Liste de courses, Mes finances et Travail.

### Modifié

- **Calendrier** : le mois n'a plus de vide à droite et à gauche (le bloc épouse le quadrillage, les marges sont les mêmes tout autour) ; la journée est faite de cartes pleine largeur teintées de la couleur du contrat, au lieu d'une fine barre ; « Objectif » et « Moyenne » sont plus gros et en blanc ; le coucher conseillé ce soir est mis en évidence dans un encadré.
- **Mes finances** : « Ajout », « Recalage » et « Mes comptes » forment une même rangée de trois blocs de même forme (titre, une ligne d'explication, contenu) ; les boutons + et − sont plus petits.
- **Liste de courses** : « Listes en cours » et « Nouvelle liste » sont côte à côte sur grand écran.
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

[Non publié]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.11...HEAD
[0.1.11]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.10...v0.1.11
[0.1.10]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.9...v0.1.10
[0.1.9]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Bryan-Cordonnier/quotidien/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Bryan-Cordonnier/quotidien/releases/tag/v0.1.0
