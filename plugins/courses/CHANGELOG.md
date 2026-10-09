# Courses : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- **Widgets** « Budget des courses » et « Liste de courses » pour l'accueil ; la page Liste de courses : création à gauche, liste des listes à droite (ouverture en grand), listes réglées en bas.

### Modifié

- **Liste de courses** : « Listes en cours » et « Nouvelle liste » côte à côte sur grand écran ; icônes « courses » et « liste » de Quotidien.

## [0.1.0] — 2026-10-08

Première version.

### Ajouté

- **Page Courses** : le budget disponible de la semaine (jauge orange puis rouge), l'ajout d'un ticket (magasin facultatif, montant), les euros moyens dépensés par mois, les quatre dernières semaines et la semaine en cours avec leur moyenne (« Voir tout » : mois, année ou depuis le début), les derniers tickets.
- **Page Liste de courses** : on crée une liste (un nom, des articles) ; elle apparaît dans « Listes en cours », où le nom et les articles se modifient sur place, chaque article se coche (« dans le caddie ») et se retire. « Régler la course » enregistre le montant payé comme un ticket du budget et verrouille la liste ; elle reste consultable dans l'historique. Un article non coché n'empêche jamais de régler.
- **Paramètres** (Paramètres → Courses) : budget par semaine, jour des courses, seuil d'alerte de la jauge, report du budget non dépensé.
- **Budget** : la dépense prévue des quatre prochaines semaines est annoncée à Budget le jour des courses (le reste du budget pour la semaine en cours, le budget entier pour les suivantes). Sans Budget, tout le reste fonctionne.