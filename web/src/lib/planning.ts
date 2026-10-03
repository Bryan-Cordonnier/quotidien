import { addDays, debutSemaine, diffJours, jourSemaine, plage } from './dates';
import { coeur, type PaieInterim, type PaieReserve, type PlanHoraires } from './wasm';
import type { Donnees, ISODate, Mission, Rdv, Reglages, Reserve } from './types';

/** Jours effectivement travaillés d'une mission (jours de la semaine retenus, hors absences). */
export function joursMission(m: Mission): ISODate[] {
  if (m.fin < m.debut) return [];
  return plage(m.debut, m.fin).filter(
    (d) => m.joursSemaine.includes(jourSemaine(d)) && !m.exclusions.includes(d),
  );
}

/** Entrée du cœur de calcul : jours regroupés par semaine (lundi → dimanche). */
export function entreeInterim(m: Mission, reglages: Reglages) {
  const parSemaine = new Map<ISODate, ISODate[]>();
  for (const d of joursMission(m)) {
    const s = debutSemaine(d);
    parSemaine.set(s, [...(parSemaine.get(s) ?? []), d]);
  }
  return {
    taux_cents: m.tauxCents,
    taux_sup_cents: m.tauxSupCents,
    seuil_hebdo_min: m.seuilHebdoMin,
    cotisations_bp: Math.round(reglages.cotisationsPct * 100),
    semaines: [...parSemaine.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, jours]) => ({
        jours: jours.map((d) => ({
          debut_min: m.heureDebutMin,
          fin_min: m.heureFinMin,
          pause_min: m.pauseMin,
          sup_manuel_min: m.ajustementsSup[d] ?? 0,
        })),
      })),
  };
}

export function payeMission(m: Mission, reglages: Reglages): PaieInterim {
  return coeur.interim(entreeInterim(m, reglages));
}

export function payeReserve(r: Reserve, reglages: Reglages): PaieReserve {
  return coeur.reserve({
    tarif_jour_cents: r.tarifJourCents,
    indemnite_hors_base_cents: r.indemniteHorsBaseCents,
    cotisations_bp: Math.round(reglages.cotisationsPct * 100),
    jours_hors_base: r.jours.map((j) => j.horsBase),
  });
}

/** Chronologie d'une journée à lieu extérieur (réveil, départ, coucher…). */
export function horairesJournee(
  debutMin: number,
  trajetMin: number,
  margeArriveeMin: number,
  r: Reglages,
): PlanHoraires {
  return coeur.horaires({
    debut_min: debutMin,
    marge_arrivee_min: margeArriveeMin,
    trajet_min: trajetMin,
    majoration_trajet_bp: Math.round(r.majorationTrajetPct * 100),
    mise_en_route_min: r.miseEnRouteMin,
    preparation_min: r.preparationMin,
    sommeil_min: r.sommeilMin,
    endormissement_min: r.endormissementMin,
    pre_alerte_min: r.preAlerteMin,
    rappel_coucher_min: r.rappelCoucherMin,
  });
}

export type TypeEvenement = 'interim' | 'reserve' | 'rdv';

export interface EvenementJour {
  type: TypeEvenement;
  id: string;
  titre: string;
  lieu: string;
  debutMin: number;
  finMin: number;
  trajetMin: number;
  margeMin: number;
  statut: string;
}

/** Tous les événements d'une date. */
export function evenementsDuJour(date: ISODate, d: Donnees): EvenementJour[] {
  const out: EvenementJour[] = [];
  for (const m of d.missions) {
    if (!joursMission(m).includes(date)) continue;
    const sup = m.ajustementsSup[date] ?? 0;
    out.push({
      type: 'interim',
      id: m.id,
      titre: m.entreprise || m.agence || 'Mission',
      lieu: m.lieu,
      debutMin: m.heureDebutMin,
      finMin: m.heureFinMin + sup + (m.heureFinMin <= m.heureDebutMin ? 1440 : 0),
      trajetMin: m.trajetMin,
      margeMin: d.reglages.margeArriveeMissionMin,
      statut: m.statut,
    });
  }
  for (const r of d.reserves) {
    if (!r.jours.some((j) => j.date === date)) continue;
    out.push({
      type: 'reserve',
      id: r.id,
      titre: 'Réserve',
      lieu: r.lieu,
      debutMin: r.heureArriveeMin,
      finMin: r.heureDepartMin,
      trajetMin: r.trajetMin,
      margeMin: d.reglages.margeArriveeMissionMin,
      statut: r.statut,
    });
  }
  for (const x of d.rdvs) {
    if (x.date !== date) continue;
    out.push(rdvEnEvenement(x));
  }
  return out.sort((a, b) => a.debutMin - b.debutMin);
}

function rdvEnEvenement(x: Rdv): EvenementJour {
  return {
    type: 'rdv',
    id: x.id,
    titre: x.titre,
    lieu: x.adresse,
    debutMin: x.heureMin,
    finMin: x.heureMin + x.dureeMin,
    trajetMin: x.trajetMin,
    margeMin: x.margeMin,
    statut: 'confirme',
  };
}

/** Plages de travail en minutes absolues (repère : `origine` à 00 h 00) pour les alertes de repos. */
export function plagesTravail(d: Donnees, origine: ISODate, jours: number) {
  const out: { debut: number; fin: number }[] = [];
  for (let i = 0; i < jours; i++) {
    const date = addDays(origine, i);
    for (const e of evenementsDuJour(date, d)) {
      if (e.type === 'rdv') continue;
      const base = diffJours(origine, date) * 1440;
      out.push({ debut: base + e.debutMin - e.trajetMin, fin: base + e.finMin + e.trajetMin });
    }
  }
  return out;
}

export interface Rappel {
  /** minutes depuis minuit du jour de l'événement (peut être négatif = veille) */
  minute: number;
  genre: 'coucher_rappel' | 'coucher' | 'reveil' | 'pre_alerte' | 'partir';
  titre: string;
  message: string;
}

/** Liste ordonnée des rappels à programmer pour un événement. */
export function rappelsPour(e: EvenementJour, plan: PlanHoraires, r: Reglages): Rappel[] {
  const rappels: Rappel[] = [
    { minute: plan.rappel_coucher_min, genre: 'coucher_rappel', titre: 'Bientôt l’heure de dormir', message: `Coucher dans ${r.rappelCoucherMin} min` },
    { minute: plan.coucher_min, genre: 'coucher', titre: 'Va te coucher maintenant', message: `Objectif ${Math.round(r.sommeilMin / 60)} h de sommeil` },
    { minute: plan.reveil_min, genre: 'reveil', titre: 'Réveil', message: `${e.titre} à ${hhmm(e.debutMin)}` },
    { minute: plan.pre_alerte_min, genre: 'pre_alerte', titre: `Tu dois partir dans ${r.preAlerteMin} min`, message: e.titre },
    { minute: plan.decision_partir_min, genre: 'partir', titre: 'Tu dois partir maintenant', message: `${e.titre} — arrivée visée ${hhmm(plan.arrivee_visee_min)}` },
  ];
  return rappels.sort((a, b) => a.minute - b.minute);
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
