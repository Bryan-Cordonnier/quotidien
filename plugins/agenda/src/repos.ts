// Le repos légal d'une semaine en trois chiffres : le temps de travail, la plus longue journée et le plus court repos entre deux journées.
// Limites légales : 48 h par semaine, 10 h par jour, 11 h entre deux journées (les mêmes que `verifierRepos`). Fonctions pures.
import { ajouterJours, lundiDe, type Jour } from "@etabli/ui/civil";
import { occurrences } from "./calculs";
import { finDe } from "./journee";
import { TYPES_TRAVAIL, type Evenement } from "./types";

export interface ResumeRepos {
  /** Temps de la semaine (du lundi au dimanche) passé sur des événements de travail. */
  totalMin: number;
  plusLongueJourneeMin: number;
  /** Le plus court repos entre deux journées de travail de la semaine, ou `null` s'il y a moins de deux journées. */
  reposMinMin: number | null;
}

export function resumeRepos(evenements: readonly Evenement[], jour: Jour): ResumeRepos {
  const lundi = lundiDe(jour);
  const occ = occurrences(evenements, lundi, ajouterJours(lundi, 6), TYPES_TRAVAIL);
  const parJour = new Map<Jour, { debut: number; fin: number; total: number }>();
  for (const o of occ) {
    const j = parJour.get(o.jour) ?? { debut: o.debutMin, fin: finDe(o), total: 0 };
    j.debut = Math.min(j.debut, o.debutMin);
    j.fin = Math.max(j.fin, finDe(o));
    j.total += finDe(o) - o.debutMin;
    parJour.set(o.jour, j);
  }
  const jours = [...parJour.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  let reposMinMin: number | null = null;
  for (let i = 1; i < jours.length; i++) {
    const [jPrec, prec] = jours[i - 1]!;
    const [jCour, cour] = jours[i]!;
    const ecartJours = (Date.parse(`${jCour}T00:00:00Z`) - Date.parse(`${jPrec}T00:00:00Z`)) / 86_400_000;
    const repos = ecartJours * 1440 + cour.debut - prec.fin;
    reposMinMin = reposMinMin === null ? repos : Math.min(reposMinMin, repos);
  }
  return {
    totalMin: jours.reduce((s, [, j]) => s + j.total, 0),
    plusLongueJourneeMin: jours.reduce((m, [, j]) => Math.max(m, j.total), 0),
    reposMinMin,
  };
}