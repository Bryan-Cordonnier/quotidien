// Ce que Courses annonce à Budget : la dépense prévue de chacune des quatre prochaines semaines, le jour des courses. La semaine en cours
// n'annonce que ce qui reste du budget (les tickets déjà saisis sont de l'argent réel, pas une prévision) ; les suivantes, le budget entier.
import { comparerJours, lundiDe, type Jour } from "@etabli/ui/civil";
import { budgetDisponible, prochainsJoursCourses } from "./calculs";
import type { Donnees, Reglages } from "./types";

export const SEMAINES_ANNONCEES = 4;
export const REF_BUDGET = "courses";

export interface PrevisionBudget {
  montantCents: number;
  jour: Jour;
  libelle: string;
}

export function empreinte(valeur: unknown): string {
  const texte = JSON.stringify(valeur);
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function previsionsBudget(d: Donnees, r: Reglages, aujourdhui: Jour): PrevisionBudget[] {
  const sortie: PrevisionBudget[] = [];
  for (const jour of prochainsJoursCourses(aujourdhui, r, SEMAINES_ANNONCEES)) {
    const reste = lundiDe(jour) === lundiDe(aujourdhui) ? Math.max(0, budgetDisponible(d, r, aujourdhui).disponibleCents) : r.budgetCents;
    if (reste > 0 && comparerJours(jour, aujourdhui) >= 0) sortie.push({ montantCents: -reste, jour, libelle: "Courses" });
  }
  return sortie;
}