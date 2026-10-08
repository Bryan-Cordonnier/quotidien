// Calculs de Travail (ex-Paie), purs et testés (docs/24, section 8). Tout en entiers (centimes, minutes, points de base) ; les arrondis passent par `money`
// (règle « demi-haut », celle de `arr()` de gestion-budget-perso). Les formules de l'intérim et de la réserve sont celles de `paie.rs`.
// ATTENTION : ce sont des ESTIMATIONS. Les taux sont des réglages à confirmer sur un vrai bulletin ; Travail dit combien on sera payé, pas ce qui reste.
import {
  ajouterJours,
  compterJoursOuvres,
  comparerJours,
  decomposer,
  dernierDuMois,
  dureeEntre,
  estFerieFrance,
  jour as faireJour,
  joursDansMois,
  jourDeSemaine,
  lundiDe,
  plage,
  premierDuMois,
  prochainOuvre,
  type Jour,
} from "@etabli/ui/civil";
import { ajouter, apresPrelevement, majorer, mulDiv, pourcentage } from "@etabli/ui/money";
import type { Agence, Contrat, Mission, PeriodeReserve, Reglages, RythmePaie, StatutContrat } from "./types";

/** Les paies de contrat passées depuis moins de ce nombre de jours sont encore projetées (une paie manquée reste visible « en retard » chez Budget). */
export const RETARD_JOURS_PAIE = 31;

// ——— Intérim ———

/** Jours travaillés d'une mission : dans la période, un jour de semaine choisi, hors exclusions. */
export function joursDeMission(m: Pick<Mission, "debut" | "fin" | "joursSemaine" | "exclusions">): Jour[] {
  if (comparerJours(m.fin, m.debut) < 0) return [];
  const exclus = new Set(m.exclusions);
  return plage(m.debut, m.fin, 800).filter((j) => m.joursSemaine.includes(jourDeSemaine(j)) && !exclus.has(j));
}

/** Minutes travaillées dans une journée de la mission (pause déduite, jamais négatif). Une nuit qui passe minuit compte pour le jour où elle commence. */
export const minutesDuJour = (m: Pick<Mission, "debutMin" | "finMin" | "pauseMin">): number => Math.max(0, dureeEntre(m.debutMin, m.finMin) - m.pauseMin);

export interface SemaineMission {
  /** Lundi de la semaine. */
  lundi: Jour;
  planifieMin: number;
  normalesMin: number;
  /** Heures supplémentaires à la première majoration. */
  sup1Min: number;
  /** Heures supplémentaires à la seconde majoration. */
  sup2Min: number;
}

export interface DetailMission {
  semaines: SemaineMission[];
  /** Brut de base : heures normales et supplémentaires aux taux de chaque semaine. */
  brutBaseCents: number;
  ifmCents: number;
  cpCents: number;
  brutTotalCents: number;
  /** Paniers et déplacements (par jour travaillé) : ajoutés au net, sans cotisations. */
  indemnitesCents: number;
  netCents: number;
  /** Jour de la dernière journée travaillée, ou `null` si la mission n'a aucune journée. */
  dernierJour: Jour | null;
  /** Jour prévu du paiement (délai de paie après le dernier jour, reporté au jour ouvré suivant). */
  datePaiement: Jour | null;
}

/**
 * Intérim, semaine lundi → dimanche (une nuit se rattache au jour où elle commence) :
 * `normales = min(planifié, seuil)`, `sup = max(planifié − seuil, 0) + supplémentaires manuelles`, payées à la majoration 1 jusqu'à
 * `seuilSup1Min` par semaine, à la majoration 2 au-delà ; `brut de base = Σ heures × taux` ; `IFM = brut de base × ifm` ;
 * `CP = (brut de base + IFM) × cp` ; `net = (brut de base + IFM + CP) × (1 − cotisations) + jours × (panier + déplacement)`.
 * Les cotisations sont celles de `r` : pour celles d'une agence, passer par `reglagesDeMission`.
 */
