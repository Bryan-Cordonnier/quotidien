# Cahier des charges — Gestion personnelle (budget + calendrier)

Version 0.1 — 3 octobre 2026
Utilisateur principal : Bryan (18 ans, Orthez). Second utilisateur prévu : colocataire (v2).

---

## 1. Contexte et objectifs

**Situation (oct. 2026)** : bac pro chaudronnerie obtenu, entreprise individuelle Retux (reconditionnement et revente de PC, réparations) créée en juin 2026, CA proche de 0. Arrêt du BTS CRCI. Contrat de réserviste (Armée de terre) de 5 ans, formation du 17 au 30 octobre 2026. Revenus visés : intérim (chaudronnerie) + jours de réserve + Retux à terme. Épargne actuelle : ~0 €. Logé chez sa mère.

**Objectifs de vie (à piloter par l'app)**
1. Constituer un matelas de **6 000 €** (palier intermédiaire 4 000 €) avant un déménagement en colocation (T3) **entre mars et avril 2027, au plus tard**.
2. Ensuite investir chaque mois, selon la marge réelle : PEA, puis Retux (≥ 1 PC/mois).
3. Savoir à tout instant combien de mois tenir sans travailler.
4. Gérer son temps à l'heure près (missions, trajets, sommeil, rendez-vous).

**Principe directeur** : l'app ne doit jamais donner un chiffre qui flatte. Les décisions (investir, accepter une mission) reposent sur le scénario **pessimiste**.

---

## 2. Périmètre

### Inclus (v1 → v2)
Calendrier détaillé, missions d'intérim et jours de réserve avec calcul de net, coût de vie, runway, prévision mensuelle et recommandation d'allocation, foyer à deux, suivi Retux, suivi voiture, documents.

### Exclus (pour l'instant)
- Liste de courses avec prix réels de magasin (pas d'API publique fiable ; forfait nourriture mensuel en v1).
- Connexion bancaire directe (import CSV à la place).
- Choix de supports d'investissement (l'app calcule un montant, pas un conseil financier).
- Optimisation automatique de journée par IA.

---

## 3. Utilisateurs et sécurité

- Comptes individuels (2 prévus). Données **privées par défaut** ; seules les dépenses du foyer sont partagées.
- Hébergement sur le serveur personnel (Proxmox VE) : conteneur ou VM dédié.
- Accès uniquement via VPN (WireGuard ou Tailscale). Aucune exposition directe sur Internet.
- Chiffrement des documents (contrats, bulletins). Sauvegardes automatiques quotidiennes avec test de restauration.
- Interface en français, thème **sombre** par défaut, animations fluides, code couleur par type d'événement.

---

## 4. Module Calendrier et planning

### 4.1 Types d'événements (couleurs distinctes)
Intérim · Réserve · Retux (blocs de travail) · Rendez-vous · Perso · Sommeil · Trajet (généré, non éditable).

### 4.2 Saisie d'une mission d'intérim
Champs : agence, entreprise utilisatrice, **lieu** (adresse géocodée), période, jours travaillés (sélection sur le calendrier), heures de début et de fin par jour, durée de pause (non payée), taux horaire brut, taux d'heures supplémentaires (propre à la mission), heures contractuelles par semaine, statut (prévu / confirmé / terminé).
→ Génère les journées du calendrier **et** les revenus prévisionnels (module Paie).

### 4.3 Saisie d'une période de réserve
Champs : lieu (base ou hors base), jours sélectionnés sur le calendrier, heure d'arrivée, heure de départ, tarif journalier imposable (défaut 60 €), indemnité journalière non imposable hors base (défaut 38 €), statut (probable / confirmé).
→ Affiche le net exact estimé et décrémente le compteur annuel de jours (objectif ~50 j/an).

### 4.3 bis Planning annuel de réserve et week-ends
- Saisie possible d'un **planning annuel** (jours connus à l'avance), jour par jour ou en lot, avec statut probable / confirmé.
- Jours de réserve sur **week-end** autorisés ; ils comptent dans le compteur annuel et dans les alertes de repos (§4.9).
- Détection des conflits intérim / réserve (dont week-ends) et affichage du net perdu en intérim face au net gagné en réserve.

