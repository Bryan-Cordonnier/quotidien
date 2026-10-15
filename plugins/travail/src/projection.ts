// Ce que Travail transmet aux autres plugins (docs/24, A.1.6) : des PROJECTIONS qu'on peut régénérer, jamais la vérité. La vérité reste ici
// (missions, réserve, contrats). Chaque projection est un « remplacer » complet d'un groupe `ref` chez Budget ou chez l'Agenda.
import { ajouterJours, type Jour } from "@etabli/ui/civil";
import { RETARD_JOURS_PAIE, detailReserve, joursDeMission, joursDeReserve, minutesDuJour, paiesContrat, paiesMission, reglagesDeMission } from "./calculs";
import type { Donnees, Reglages } from "./types";

export type ServiceCible = "budget" | "agenda";

export interface Projection {
  service: ServiceCible;
  /** Groupe chez le destinataire (« mission:m1 »). */
  ref: string;
  /** Arguments sans la clé d'idempotence : `previsions` pour Budget, `evenements` pour l'Agenda. */
  contenu: unknown[];
}

/** Empreinte courte et stable d'un contenu (FNV-1a 32 bits) : sert de clé d'idempotence et à repérer ce qui a changé. */
export function empreinte(valeur: unknown): string {
  const texte = JSON.stringify(valeur);
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const cleDe = (p: Projection): string => `${p.service}|${p.ref}`;

/** Fin d'un événement d'agenda : la même heure au début et à la fin (ex. 00:00 → 00:00) fait le jour entier, car l'agenda refuse une durée nulle. */
const finAgenda = (debutMin: number, finMin: number): number => (finMin !== debutMin ? finMin : debutMin === 0 ? 1439 : debutMin - 1);

/**
 * Toutes les projections voulues. Une mission ou une période dont le net réel a été saisi (bulletin) n'a plus de prévision attendue chez
 * Budget (une liste vide : le `remplacer` retire l'attendu sans toucher au réalisé). Chez l'Agenda, chaque jour de mission ou de réserve
 * est un événement « travail » qui porte le type de contrat et le temps de travail du contrat (la pause n'y est pas comptée).
 */
export function projections(d: Donnees, r: Reglages, aujourdhui: Jour): Projection[] {
  const sortie: Projection[] = [];
  const du = ajouterJours(aujourdhui, -RETARD_JOURS_PAIE);
  const au = ajouterJours(aujourdhui, 180);
  for (const m of d.missions) {
    const ref = `mission:${m.id}`;
    const reglages = reglagesDeMission(m, d.agences, r);
    const rythme = d.agences.find((a) => a.id === m.agenceId)?.rythme ?? "fin";
    const titre = m.entreprise ? `${m.libelle} — ${m.entreprise}` : m.libelle;
    sortie.push({
      service: "budget",
      ref,
      contenu: d.bulletins[ref] ? [] : paiesMission(m, reglages, rythme).map((p) => ({ montantCents: p.netCents, jour: p.date, libelle: `${titre} (paie)` })),
    });
    sortie.push({
      service: "agenda",
      ref,
      contenu: joursDeMission(m).map((jour) => ({
        type: "travail",
        contrat: "interim",
        titre: m.libelle,
        lieu: m.entreprise || null,
        jour,
        debutMin: m.debutMin,
        finMin: m.finMin,
        tempsContratMin: minutesDuJour(m),
        trajetMin: m.trajetMin,
      })),
    });
  }
  for (const p of d.reserves) {
    const ref = `reserve:${p.id}`;
    const det = detailReserve(p, r);
    sortie.push({
      service: "budget",
      ref,
      contenu: d.bulletins[ref] || !det.datePaiement || det.netCents <= 0 ? [] : [{ montantCents: det.netCents, jour: det.datePaiement, libelle: `${p.libelle} (réserve)` }],
    });
    sortie.push({
      service: "agenda",
      ref,
      // un événement par jour : arrivée à la base le premier jour, journée entière entre les deux, départ le dernier jour
      contenu: joursDeReserve(p).map((jour) => {
        const premier = jour === p.debut;
        const dernier = jour === p.fin;
        const horsBase = p.joursHorsBase.includes(jour);
        const precision = horsBase ? "hors base" : premier && dernier ? "" : premier ? "arrivée à la base" : dernier ? "départ de la base" : "à la base";
        return {
          type: "travail",
          contrat: "reserve",
          titre: precision ? `${p.libelle} (${precision})` : p.libelle,
          lieu: horsBase || !r.baseLieu ? null : r.baseLieu,
          jour,
          debutMin: premier ? p.arriveeMin : 0,
          finMin: finAgenda(premier ? p.arriveeMin : 0, dernier ? p.departMin : 1439),
          // aucune durée de travail : la réserve est payée au jour, pas à l'heure
          tempsContratMin: null,
          trajetMin: null,
        };
      }),
    });
  }
  for (const c of d.contrats) {
    sortie.push({
      service: "budget",
      ref: `contrat:${c.id}`,
      contenu: paiesContrat(c, r, du, au).filter((p) => p.netCents > 0).map((p) => ({ montantCents: p.netCents, jour: p.datePaiement, libelle: p.libelle })),
    });
  }
  return sortie;
}