export function detailMission(m: Mission, r: Reglages): DetailMission {
  const jours = joursDeMission(m);
  const parJour = minutesDuJour(m);
  const semaines = new Map<Jour, { planifie: number; manuel: number }>();
  const semaine = (j: Jour) => {
    const l = lundiDe(j);
    const s = semaines.get(l) ?? { planifie: 0, manuel: 0 };
    semaines.set(l, s);
    return s;
  };
  for (const j of jours) semaine(j).planifie += parJour;
  for (const s of m.supplementaires) if (comparerJours(s.jour, m.debut) >= 0 && comparerJours(s.jour, m.fin) <= 0) semaine(s.jour).manuel += s.minutes;

  const taux1 = majorer(m.tauxHoraireCents, r.majorationSup1Bp);
  const taux2 = majorer(m.tauxHoraireCents, r.majorationSup2Bp);
  let brutBase = 0;
  const detail: SemaineMission[] = [...semaines]
    .sort(([a], [b]) => comparerJours(a, b))
    .map(([lundi, s]) => {
      const normalesMin = Math.min(s.planifie, r.seuilSemaineMin);
      const sup = Math.max(s.planifie - r.seuilSemaineMin, 0) + s.manuel;
      const sup1Min = Math.min(sup, r.seuilSup1Min);
      const sup2Min = sup - sup1Min;
      brutBase = ajouter(brutBase, mulDiv(m.tauxHoraireCents, normalesMin, 60));
      brutBase = ajouter(brutBase, mulDiv(taux1, sup1Min, 60));
      brutBase = ajouter(brutBase, mulDiv(taux2, sup2Min, 60));
      return { lundi, planifieMin: s.planifie, normalesMin, sup1Min, sup2Min };
    });
  const ifmCents = pourcentage(brutBase, r.ifmBp);
  const cpCents = pourcentage(ajouter(brutBase, ifmCents), r.cpBp);
  const brutTotalCents = ajouter(ajouter(brutBase, ifmCents), cpCents);
  const dernierJour = jours.length > 0 ? jours[jours.length - 1]! : null;
  const indemnitesCents = mulDiv(m.panierCents + m.deplacementCents, jours.length, 1);
  return {
    semaines: detail,
    brutBaseCents: brutBase,
    ifmCents,
    cpCents,
    brutTotalCents,
    indemnitesCents,
    netCents: ajouter(apresPrelevement(brutTotalCents, r.cotisationsBp), indemnitesCents),
    dernierJour,
    datePaiement: dernierJour ? datePaiement(dernierJour, r.delaiPaieJours) : null,
  };
}

/** Les réglages d'une mission : ceux des paramètres, avec les cotisations de son agence si elle en a. */
export function reglagesDeMission(m: Pick<Mission, "agenceId">, agences: readonly Agence[], r: Reglages): Reglages {
  const agence = m.agenceId ? agences.find((a) => a.id === m.agenceId) : undefined;
  return agence && agence.cotisationsBp !== null ? { ...r, cotisationsBp: agence.cotisationsBp } : r;
}

/** « Poste — Entreprise » (le poste seul si l'entreprise n'est pas renseignée). */
export const titreContrat = (c: { libelle: string; entreprise: string }): string => (c.entreprise ? `${c.libelle} — ${c.entreprise}` : c.libelle);

/** Un contrat signé est prévu avant son premier jour, en cours pendant, terminé après son dernier jour. */
export function statutContrat(debut: Jour, fin: Jour | null, aujourdhui: Jour): StatutContrat {
  if (comparerJours(aujourdhui, debut) < 0) return "prevu";
  return fin !== null && comparerJours(aujourdhui, fin) > 0 ? "termine" : "encours";
}

/** « 12/40 jours » : jours travaillés déjà passés (aujourd'hui compris) sur le total de la mission. */
export function avancement(m: Mission, aujourdhui: Jour): { faits: number; total: number } {
  const jours = joursDeMission(m);
  return { faits: jours.filter((j) => comparerJours(j, aujourdhui) <= 0).length, total: jours.length };
}