### 4.4 Ajustement ponctuel d'une journée
Exemple : « ce soir +1 h, comptée en heures supplémentaires ». Modifie l'horaire réel du jour et recalcule la paie.

### 4.5 Rendez-vous et événements
Titre, adresse, heure, durée estimée, marge d'avance (défaut 5–10 min, réglable par type), contacts éventuels.

### 4.6 Calcul de trajet
- Itinéraire calculé sur le serveur (OSRM ou OpenRouteService auto-hébergé) ; géocodage via l'API Adresse (api-adresse.data.gouv.fr).
- **Origine du trajet = lieu précédent dans le calendrier** : domicile par défaut, ou événement précédent si l'intervalle est trop court pour rentrer.
- Majoration heures de pointe paramétrable (pas de trafic temps réel en v1).
- Domicile versionné : adresse actuelle (Orthez), puis nouvelle adresse à partir d'une date de bascule.
- Trajet retour calculé de la même façon.

### 4.7 Règles de calcul des heures de départ et de coucher

Paramètres réglables (profils par type d'événement) :

| Paramètre | Défaut | Rôle |
|---|---|---|
| Marge d'arrivée | 10 min (mission) · 5–10 min (rdv) | Arriver en avance |
| Temps de mise en route | 10 min | Se chausser, clés, descendre, démarrer, GPS, décoller |
| Temps de préparation | à régler | Douche, habillage, petit-déjeuner |
| Durée de sommeil cible | 8 h | Besoin de sommeil |
| Temps d'endormissement | à régler | Délai pour s'endormir |
| Rappel avant « heure de départ » | 5 min | Pré-alerte |
| Rappel avant coucher | 30 min | Décrocher des écrans |

Formules (pour chaque jour avec un événement à lieu extérieur) :

```
heure_arrivée_visée   = heure_début − marge_arrivée
heure_départ_réel     = heure_arrivée_visée − temps_trajet(jour, origine → lieu)
heure_décision_partir = heure_départ_réel − temps_mise_en_route
heure_réveil          = heure_décision_partir − temps_préparation
heure_coucher         = heure_réveil − durée_sommeil − temps_endormissement
```

**Exemple** : début 8 h, marge 10 min, trajet calculé 30 min, mise en route 10 min.
→ arrivée visée 7 h 50 · départ réel 7 h 20 · **décision de partir 7 h 10**.

### 4.8 Rappels (notifications)
1. **« Tu dois partir dans 5 min »** : 5 min avant l'heure de décision de partir.
2. **« Tu dois partir maintenant »** : à l'heure de décision de partir.
3. **Rappel avant coucher** puis **« Va te coucher maintenant »** à l'heure de coucher calculée.
4. **Réveil** à l'heure calculée.
5. Même logique pour les rendez-vous (y compris client Retux), en partant du lieu précédent du calendrier.
6. Fin de pause, échéance d'abonnement, atteinte d'un palier d'épargne.

> Risque critique : ces alertes doivent sonner même app fermée et téléphone en veille. Voir §13, risque R1.

### 4.9 Alertes de repos et de charge
11 h de repos entre deux journées, 10 h par jour maximum, 48 h par semaine maximum. Alerte quand les blocs Retux ou les rendez-vous empiètent sur le sommeil cible.

### 4.10 Blocs Retux
Créneaux de reconditionnement et réparations placés entre les shifts, jamais sur le sommeil. Planification manuelle avec vérification automatique.

---

## 5. Module Paie (calcul du net)

Statuts de chaque montant : **prévu → confirmé → reçu**. Un montant a aussi une **date de paiement estimée** (intérim ~1 à 2 semaines, réserve ~1 à 2 mois).

### 5.1 Intérim
```
H_normales = heures ≤ seuil hebdomadaire (35 h par défaut, modifiable)
H_sup      = heures au-delà du seuil + ajustements « heures sup » manuels
brut_base  = H_normales × taux + H_sup × taux_sup (taux propre à la mission)
IFM        = 10 % × brut_base
CP         = 10 % × (brut_base + IFM)
brut_total = brut_base + IFM + CP
net        = brut_total × (1 − taux_cotisations)       // 22 % par défaut
```
Option : exonération partielle sur heures sup (paramètre, désactivée par défaut). La pause non payée est déduite.

### 5.2 Réserve
```
part_imposable     = tarif_jour (60 €)         → soumise à cotisations (taux réglable)
part_non_imposable = indemnité hors base (38 €) → non imposable, non cotisée
net_jour           = part_imposable × (1 − taux_cotis_réserve) + part_non_imposable
```
Seuls les jours **hors base** ouvrent droit à l'indemnité non imposable. Les montants exacts doivent être confirmés par le contrat ou la fiche de solde (voir §14).

### 5.3 Calibrage
À chaque bulletin ou fiche de solde reçu, l'utilisateur saisit le net réel. L'app compare à l'estimé, affiche l'écart, et permet d'ajuster les taux. Précision attendue avant calibrage : ±5 %.

### 5.4 Gain net par mission
`gain_net = net_estimé − carburant (km × conso C3 × prix) − usure (€/km réglable)`. Affiché avant l'acceptation d'une mission.

---

## 6. Module Trésorerie et coût de vie

- **Coût de vie mensuel** : loyer, charges, internet, nourriture (forfait en v1), assurance, carburant, téléphone, abonnements, provision voiture, divers. Chaque ligne a un type : fixe / variable, perso / foyer.
- **Réserve** : montant actuel, ajustable à tout moment avec **motif** (dépense imprévue), historique conservé.
- **Runway** : `réserve ÷ coût de vie mensuel` = mois tenables sans travailler. Trois scénarios : pessimiste, réaliste, optimiste (différents sur le coût de vie et les revenus de réserve).
- **Paliers d'objectifs** : 1 000 €, 4 000 €, 6 000 € (modifiables), avec date estimée d'atteinte d'après les missions planifiées et leur délai de paie. Distinction entre épargne **acquise** (gagnée) et **réelle** (reçue).
- **Simulateur de déménagement** : saisir un loyer, des charges, une date → runway et épargne mensuelle après déménagement.
- **Abonnements** : coût mensuel et annuel, date de renouvellement, option « à résilier », alerte.
- **Imprévus voiture** : provision dédiée, suivi du kilométrage et des échéances d'entretien (C3, 250 000 km).

---

## 7. Module Foyer (colocation)

- Création d'un foyer, invitation du colocataire.
- Dépenses **communes** (loyer, box, courses communes) et dépenses **perso**, séparées. Les abonnements perso restent perso.
- Règle de partage réglable : 50/50 ou au prorata des revenus.
- Soldes « qui doit quoi à qui » (type Tricount) et remboursements.
- Confidentialité : par défaut, le colocataire ne voit ni revenus, ni épargne, ni calendrier perso.

Dans la base de données dès la v1 ; interface livrée en v2.

---

## 8. Module Prévision mensuelle et allocation

Pour chaque mois :
```
reste_à_vivre = revenus_nets_prévus (statuts confirmés/prévus pondérés)
              − charges_fixes − budget_nourriture − budget_carburant
              − provisions (voiture, imprévus)
```
Ordre de priorité des affectations :
1. **Sécurité** : atteindre le matelas cible (6 000 € puis 3 mois de coût de vie).
2. **PEA**.
3. **Retux** (achat d'un PC).

Règles :
- Le calcul se fait sur le scénario **pessimiste** (ex. une mission s'arrête, un trou de 2 semaines).
- L'allocation n'est proposée que si le matelas cible est atteint à l'issue du mois.
- Sortie texte : *« Ce mois : 150 € PEA et 100 € Retux possibles »* ou *« Mois tendu : limiter la nourriture, aucun investissement »*.
- Hors v1 : rendement, choix de supports, conseil fiscal.

---

## 9. Module Retux

- Comptes et budget **séparés** du personnel.
- Fiche par PC : prix d'achat, pièces, temps passé, prix de vente, marge réelle, délai de vente.
- Réparations / prestations : marge par prestation.
- Réserve d'impôt : provision URSSAF sur chaque encaissement (taux de l'activité), plafond de CA micro-entreprise, seuil de TVA, CFE à terme.
- Liaison avec l'ERP existant (React) par import/export ; pas de double saisie.
- Tant que le CA est nul, la part envoyée à Retux est un **investissement**, pas un revenu prévisionnel.

---

## 10. Autres fonctions

- **Rattachement fiscal** : suivi du revenu annuel imposable pour aider à décider du détachement du foyer parental.
- **Droits et aides** : rappel de vérifier la prime d'activité (CAF) et le Contrat d'Engagement Jeune.
- **Documents** : contrats, bulletins, justificatifs, dossier de location (liste de pièces, avancement, garant).
- **Dettes et prêts** : avances à des tiers avec échéancier.
- **Journal de décisions financières**.
- **Import CSV bancaire** pour rapprocher prévu et réel.
- **Mode hors ligne** avec synchronisation.

---

## 11. Modèle de données (entités principales)

`User`, `Household`, `Address` (versionnée), `Employer/Agency`, `Mission`, `Shift` (jour de mission), `ReservePeriod`, `ReserveDay`, `Event` (rdv, perso, Retux), `TravelLeg` (calculé), `Profile` (marges, mise en route, sommeil), `Income` (statut prévu/confirmé/reçu), `Payslip` (réel), `Expense`, `Subscription`, `Envelope`, `Goal/Milestone`, `ReserveAdjustment`, `Vehicle`, `Document`, `Loan`, `RetuxItem`, `RetuxSale`.

---

## 12. Plan de livraison

| Étape | Contenu | Utile seul ? |
|---|---|---|
| 1 | Calendrier, missions, réserve, calcul du net, trajets, rappels de départ et de coucher | Oui |
| 2 | Coût de vie, réserve, runway, paliers, simulateur de déménagement | Oui |
| 3 | Prévision mensuelle et allocation | Oui |
| 4 | Foyer à deux utilisateurs | Oui |
| 5 | Retux, documents, voiture | Oui |
| 6 | Import bancaire, courses | Optionnel |

Ordre justifié par l'urgence : l'étape 1 sert dès le début de l'intérim et de la formation.

---

## 13. Choix techniques et risques

**Proposition de stack (à valider)** : application web React installable (PWA) + empaquetage Android (Capacitor) ; API et base de données sur le serveur Proxmox (Laravel ou Node, PostgreSQL ou SQLite) ; OSRM/OpenRouteService en local ; accès par VPN.

| Risque | Impact | Parade |
|---|---|---|
| **R1** Les notifications web d'une PWA ne sont pas fiables sur Android (économie d'énergie, app fermée) | Le rappel « pars maintenant » ne sonne pas | App Android native-wrapper (Capacitor) avec **alarmes locales** planifiées sur le téléphone, calculées par l'app puis re-synchronisées ; export ICS/CalDAV en filet de sécurité |
| R2 Trajet sans trafic temps réel | Retard réel | Majoration heures de pointe + marge d'arrivée |
| R3 Net estimé faux | Mauvaises décisions | Calibrage sur bulletins, taux visibles et modifiables |
| R4 Délais de paie ignorés | Découvert | Statuts prévu/confirmé/reçu, épargne acquise vs réelle |
| R5 Portée trop large | Projet jamais fini | Livraison par étapes, chaque étape utile seule |
| R6 Panne de la voiture | Perte de revenus | Provision dédiée, suivi d'entretien |
| R7 Perte de données | Perte du suivi | Sauvegardes quotidiennes, test de restauration |

---

## 14. Points à confirmer

1. **Montants exacts de la solde** de réserve (60 € et 38 €) : brut ou net, conditions de l'indemnité hors base. À vérifier sur le contrat ou la fiche de solde.
2. **Taux horaire d'intérim** et heures contractuelles : rdv agence du lundi 5 octobre.
3. **Taux de cotisations** : 22 % par défaut, à remplacer après le premier bulletin.
4. **Nombre de semaines à l'armée en décembre** et date de connaissance du planning.
5. **Assurance de la C3 par les parents** (110 €/mois) : durée de la prise en charge à convenir par écrit.
6. **Coût du téléphone** et autres charges à lister.
7. **Matelas cible** : confirmé à 6 000 €.
