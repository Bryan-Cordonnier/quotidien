// La journée à plat : du lever au coucher estimé, un bloc après l'autre (préparation, trajet, événement, trajet retour, temps libre).
// Fonctions pures, testées sans navigateur. Les minutes sont comptées depuis minuit du jour affiché (au-delà de 1 440 : après minuit).
import { trajetMajore } from "./calculs";
import type { Occurrence } from "./types";

export type Genre = "preparation" | "trajet" | "evenement" | "libre" | "coucher";

export interface Segment {
  genre: Genre;
  debutMin: number;
  finMin: number;
  /** « Préparation », « Trajet retour », le titre d'un événement… */
  titre: string;
  /** « vers Logis-Verre », le lieu d'un événement, « depuis Opérateur de production »… */
  detail: string;
  /** L'événement, pour un bloc d'événement. */
  occurrence: Occurrence | null;
  /** Un trajet entre deux événements proches : on ne repasse pas par la maison. */
  direct: boolean;
}

/** Les réglages dont la journée a besoin (les paramètres du plugin, dans leurs unités). */
export interface ReglagesJournee {
  margeArriveeMin: number;
  miseEnRouteMin: number;
  preparationMin: number;
  sommeilMin: number;
  endormissementMin: number;
  majorationTrajetBp: number;
  /** Heure de lever les jours sans événement tôt le matin. */
  leverDefautMin: number;
  /** Deux événements séparés de moins de ce temps s'enchaînent : un seul trajet, pas de retour à la maison. */
  enchainerMin: number;
}

export interface Journee {
  segments: Segment[];
  leverMin: number;
  coucherMin: number;
  /** Titres des événements qui se chevauchent. */
  conflits: string[];
}

/** Fin d'un événement en minutes depuis minuit de son jour (une fin avant le début passe minuit). */
export const finDe = (o: Pick<Occurrence, "debutMin" | "finMin">): number => (o.finMin <= o.debutMin ? o.finMin + 1440 : o.finMin);

const trajetDe = (o: Occurrence, r: ReglagesJournee): number => (o.trajetMin === null ? 0 : trajetMajore(o.trajetMin, r.majorationTrajetBp));

/** Heure où il faut partir de chez soi : le début, moins le trajet et la marge d'arrivée (sans trajet : le début). */
export function departDe(o: Occurrence, r: ReglagesJournee): number {
  const t = trajetDe(o, r);
  return t > 0 ? o.debutMin - t - r.margeArriveeMin : o.debutMin;
}

/** Le premier événement du matin qui commande le réveil : avant midi, avec un trajet ou de travail. */
export const premierDuMatin = (occ: readonly Occurrence[]): Occurrence | undefined => occ.find((o) => o.debutMin < 720 && (o.type === "travail" || o.type === "retux" || o.trajetMin !== null));

/** Heure du lever : calculée à rebours depuis le premier départ du matin, sinon l'heure par défaut. */
export function leverDe(occ: readonly Occurrence[], r: ReglagesJournee): number {
  const matin = premierDuMatin(occ);
  return matin ? departDe(matin, r) - r.miseEnRouteMin - r.preparationMin : r.leverDefautMin;
}

/** Heure du coucher du jour affiché : le lever du lendemain, moins le sommeil et le temps pour s'endormir. */
export const coucherDe = (occDemain: readonly Occurrence[], r: ReglagesJournee): number => leverDe(occDemain, r) + 1440 - r.sommeilMin - r.endormissementMin;

/** Les événements triés par heure de début (à heure égale, l'ordre reçu est gardé). */
export const trier = (occ: readonly Occurrence[]): Occurrence[] => [...occ].sort((a, b) => a.debutMin - b.debutMin);

export function journee(occJour: readonly Occurrence[], occDemain: readonly Occurrence[], r: ReglagesJournee): Journee {
  const occ = trier(occJour);
  const segments: Segment[] = [];
  const lever = leverDe(occ, r);
  const coucher = coucherDe(trier(occDemain), r);
  const matin = premierDuMatin(occ);
  let curseur = lever;
  const bloc = (genre: Genre, debutMin: number, finMin: number, titre: string, detail = "", occurrence: Occurrence | null = null, direct = false) =>
    segments.push({ genre, debutMin, finMin, titre, detail, occurrence, direct });

  if (matin) {
    const dep = departDe(matin, r);
    bloc("preparation", curseur, dep, "Préparation");
    curseur = dep;
  }
  occ.forEach((o, i) => {
    const t = trajetDe(o, r);
    const avant = occ[i - 1];
    const apres = occ[i + 1];
    // Un événement qui commence avant que le précédent soit fini : pas de trajet, le chevauchement est signalé.
    if (o.debutMin < curseur) {
      bloc("evenement", o.debutMin, finDe(o), o.titre, o.lieu ?? "", o);
      curseur = Math.max(curseur, finDe(o));
      return;
    }
    const enchaine = !!avant && t > 0 && o.debutMin - finDe(avant) < r.enchainerMin;
    const debutTrajet = Math.max(curseur, enchaine ? o.debutMin - t : departDe(o, r));
    if (debutTrajet > curseur + 14) bloc("libre", curseur, debutTrajet, "Temps libre");
    if (t > 0) bloc("trajet", debutTrajet, o.debutMin, enchaine ? "Trajet direct" : "Trajet", enchaine ? `depuis « ${avant!.titre} »` : o.lieu ? `vers ${o.lieu}` : "", null, enchaine);
    bloc("evenement", o.debutMin, finDe(o), o.titre, o.lieu ?? "", o);
    curseur = finDe(o);
    const suiteDirecte = !!apres && trajetDe(apres, r) > 0 && apres.debutMin - finDe(o) < r.enchainerMin;
    if (t > 0 && !suiteDirecte) {
      bloc("trajet", curseur, curseur + t, "Trajet retour", "vers la maison");
      curseur += t;
    }
  });
  if (coucher > curseur + 14) bloc("libre", curseur, coucher, "Temps libre");
  bloc("coucher", coucher, coucher, "Coucher estimé");

  const conflits = occ.filter((o) => occ.some((x) => x !== o && x.debutMin < finDe(o) && o.debutMin < finDe(x))).map((o) => o.titre);
  return { segments, leverMin: lever, coucherMin: coucher, conflits: [...new Set(conflits)] };
}

/** Les trajets de la journée, dans l'ordre : ce sont eux qu'on note avec « je suis parti » et « je suis arrivé ». */
export const trajetsDe = (j: Journee): Segment[] => j.segments.filter((s) => s.genre === "trajet");