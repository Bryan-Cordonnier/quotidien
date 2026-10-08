# Travail : journal des changements

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## [Non publié]

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