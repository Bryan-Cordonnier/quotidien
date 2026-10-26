// Calculs de Mes finances, purs et testés : estimé, courbe de prévision, « jusqu'à quand je tiens », prochains paiements, précision.
import { ajouterJours, comparerJours, differenceJours, plage, type Jour } from "@etabli/ui/civil";
import type { Compte, Donnees, Prevision, Recalage, Reglages, Role } from "./types";

export const REGLAGES_DEFAUT: Reglages = { seuilCents: 0, horizon: 60, recalagesRetenus: 6 };

export function reglagesDepuis(p: Record<string, number | string | boolean> | null | undefined): Reglages {
  const v = p ?? {};
  const seuil = typeof v.seuil === "number" && Number.isFinite(v.seuil) ? v.seuil : 0;
  const horizon = Number(v.horizon);
  const retenus = typeof v.precisionRecalages === "number" && Number.isInteger(v.precisionRecalages) && v.precisionRecalages >= 1 ? v.precisionRecalages : 6;
  return { seuilCents: Math.round(seuil * 100), horizon: [30, 60, 90].includes(horizon) ? horizon : 60, recalagesRetenus: Math.min(retenus, 24) };
}

/** Rôle d'un compte : celui qu'on a choisi, sinon « secours » pour l'épargne et « vie » pour le reste. */
export const roleDe = (c: Compte, roles: Donnees["roles"]): Role =>
  roles[c.id] ?? (["epargne", "livret-a", "lep"].includes(c.type) ? "secours" : c.type === "pea" ? "hors" : "vie");

export interface Estime {
  vie: number;
  secours: number;
}

/** Somme des soldes par rôle (« hors » est ignoré). */
export function estime(comptes: Compte[], soldes: Record<string, number>, roles: Donnees["roles"]): Estime {
  const e: Estime = { vie: 0, secours: 0 };
  for (const c of comptes) {
    const r = roleDe(c, roles);
    if (r !== "hors") e[r] += soldes[c.id] ?? 0;
  }
  return e;
}

export interface Point {
  jour: Jour;
  soldeCents: number;
}

/** Une prévision touche l'argent de la vie courante si son compte l'est (ou s'il n'est pas encore choisi). */
function compteLaVie(p: Prevision, comptes: Compte[], roles: Donnees["roles"]): boolean {
  if (p.compteId === null) return true;
  const c = comptes.find((x) => x.id === p.compteId);
  return c !== undefined && roleDe(c, roles) === "vie";
}

/** Solde estimé de la vie courante, jour après jour, d'aujourd'hui à l'horizon (inclus). Une prévision du jour même compte ce jour-là. */
export function courbe(depart: number, aujourdhui: Jour, horizon: number, previsions: Prevision[], comptes: Compte[], roles: Donnees["roles"]): Point[] {
  const parJour = new Map<Jour, number>();
  for (const p of previsions) {
    if (comparerJours(p.jour, aujourdhui) < 0 || !compteLaVie(p, comptes, roles)) continue;
    parJour.set(p.jour, (parJour.get(p.jour) ?? 0) + p.montantCents);
  }
  let solde = depart;
  return plage(aujourdhui, ajouterJours(aujourdhui, horizon)).map((jour) => {
    solde += parJour.get(jour) ?? 0;
    return { jour, soldeCents: solde };
  });
}

/** Premier jour où l'estimé passe sous le seuil, ou `null` s'il tient sur tout l'horizon. */
export function premierJourSousSeuil(points: Point[], seuilCents: number): Jour | null {
  return points.find((p) => p.soldeCents < seuilCents)?.jour ?? null;
}

/** Les prochaines sorties d'argent prévues, de la plus proche à la plus lointaine. */
export function prochainsPaiements(previsions: Prevision[], aujourdhui: Jour, n: number): Prevision[] {
  return previsions
    .filter((p) => p.montantCents < 0 && comparerJours(p.jour, aujourdhui) >= 0)
    .sort((a, b) => comparerJours(a.jour, b.jour) || a.montantCents - b.montantCents)
    .slice(0, n);
}

/** Précision : moyenne de la valeur absolue des derniers écarts, ou `null` tant qu'aucun recalage n'a eu lieu. */
export function precision(recalages: Recalage[], retenus: number): number | null {
  const derniers = recalages.slice(-retenus);
  if (derniers.length === 0) return null;
  return Math.round(derniers.reduce((s, r) => s + Math.abs(r.ecartCents), 0) / derniers.length);
}

/** Écart entre le solde réel saisi et l'estimé : c'est l'écriture de recalage à passer (0 : rien à faire). */
export const ecartDeRecalage = (reelCents: number, estimeCents: number): number => reelCents - estimeCents;

/**
 * Fin des revenus prévus : le jour du dernier revenu attendu (une entrée d'argent prévue), s'il tombe dans les 45 prochains jours.
 * Sert à prévenir quand une mission se termine sans suite. `null` : un revenu est prévu plus loin, ou aucun revenu n'est prévu du tout.
 */
export function finDesRevenus(previsions: readonly { jour: Jour; montantCents: number }[], aujourdhui: Jour): Jour | null {
  const revenus = previsions.filter((p) => p.montantCents > 0 && p.jour >= aujourdhui).map((p) => p.jour).sort();
  const dernier = revenus.at(-1);
  if (!dernier) return null;
  return differenceJours(aujourdhui, dernier) <= 45 ? dernier : null;
}