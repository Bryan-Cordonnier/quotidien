// Modèle de données de Travail (ex-Paie ; docs/24 et docs/29) : pour un PARTICULIER, programmer ses paies (missions d'intérim, jours de réserve, CDI et
// CDD). Montants en centimes entiers, taux en points de base (2200 = 22 %), durées en minutes, jours civils AAAA-MM-JJ.
// Aucun taux n'est en dur dans le code : tout est un réglage. Les valeurs par défaut sont des HYPOTHÈSES à confirmer sur un vrai bulletin.
// Les réglages sont les PARAMÈTRES déclarés au moteur (voir reglages.ts) ; ils ne sont plus enregistrés avec les données.
import type { Jour } from "@etabli/ui/civil";
import type { Centimes, PointsDeBase } from "@etabli/ui/money";

export const SCHEMA = 2;

/** Ce que les paramètres du plugin donnent aux calculs. */
export interface Reglages {
  /** Cotisations salariales par défaut (hypothèse : 22 %, à confirmer sur un bulletin) : celles d'une agence ou d'un contrat sans taux propre. */
  cotisationsBp: PointsDeBase;
  /** Indemnité de fin de mission (IFM) sur le brut de base (intérim). */
  ifmBp: PointsDeBase;
  /** Congés payés sur (brut de base + IFM) (intérim). */
  cpBp: PointsDeBase;
  /** Durée hebdomadaire au-delà de laquelle les heures sont supplémentaires (35 h = 2100 min). */
  seuilSemaineMin: number;
  /** Majoration des heures supplémentaires jusqu'à `seuilSup1Min` par semaine (légal : +25 %). */
  majorationSup1Bp: PointsDeBase;
  /** Au-delà : majoration (légal : +50 %). */
  majorationSup2Bp: PointsDeBase;
  /** Nombre de minutes supplémentaires par semaine payées à la première majoration (légal : 8 h = 480 min). */
  seuilSup1Min: number;
  /** Délai entre la fin d'une mission ou d'une période de réserve et le paiement, en jours (jamais un week-end ni un jour férié). */
  delaiPaieJours: number;
  /** Réserve : solde d'un jour À LA BASE, imposable (brut, cotisations déduites ensuite). */
  tarifReserveCents: Centimes;
  /** Réserve : indemnité d'un jour à la base, NON imposable (pas de cotisations). */
  indemniteReserveCents: Centimes;
  /** Réserve : solde d'un jour HORS BASE, imposable (grille de solde du soldat ; à régler). */
  tarifHorsBaseCents: Centimes;
  /** CDD : prime de précarité sur le brut total du contrat (légal : 10 %). */
  precariteBp: PointsDeBase;
  /** CDD : indemnité de congés payés non pris sur le brut total (légal : 10 %). */
  cpCddBp: PointsDeBase;
  /** Heures proposées pour une nouvelle période de réserve : arrivée à la base le premier jour, départ le dernier jour (minutes depuis minuit). */
  reserveDebutMin: number;
  reserveFinMin: number;
  /** La base de réserve (nom et adresse) : le lieu des jours de réserve dans l'agenda, pour le trajet. Vide : pas de lieu. */
  baseLieu: string;
}

export const REGLAGES_DEFAUT: Reglages = {
  cotisationsBp: 2200,
  ifmBp: 1000,
  cpBp: 1000,
  seuilSemaineMin: 35 * 60,
  majorationSup1Bp: 2500,
  majorationSup2Bp: 5000,
  seuilSup1Min: 8 * 60,
  delaiPaieJours: 7,
  tarifReserveCents: 6000,
  indemniteReserveCents: 3800,
  tarifHorsBaseCents: 0,
  precariteBp: 1000,
  cpCddBp: 1000,
  reserveDebutMin: 8 * 60,
  reserveFinMin: 17 * 60,
  baseLieu: "",
};

/** Quand une agence paie : une fois à la fin de la mission, chaque mois ou chaque semaine. */
export type RythmePaie = "fin" | "mois" | "semaine";

/** Une agence d'intérim : un nom et ses cotisations ; le taux horaire, le panier et le déplacement changent à chaque mission. */
export interface Agence {
  id: string;
  nom: string;
  /** Cotisations salariales de l'agence ; `null` : celles des paramètres. */
  cotisationsBp: PointsDeBase | null;
  rythme: RythmePaie;
}

