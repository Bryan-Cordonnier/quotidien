// Le sommeil : le coucher qu'on note (« je vais dormir maintenant »), la durée de la nuit (jusqu'au lever prévu le lendemain) et la grille
// des nuits, du rouge au vert selon la cible. Fonctions pures.
import { ajouterJours, comparerJours, instantVersLocal, lundiDe, type Jour } from "@etabli/ui/civil";
import type { Carnet } from "./types";

/** Avant cette heure (4 h), un coucher appartient à la nuit qui a commencé la veille au soir. */
export const HEURE_LIMITE_NUIT_MIN = 4 * 60;

/** Au-delà, la durée calculée n'est pas un vrai sommeil : on ne la compte pas. */
export const DUREE_MAX_NUIT_MIN = 16 * 60;

export interface Coucher {
  /** Le jour du soir : la nuit du 8 au 9 octobre est « 8 octobre ». */
  jourSoir: Jour;
  /** Minutes depuis minuit du jour du soir (au-delà de 1 440 : après minuit). */
  coucherMin: number;
}

export function coucherDe(instantMs: number): Coucher {
  const { jour, minutes } = instantVersLocal(instantMs);
  return minutes < HEURE_LIMITE_NUIT_MIN ? { jourSoir: ajouterJours(jour, -1), coucherMin: minutes + 1440 } : { jourSoir: jour, coucherMin: minutes };
}

/** Note le coucher (le dernier de la nuit l'emporte) ; ne change rien d'autre. */
export function noterCoucher(c: Carnet, instantMs: number): { carnet: Carnet; coucher: Coucher } {
  const coucher = coucherDe(instantMs);
  return { carnet: { ...c, sommeil: { ...c.sommeil, [coucher.jourSoir]: coucher.coucherMin } }, coucher };
}

/** Durée de la nuit commencée le soir de `jourSoir`, ou `null` s'il n'y a pas de coucher noté ou si le lever prévu est avant. */
export function dureeNuit(c: Carnet, jourSoir: Jour, leverLendemainMin: number): number | null {
  const coucher = c.sommeil[jourSoir];
  if (coucher === undefined) return null;
  const duree = leverLendemainMin + 1440 - coucher;
  // Une « nuit » de plus de 16 h n'en est pas une (coucher noté au petit matin, par exemple) : elle ne compte pas.
  return duree > 0 && duree <= DUREE_MAX_NUIT_MIN ? duree : null;
}

export type Zone = "z0" | "z1" | "z2" | "z3" | "z4";

/** Du rouge (z0) au vert (z4) : la part de la cible de sommeil réellement dormie. */
export function zone(minutes: number, cibleMin: number): Zone {
  const r = cibleMin > 0 ? minutes / cibleMin : 1;
  return r >= 0.97 ? "z4" : r >= 0.88 ? "z3" : r >= 0.78 ? "z2" : r >= 0.66 ? "z1" : "z0";
}

export interface CaseNuit {
  jour: Jour;
  /** Durée de la nuit commencée ce soir-là, ou `null` (rien de noté, ou jour pas encore passé). */
  minutes: number | null;
  zone: Zone | null;
  futur: boolean;
}

/**
 * La grille de `semaines` colonnes (une par semaine, du lundi au dimanche, la semaine en cours en dernier). Une nuit se compte le soir de
 * son coucher : celle qui commence aujourd'hui n'a pas fini, elle est « à venir » tant que le lever n'est pas passé.
 */
export function grilleNuits(c: Carnet, aujourdhui: Jour, semaines: number, cibleMin: number, leverDuJour: (jour: Jour) => number): CaseNuit[][] {
  const debut = ajouterJours(lundiDe(aujourdhui), -7 * (semaines - 1));
  return Array.from({ length: semaines }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const jour = ajouterJours(debut, w * 7 + d);
      const futur = comparerJours(jour, aujourdhui) > 0;
      const minutes = futur ? null : dureeNuit(c, jour, leverDuJour(ajouterJours(jour, 1)));
      return { jour, minutes, zone: minutes === null ? null : zone(minutes, cibleMin), futur };
    }),
  );
}

/** Sommeil moyen des nuits notées parmi les `n` derniers jours (aujourd'hui compris), ou `null` s'il n'y en a aucune. */
export function sommeilMoyen(c: Carnet, aujourdhui: Jour, n: number, leverDuJour: (jour: Jour) => number): number | null {
  const durees: number[] = [];
  for (let k = 0; k < n; k++) {
    const jour = ajouterJours(aujourdhui, -k);
    const d = dureeNuit(c, jour, leverDuJour(ajouterJours(jour, 1)));
    if (d !== null) durees.push(d);
  }
  return durees.length ? Math.round(durees.reduce((s, x) => s + x, 0) / durees.length) : null;
}