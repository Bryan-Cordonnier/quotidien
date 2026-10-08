// Ce que la page Travail affiche, calculé à partir des données : les lignes de chaque onglet, la mission en cours et la prochaine. Fonctions pures.
import { comparerJours, differenceJours, type Jour } from "@etabli/ui/civil";
import { apresPrelevement } from "@etabli/ui/money";
import { avancement, detailMission, detailReserve, joursDeMission, minutesDeLaSemaine, paiesContrat, paiesMission, reglagesDeMission, statutContrat, titreContrat } from "./calculs";
import type { Bulletin, Donnees, Mission, Reglages, StatutContrat } from "./types";

export type Onglet = "interim" | "reserve" | "cdd" | "cdi";
export const ONGLETS: readonly { id: Onglet; label: string }[] = [
  { id: "interim", label: "Intérim" },
  { id: "reserve", label: "Réserve" },
  { id: "cdd", label: "CDD" },
  { id: "cdi", label: "CDI" },
];

export interface Ligne {
  /** Référence de la mission, de la période ou du contrat (« mission:m1 »), aussi la clé du bulletin. */
  ref: string;
  titre: string;
  debut: Jour;
  /** `null` pour un CDI sans fin. */
  fin: Jour | null;
  statut: StatutContrat;
  /** Net estimé de toute la mission (ou du contrat), ou `null` pour un CDI qui n'a pas de fin. */
  netCents: number | null;
  /** Net estimé par mois : de quoi comparer une mission d'intérim à un contrat. */
  parMoisCents: number;
  /** Le bulletin reçu (mission et réserve seulement), ou `null`. */
  bulletin: Bulletin | null;
}

/** Nombre de mois d'une période (au moins un) : 30,4 jours chacun. */
export const moisDe = (debut: Jour, fin: Jour): number => Math.max(1, (differenceJours(debut, fin) + 1) / 30.4);

/** Les lignes d'un onglet, la plus récente en premier. */
export function lignes(d: Donnees, r: Reglages, onglet: Onglet, aujourdhui: Jour): Ligne[] {
  const sortie: Ligne[] = [];
  if (onglet === "interim") {
    for (const m of d.missions) {
      const net = detailMission(m, reglagesDeMission(m, d.agences, r)).netCents;
      const ref = `mission:${m.id}`;
      sortie.push({ ref, titre: titreContrat(m), debut: m.debut, fin: m.fin, statut: statutContrat(m.debut, m.fin, aujourdhui), netCents: net, parMoisCents: Math.round(net / moisDe(m.debut, m.fin)), bulletin: d.bulletins[ref] ?? null });
    }
  } else if (onglet === "reserve") {
    for (const p of d.reserves) {
      if (p.jours.length === 0) continue;
      const jours = [...p.jours].sort(comparerJours);
      const debut = jours[0]!;
      const fin = jours[jours.length - 1]!;
      const net = detailReserve(p, r).netCents;
      const ref = `reserve:${p.id}`;
      sortie.push({ ref, titre: p.libelle, debut, fin, statut: statutContrat(debut, fin, aujourdhui), netCents: net, parMoisCents: Math.round(net / moisDe(debut, fin)), bulletin: d.bulletins[ref] ?? null });
    }
  } else {
    for (const c of d.contrats.filter((x) => x.type === onglet)) {
      const mensuel = apresPrelevement(c.brutMensuelCents, r.cotisationsBp);
      const total = c.fin ? paiesContrat(c, r, c.debut, c.fin).reduce((s, p) => s + p.netCents, 0) : null;
      sortie.push({ ref: `contrat:${c.id}`, titre: titreContrat(c), debut: c.debut, fin: c.fin, statut: statutContrat(c.debut, c.fin, aujourdhui), netCents: total, parMoisCents: mensuel, bulletin: null });
    }
  }
  return sortie.sort((a, b) => comparerJours(b.debut, a.debut));
}