/** Les sept jours (lundi → dimanche) de la semaine qui contient `jour`. */
export const joursDeLaSemaine = (jour: Jour): Jour[] => {
  const lundi = lundiDe(jour);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
};

/** Temps de la semaine de `jour` : prévu par l'horaire de la mission, et ajouté à la main (heures supplémentaires). */
export function minutesDeLaSemaine(m: Mission, jour: Jour): { planifieMin: number; ajouteesMin: number; totalMin: number } {
  const semaine = new Set(joursDeLaSemaine(jour));
  const planifieMin = joursDeMission(m).filter((j) => semaine.has(j)).length * minutesDuJour(m);
  const ajouteesMin = m.supplementaires.filter((s) => semaine.has(s.jour)).reduce((somme, s) => somme + s.minutes, 0);
  return { planifieMin, ajouteesMin, totalMin: planifieMin + ajouteesMin };
}

export interface PaieMission {
  date: Jour;
  netCents: number;
}

/**
 * Les paies d'une mission selon le rythme de l'agence : une seule à la fin (`fin`), ou une par mois ou par semaine. Chaque période reçoit la
 * part du net de ses heures (le total est exact, au centime) ; sa paie tombe `délai` jours après son dernier jour travaillé, jamais un week-end.
 */
export function paiesMission(m: Mission, r: Reglages, rythme: RythmePaie): PaieMission[] {
  const det = detailMission(m, r);
  if (det.netCents <= 0 || !det.datePaiement) return [];
  if (rythme === "fin") return [{ date: det.datePaiement, netCents: det.netCents }];
  const poids = new Map<Jour, number>();
  const parJour = minutesDuJour(m);
  for (const j of joursDeMission(m)) poids.set(j, (poids.get(j) ?? 0) + parJour);
  for (const s of m.supplementaires) poids.set(s.jour, (poids.get(s.jour) ?? 0) + s.minutes);
  const cle = (j: Jour): string => (rythme === "mois" ? j.slice(0, 7) : lundiDe(j));
  const groupes = new Map<string, { dernier: Jour; poids: number }>();
  for (const j of [...poids.keys()].sort(comparerJours)) {
    const g = groupes.get(cle(j)) ?? { dernier: j, poids: 0 };
    g.dernier = j;
    g.poids += poids.get(j)!;
    groupes.set(cle(j), g);
  }
  const liste = [...groupes.values()];
  const total = liste.reduce((somme, g) => somme + g.poids, 0);
  if (total === 0 || liste.length === 0) return [{ date: det.datePaiement, netCents: det.netCents }];
  let reste = det.netCents;
  return liste.map((g, i) => {
    const part = i === liste.length - 1 ? reste : mulDiv(det.netCents, g.poids, total);
    reste -= part;
    return { date: datePaiement(g.dernier, r.delaiPaieJours), netCents: part };
  }).filter((p) => p.netCents > 0);
}

/** Paiement : `delai` jours après `jour`, jamais un week-end ni un jour férié (report au jour ouvré suivant). */
export const datePaiement = (jour: Jour, delai: number): Jour => prochainOuvre(ajouterJours(jour, delai), estFerieFrance);

// ——— Réserve ———

export interface DetailReserve {
  /** Brut des jours de réserve (nombre de jours × tarif). */
  brutCents: number;
  netJoursCents: number;
  indemniteCents: number;
  netCents: number;
  dernierJour: Jour | null;
  datePaiement: Jour | null;
}