/** Un contrat signé n'a que trois états, qui suivent les dates. */
export type StatutContrat = "prevu" | "encours" | "termine";

export interface Mission {
  id: string;
  /** Le poste (« Opérateur de production »). */
  libelle: string;
  /** L'entreprise cliente (« Logis-Verre »), éventuellement vide. */
  entreprise: string;
  agenceId: string | null;
  debut: Jour;
  fin: Jour;
  /** Jours travaillés dans la semaine : 1 = lundi … 7 = dimanche. */
  joursSemaine: number[];
  /** Jours de la période où l'on ne travaille pas. */
  exclusions: Jour[];
  debutMin: number;
  /** Une fin avant ou égale au début passe minuit. */
  finMin: number;
  pauseMin: number;
  /** Taux horaire brut. */
  tauxHoraireCents: Centimes;
  /** Trajet de la maison au travail, en minutes (sans majoration), ou `null` : sert à l'heure de départ de l'agenda. */
  trajetMin: number | null;
  /** Panier repas par jour travaillé (non soumis aux cotisations). */
  panierCents: Centimes;
  /** Indemnité de déplacement par jour travaillé (non soumise aux cotisations). */
  deplacementCents: Centimes;
  /** Minutes supplémentaires ajoutées à la main un jour précis (« +1 h ce soir »), payées en heures supplémentaires. */
  supplementaires: { jour: Jour; minutes: number }[];
}

/**
 * Une mission de réserviste : on arrive à la base le premier jour et on la quitte le dernier, entre les deux on y reste jour et nuit.
 * Chaque jour compte pour un jour payé, que l'on arrive à 7 h 30 ou à 11 h : les heures servent uniquement à l'emploi du temps.
 */
export interface PeriodeReserve {
  id: string;
  libelle: string;
  /** Premier et dernier jour de la mission (inclus). */
  debut: Jour;
  fin: Jour;
  /** Heure d'arrivée à la base le premier jour, et heure de départ le dernier jour (minutes depuis minuit). */
  arriveeMin: number;
  departMin: number;
  /** Jours de la mission passés HORS BASE (payés au solde hors base) ; tous les autres jours sont à la base. */
  joursHorsBase: Jour[];
}

export type TypeContrat = "cdi" | "cdd";

export interface Contrat {
  id: string;
  /** Le poste. */
  libelle: string;
  entreprise: string;
  type: TypeContrat;
  brutMensuelCents: Centimes;
  debut: Jour;
  /** Dernier jour : obligatoire pour un CDD, facultatif pour un CDI. */
  fin: Jour | null;
  /** Jour du mois de la paie (1 à 28 ; reporté au jour ouvré suivant s'il tombe un week-end ou un jour férié). */
  jourDePaie: number;
}

/** Net réellement reçu pour une mission ou une période de réserve : plus rien n'est « attendu » pour elle chez Budget. */
export interface Bulletin {
  netCents: Centimes;
  /** Jour où l'argent est arrivé. */
  jour: Jour;
  /** Écriture de Finances, si la transmission a eu lieu. */
  ecritureId: string | null;
}

export interface Donnees {
  schema: typeof SCHEMA;
  suivant: number;
  agences: Agence[];
  missions: Mission[];
  reserves: PeriodeReserve[];
  contrats: Contrat[];
  /**
   * Ce qui a été transmis aux autres plugins : « service|ref » → empreinte du contenu envoyé. Sert à dire « transmis n sur n » et à ne
   * renvoyer que ce qui a changé. La vérité reste ici : on peut tout régénérer en rejouant (docs/24, A.1.7).
   */
  transmis: Record<string, string>;
  /** Net reçu, par référence (« mission:m1 », « reserve:r2 »). */
  bulletins: Record<string, Bulletin>;
}

export type CodeErreur = "argument_invalide" | "introuvable" | "limite_atteinte" | "illisible";

export class ErreurTravail extends Error {
  constructor(
    readonly code: CodeErreur,
    message: string,
  ) {
    super(message);
    this.name = "ErreurTravail";
  }
}