/** La mission d'intérim en cours aujourd'hui, s'il y en a une (la plus récemment commencée). */
export const missionEnCours = (d: Donnees, aujourdhui: Jour): Mission | undefined =>
  d.missions.filter((m) => statutContrat(m.debut, m.fin, aujourdhui) === "encours").sort((a, b) => comparerJours(b.debut, a.debut))[0];

/** La prochaine mission d'intérim, qui n'a pas encore commencé. */
export const missionProchaine = (d: Donnees, aujourdhui: Jour): Mission | undefined =>
  d.missions.filter((m) => statutContrat(m.debut, m.fin, aujourdhui) === "prevu").sort((a, b) => comparerJours(a.debut, b.debut))[0];

export interface ResumeMission {
  titre: string;
  netCents: number;
  faits: number;
  total: number;
  pourcent: number;
  semaine: { planifieMin: number; ajouteesMin: number; totalMin: number };
  /** Première paie qui n'est pas passée, avec son montant. */
  prochainePaie: { date: Jour; netCents: number } | null;
  debut: Jour;
  fin: Jour;
}

export function resume(d: Donnees, r: Reglages, m: Mission, aujourdhui: Jour): ResumeMission {
  const reglages = reglagesDeMission(m, d.agences, r);
  const rythme = d.agences.find((a) => a.id === m.agenceId)?.rythme ?? "fin";
  const { faits, total } = avancement(m, aujourdhui);
  const paie = paiesMission(m, reglages, rythme).find((p) => comparerJours(p.date, aujourdhui) >= 0);
  return {
    titre: titreContrat(m),
    netCents: detailMission(m, reglages).netCents,
    faits,
    total,
    pourcent: total === 0 ? 0 : Math.round((faits / total) * 100),
    semaine: minutesDeLaSemaine(m, aujourdhui),
    prochainePaie: paie ? { date: paie.date, netCents: paie.netCents } : null,
    debut: m.debut,
    fin: m.fin,
  };
}

/**
 * Précision moyenne des estimations : pour chaque bulletin reçu, l'écart entre le net estimé et le net reçu, en pourcentage de l'estimé ;
 * la moyenne de tous les bulletins. `null` tant qu'aucun bulletin n'a été saisi. C'est la valeur que le recalage de Mes finances réutilise.
 */
export function precisionMoyenne(d: Donnees, r: Reglages): number | null {
  const ecarts: number[] = [];
  for (const m of d.missions) {
    const b = d.bulletins[`mission:${m.id}`];
    const estime = detailMission(m, reglagesDeMission(m, d.agences, r)).netCents;
    if (b && estime > 0) ecarts.push(Math.abs(b.netCents - estime) / estime);
  }
  for (const p of d.reserves) {
    const b = d.bulletins[`reserve:${p.id}`];
    const estime = detailReserve(p, r).netCents;
    if (b && estime > 0) ecarts.push(Math.abs(b.netCents - estime) / estime);
  }
  if (ecarts.length === 0) return null;
  return Math.max(0, 1 - ecarts.reduce((s, e) => s + e, 0) / ecarts.length);
}

/** Les jours travaillés restants d'une mission : sert à vérifier qu'on peut y ajouter du temps aujourd'hui. */
export const travailleAujourdhui = (m: Mission, aujourdhui: Jour): boolean => joursDeMission(m).includes(aujourdhui);
/** Le jour prévu de la dernière paie d'une mission ou d'une période de réserve : c'est la prévision que Budget marque réalisée quand le net arrive. */
export function jourPrevuPaie(d: Donnees, r: Reglages, ref: string): Jour | null {
  const [type, id] = ref.split(":");
  if (type === "mission") {
    const m = d.missions.find((x) => x.id === id);
    if (!m) return null;
    const rythme = d.agences.find((a) => a.id === m.agenceId)?.rythme ?? "fin";
    return paiesMission(m, reglagesDeMission(m, d.agences, r), rythme).at(-1)?.date ?? null;
  }
  const p = d.reserves.find((x) => x.id === id);
  return p ? detailReserve(p, r).datePaiement : null;
}