/** Réserve : `net = jours × tarif × (1 − cotisations) + hors base × indemnité` (l'indemnité n'est pas soumise aux cotisations ici : hypothèse de `paie.rs`). */
export function detailReserve(p: PeriodeReserve, r: Reglages): DetailReserve {
  const brutCents = mulDiv(r.tarifReserveCents, p.jours.length, 1);
  const netJoursCents = apresPrelevement(brutCents, r.cotisationsBp);
  const indemniteCents = mulDiv(r.indemniteHorsBaseCents, p.horsBase, 1);
  const dernierJour = p.jours.length > 0 ? [...p.jours].sort(comparerJours).at(-1)! : null;
  return { brutCents, netJoursCents, indemniteCents, netCents: ajouter(netJoursCents, indemniteCents), dernierJour, datePaiement: dernierJour ? datePaiement(dernierJour, r.delaiPaieJours) : null };
}

// ——— CDI et CDD ———

export interface PaieContrat {
  /** Premier jour du mois payé. */
  mois: Jour;
  datePaiement: Jour;
  netCents: number;
  libelle: string;
}

function moisDuContrat(c: Contrat, jusqu: Jour): Jour[] {
  const fin = c.fin && comparerJours(c.fin, jusqu) < 0 ? c.fin : jusqu;
  const mois: Jour[] = [];
  for (let m = premierDuMois(c.debut); comparerJours(m, fin) <= 0 && mois.length < 400; m = ajouterJours(dernierDuMois(m), 1)) mois.push(m);
  return mois;
}

/** Brut d'un mois du contrat : complet, ou au prorata des jours ouvrés du contrat dans le mois (`brut × ouvrés du contrat / ouvrés du mois`). */
function brutDuMois(c: Contrat, mois: Jour): number {
  const premier = premierDuMois(mois);
  const dernier = dernierDuMois(mois);
  const du = comparerJours(c.debut, premier) > 0 ? c.debut : premier;
  const au = c.fin && comparerJours(c.fin, dernier) < 0 ? c.fin : dernier;
  if (du === premier && au === dernier) return c.brutMensuelCents;
  return mulDiv(c.brutMensuelCents, compterJoursOuvres(du, au, estFerieFrance), compterJoursOuvres(premier, dernier, estFerieFrance));
}

const jourDePaieDuMois = (mois: Jour, jourDePaie: number): Jour => prochainOuvre(faireJour(decomposer(mois).annee, decomposer(mois).mois, Math.min(jourDePaie, joursDansMois(decomposer(mois).annee, decomposer(mois).mois))), estFerieFrance);

/**
 * Paies d'un contrat dont la date tombe entre `du` et `au` : `net du mois = brut du mois × (1 − cotisations)`. Pour un CDD, une ligne
 * « fin de contrat » s'ajoute au dernier mois : `(précarité + congés payés) × brut total du contrat`, moins les cotisations.
 * Un CDI sans fin court jusqu'à `au`.
 */
export function paiesContrat(c: Contrat, r: Reglages, du: Jour, au: Jour): PaieContrat[] {
  const sortie: PaieContrat[] = [];
  const mois = moisDuContrat(c, au);
  for (const m of mois) {
    const date = jourDePaieDuMois(m, c.jourDePaie);
    if (comparerJours(date, du) < 0 || comparerJours(date, au) > 0) continue;
    sortie.push({ mois: m, datePaiement: date, netCents: apresPrelevement(brutDuMois(c, m), r.cotisationsBp), libelle: c.libelle });
  }
  if (c.type === "cdd" && c.fin) {
    const tous = moisDuContrat(c, c.fin);
    const dernier = tous[tous.length - 1];
    if (dernier) {
      const date = jourDePaieDuMois(dernier, c.jourDePaie);
      if (comparerJours(date, du) >= 0 && comparerJours(date, au) <= 0) {
        const total = tous.reduce((s, m) => ajouter(s, brutDuMois(c, m)), 0);
        const fin = ajouter(pourcentage(total, r.precariteBp), pourcentage(total, r.cpCddBp));
        sortie.push({ mois: dernier, datePaiement: date, netCents: apresPrelevement(fin, r.cotisationsBp), libelle: `${c.libelle} (fin de contrat)` });
      }
    }
  }
  return sortie;
}

