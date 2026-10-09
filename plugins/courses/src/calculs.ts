// Calculs de Courses, purs et testés : budget disponible de la semaine, moyenne par semaine et par mois, semaines pour le graphique.
// Une semaine va du lundi au dimanche. Tout en centimes entiers.
import { ajouterJours, comparerJours, decomposer, differenceJours, jourDeSemaine, lundiDe, premierDuMois, type Jour } from "@etabli/ui/civil";
import type { Donnees, Reglages, Ticket } from "./types";

export type Niveau = "normal" | "attention" | "alerte";

/** Dépense d'une semaine (celle qui contient `jour`) : le total des tickets et leur nombre. */
/** Les tickets qui comptent : ceux gardés « hors budget » (pour leurs prix seulement) n'entrent dans aucun calcul du budget. */
export const dansLeBudget = (d: Donnees): Ticket[] => d.tickets.filter((t) => !t.horsBudget);

export function depenseSemaine(d: Donnees, jour: Jour): { totalCents: number; nb: number } {
  const lundi = lundiDe(jour);
  let totalCents = 0;
  let nb = 0;
  for (const t of dansLeBudget(d)) {
    if (lundiDe(t.jour) === lundi) {
      totalCents += t.montantCents;
      nb++;
    }
  }
  return { totalCents, nb };
}

const SEMAINES_MAX = 260;

/**
 * Budget de la semaine : celui des paramètres ; avec le report, ce qui n'a pas été dépensé la semaine précédente (reste compris) s'y ajoute.
 * Le report ne remonte pas avant le premier ticket.
 */
export function budgetDeLaSemaine(d: Donnees, r: Reglages, jour: Jour): number {
  if (!r.report || dansLeBudget(d).length === 0) return r.budgetCents;
  const cible = lundiDe(jour);
  const premier = dansLeBudget(d).map((t) => lundiDe(t.jour)).sort(comparerJours)[0]!;
  if (comparerJours(premier, cible) >= 0) return r.budgetCents;
  let semaine = differenceJours(premier, cible) / 7 > SEMAINES_MAX ? ajouterJours(cible, -7 * SEMAINES_MAX) : premier;
  let effectif = r.budgetCents;
  for (; comparerJours(semaine, cible) < 0; semaine = ajouterJours(semaine, 7)) {
    const reste = Math.max(0, effectif - depenseSemaine(d, semaine).totalCents);
    effectif = r.budgetCents + reste;
  }
  return effectif;
}

export interface BudgetDisponible {
  budgetCents: number;
  depenseCents: number;
  nbTickets: number;
  /** Ce qui reste à dépenser (négatif : le budget est dépassé). */
  disponibleCents: number;
  /** Part du budget dépensée, en pourcents (peut dépasser 100). */
  pourcent: number;
  niveau: Niveau;
}

export function budgetDisponible(d: Donnees, r: Reglages, jour: Jour): BudgetDisponible {
  const budgetCents = budgetDeLaSemaine(d, r, jour);
  const { totalCents, nb } = depenseSemaine(d, jour);
  const pourcent = budgetCents > 0 ? (totalCents / budgetCents) * 100 : totalCents > 0 ? 100 : 0;
  const niveau: Niveau = totalCents >= budgetCents && budgetCents > 0 ? "alerte" : pourcent >= r.alertePourcent ? "attention" : "normal";
  return { budgetCents, depenseCents: totalCents, nbTickets: nb, disponibleCents: budgetCents - totalCents, pourcent, niveau };
}

export interface SemaineTotal {
  lundi: Jour;
  totalCents: number;
}

/** Les `n` dernières semaines, la plus ancienne d'abord, la semaine en cours en dernier. */
export function semainesRecentes(d: Donnees, jour: Jour, n = 5): SemaineTotal[] {
  const courante = lundiDe(jour);
  return Array.from({ length: n }, (_, i) => {
    const lundi = ajouterJours(courante, -7 * (n - 1 - i));
    return { lundi, totalCents: depenseSemaine(d, lundi).totalCents };
  });
}

export type Periode = "mois" | "annee" | "total";

/** Toutes les semaines depuis le premier ticket, ou seulement les dernières (« mois » : 5 semaines, « année » : 52). */
export function toutesLesSemaines(d: Donnees, jour: Jour, periode: Periode): SemaineTotal[] {
  const courante = lundiDe(jour);
  const premier = dansLeBudget(d).length ? dansLeBudget(d).map((t) => lundiDe(t.jour)).sort(comparerJours)[0]! : courante;
  const nb = Math.min(SEMAINES_MAX, Math.max(1, Math.floor(differenceJours(premier, courante) / 7) + 1));
  const toutes = semainesRecentes(d, jour, nb);
  return periode === "mois" ? toutes.slice(-5) : periode === "annee" ? toutes.slice(-52) : toutes;
}

/** Moyenne des semaines terminées (la dernière, en cours, n'y est pas) ; 0 s'il n'y en a aucune. */
export function moyenneSemaines(semaines: readonly SemaineTotal[]): number {
  const finies = semaines.slice(0, -1);
  return finies.length ? Math.round(finies.reduce((s, x) => s + x.totalCents, 0) / finies.length) : 0;
}

export interface MoyenneMensuelle {
  /** Moyenne des mois terminés, du mois du premier ticket au mois précédent. */
  moyenneCents: number;
  nbMois: number;
  /** Ce qui est dépensé depuis le début du mois en cours. */
  ceMoisCents: number;
}

export function moyenneMensuelle(d: Donnees, jour: Jour): MoyenneMensuelle {
  const courant = premierDuMois(jour);
  const mois = (j: Jour) => {
    const { annee, mois: m } = decomposer(j);
    return annee * 12 + (m - 1);
  };
  const parMois = new Map<number, number>();
  for (const t of dansLeBudget(d)) parMois.set(mois(t.jour), (parMois.get(mois(t.jour)) ?? 0) + t.montantCents);
  const ceMoisCents = parMois.get(mois(courant)) ?? 0;
  const anterieurs = [...parMois.keys()].filter((m) => m < mois(courant));
  if (anterieurs.length === 0) return { moyenneCents: 0, nbMois: 0, ceMoisCents };
  const premier = Math.min(...anterieurs);
  const nbMois = mois(courant) - premier;
  let total = 0;
  for (let m = premier; m < mois(courant); m++) total += parMois.get(m) ?? 0;
  return { moyenneCents: Math.round(total / nbMois), nbMois, ceMoisCents };
}

/** Le jour de la semaine de `jourDeSemaine` du moteur (1 = lundi … 7 = dimanche) vers celui des paramètres (0 = dimanche … 6 = samedi). */
const versParametre = (j: Jour): number => jourDeSemaine(j) % 7;

/** Les prochains jours de courses (aujourd'hui compris s'il en est un). */
export function prochainsJoursCourses(aujourdhui: Jour, r: Reglages, n: number): Jour[] {
  let j = aujourdhui;
  while (versParametre(j) !== r.jourCourses) j = ajouterJours(j, 1);
  return Array.from({ length: n }, (_, i) => ajouterJours(j, 7 * i));
}

/** Magasins déjà utilisés, du plus fréquent au moins fréquent : sert à proposer le magasin d'un nouveau ticket. */
export function magasinsConnus(d: Donnees): string[] {
  const compte = new Map<string, number>();
  for (const t of d.tickets) if (t.magasin !== "Sans magasin") compte.set(t.magasin, (compte.get(t.magasin) ?? 0) + 1);
  return [...compte].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")).map(([m]) => m);
}