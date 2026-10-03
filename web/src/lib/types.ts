/** Date locale au format AAAA-MM-JJ. */
export type ISODate = string;
export type Statut = 'prevu' | 'confirme';

export interface Mission {
  id: string;
  agence: string;
  entreprise: string;
  lieu: string;
  debut: ISODate;
  fin: ISODate;
  /** 0 = lundi … 6 = dimanche */
  joursSemaine: number[];
  /** minutes depuis minuit */
  heureDebutMin: number;
  heureFinMin: number;
  pauseMin: number;
  tauxCents: number;
  tauxSupCents: number;
  seuilHebdoMin: number;
  /** trajet aller de base, en minutes (calcul d'itinéraire en étape ultérieure) */
  trajetMin: number;
  statut: Statut;
  /** minutes sup ajoutées par jour (« +1 h ce soir ») */
  ajustementsSup: Record<ISODate, number>;
  /** jours d'absence dans la période */
  exclusions: ISODate[];
}

export interface Reserve {
  id: string;
  lieu: string;
  jours: { date: ISODate; horsBase: boolean }[];
  heureArriveeMin: number;
  heureDepartMin: number;
  tarifJourCents: number;
  indemniteHorsBaseCents: number;
  trajetMin: number;
  statut: 'probable' | 'confirme';
}

export interface Rdv {
  id: string;
  titre: string;
  adresse: string;
  date: ISODate;
  heureMin: number;
  dureeMin: number;
  trajetMin: number;
  /** marge d'avance propre au rendez-vous (min) */
  margeMin: number;
}

export interface Reglages {
  margeArriveeMissionMin: number;
  miseEnRouteMin: number;
  preparationMin: number;
  sommeilMin: number;
  endormissementMin: number;
  majorationTrajetPct: number;
  preAlerteMin: number;
  rappelCoucherMin: number;
  cotisationsPct: number;
}

export interface Donnees {
  version: 1;
  missions: Mission[];
  reserves: Reserve[];
  rdvs: Rdv[];
  reglages: Reglages;
}

export const REGLAGES_DEFAUT: Reglages = {
  margeArriveeMissionMin: 10,
  miseEnRouteMin: 10,
  preparationMin: 45,
  sommeilMin: 480,
  endormissementMin: 15,
  majorationTrajetPct: 15,
  preAlerteMin: 5,
  rappelCoucherMin: 30,
  cotisationsPct: 22,
};
