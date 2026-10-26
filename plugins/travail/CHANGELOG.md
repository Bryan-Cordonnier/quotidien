# Travail : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## [Non publié]

## [0.4.2] — 2026-10-26

### Ajouté

- Agence : « Jour de paie (du mois) ». La paie d'une mission tombe ce jour-là, le mois suivant (jour ouvré suivant si week-end ou férié).

## [0.4.1] — 2026-10-16

### Modifié

- Calendrier de la mission de réserviste au style de l'Agenda : un clic = réserve (vert clair), deux clics = hors base (vert foncé), trois clics enlèvent le jour.
- Le bouton « Nouvelle mission » du haut et le bouton Paramètres de la page disparaissent.

## [0.4.0] — 2026-10-16

### Modifié

- Mission de réserviste : les jours se cochent sur un calendrier mois par mois ; des jours qui ne se suivent pas sont refusés (deux missions : « Partie 1 », « Partie 2 »).
- Paie de réserve : chaque jour vaut le solde imposable (60 € par défaut) ; un jour hors base ajoute une prime non imposable (38 € par défaut). Le réglage « solde hors base » disparaît.
- « Prochaine mission » et le widget comptent la réserve ; une réserve en cours s'affiche dans « Mission en cours ».


## [0.3.0] — 2026-10-16

### Modifié

- **Réserve refaite : une seule « mission de réserviste »** du premier au dernier jour. Tu arrives à la base le premier jour (heure d'arrivée), tu en pars le dernier jour (heure de départ) et tu y restes jour et nuit entre les deux. Chaque jour est un jour payé, quelle que soit l'heure : les heures servent uniquement à l'emploi du temps. Tu choisis, jour par jour, ceux passés à la base ou hors base.
- **Paie de réserve par jour** : un jour à la base vaut un solde imposable (60 € par défaut) plus une indemnité non imposable (38 € par défaut) ; un jour hors base vaut le solde de la grille du soldat (à régler). Les trois montants se règlent dans Paramètres → Travail.
- **Ma base** : son nom et son adresse se règlent dans Paramètres → Travail ; l'adresse devient le lieu des jours à la base dans l'agenda.
- **Agenda** : la mission donne un événement par jour (arrivée, jours à la base, départ). Les anciennes périodes se relisent comme des missions.
- Les réglages « temps de travail d'un jour de réserve » et « indemnité hors base » disparaissent (remplacés par les montants ci-dessus).

## [0.2.2] — 2026-10-15

### Modifié

- **Jours de réserve** : une période se règle du premier au dernier jour (avec ou sans les week-ends), avec l'heure à laquelle tu arrives à la base et l'heure à laquelle tu pars. Ces heures servent uniquement à l'emploi du temps : un jour de réserve est payé au tarif du jour, même si tu arrives à 11 h. Les heures des paramètres restent les valeurs par défaut.
- **Modifier** une période de réserve et un contrat CDI/CDD (comme une mission) : bouton « Modifier » sur chaque ligne.

## [0.2.1] — 2026-10-15

### Corrigé

- **Jours de réserve de minuit à minuit** : régler le même horaire au début et à la fin d'un jour de réserve (par exemple 00:00 et 00:00) donne maintenant une journée entière dans le calendrier, au lieu d'une erreur.

### Ajouté

- **Bulletin estimé** dans la fenêtre du bulletin : heures, majorations, IFM, congés, cotisations, net, à comparer au vrai bulletin, et à enregistrer en PDF.

### Ajouté

- **Widget « Mission »** pour l'accueil ; flèches de réglage du temps dessinées avec les pictogrammes du kit.

### Modifié

- **Icône « travail » de Quotidien** pour la page Travail.

## [0.2.0] — 2026-10-08

Paie devient **Travail**. Les montants restent des **estimations** : tous les taux sont des paramètres, à confirmer sur un vrai bulletin.

### Modifié

- **Une page, deux blocs, un onglet par contrat.** En haut : la mission en cours (jours faits sur le total, temps de la semaine en grand, date de la prochaine paie) et la prochaine mission ; dessous, les onglets Intérim, Réserve, CDD et CDI avec les trois derniers contrats et un historique complet dans une fenêtre.
- **Seuls les contrats signés** : le statut (prévue, en cours, terminée) suit les dates ; il n'y a plus de mission « proposée ».
- **Les taux sont des paramètres du moteur** (Paramètres → Travail) et ne sont plus enregistrés avec les données. Les données de l'ancienne version (Paie) se relisent toutes seules.
- **Poste — Entreprise** remplace le simple libellé d'une mission ou d'un contrat.

### Ajouté

- **Heures en plus** : des flèches pour régler un temps (heures, minutes par 5) puis « + » ; on peut en ajouter autant de fois qu'on veut dans la semaine, elles sont payées en heures supplémentaires.
- **Agences** : un nom, des cotisations (ou celles des paramètres) et un rythme de paie (à la fin, chaque mois, chaque semaine). Le taux horaire reste propre à chaque mission.
- **Panier repas, déplacement et trajet** par mission : les deux premiers s'ajoutent au net (sans cotisations), le trajet sert à l'heure de départ de l'agenda.
- **Bulletin par mission** : le net reçu se saisit sur la ligne (et peut s'ajouter dans Finances) ; l'écart avec l'estimé alimente la **précision moyenne** des estimations.
- **Réserve et CDD/CDI dans l'agenda** : chaque jour travaillé porte son type de contrat et le temps de travail du contrat (la pause n'est pas comptée).