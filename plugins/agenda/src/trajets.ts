// Les trajets de la journée : « je suis parti » et « je suis arrivé ». Le logiciel devine de quel trajet on parle d'après l'heure et ce qui a
// déjà été noté, et REFUSE un bouton hors de propos (partir quand on est déjà parti, arriver sans être parti, partir bien trop tôt).
// Les heures réelles sont gardées : elles serviront à ajuster les temps de trajet et la marge d'arrivée. Fonctions pures.
import type { Jour } from "@etabli/ui/civil";
import type { Segment } from "./journee";
import type { Carnet, TrajetNote } from "./types";

/** On accepte « je suis parti » jusqu'à une heure avant l'heure conseillée. */
export const AVANCE_MAX_MIN = 60;
/** Un trajet dont l'arrivée prévue est passée depuis plus de 1 h 30 sans « arrivé » est laissé de côté (on a oublié d'appuyer). */
export const OUBLI_MIN = 90;

const notesDe = (c: Carnet, jour: Jour): Record<string, TrajetNote> => c.trajets[jour] ?? {};

/** Le numéro du trajet visé à cette heure (minutes depuis minuit), ou -1 s'il n'y en a plus. */
export function cible(trajets: readonly Segment[], notes: Record<string, TrajetNote>, maintenantMin: number): number {
  for (let i = 0; i < trajets.length; i++) {
    const n = notes[String(i)];
    if (n && n.arrivee !== null) continue;
    if (maintenantMin <= trajets[i]!.finMin + OUBLI_MIN) return i;
  }
  return -1;
}

export type Etat = "fait" | "en_route" | "prochain" | "a_venir";

/** L'état de chaque trajet de la journée, pour les petits points d'avancement. */
export function etats(trajets: readonly Segment[], notes: Record<string, TrajetNote>, maintenantMin: number): Etat[] {
  const visee = cible(trajets, notes, maintenantMin);
  return trajets.map((_, i) => {
    const n = notes[String(i)];
    return n && n.arrivee !== null ? "fait" : n ? "en_route" : i === visee ? "prochain" : "a_venir";
  });
}

export interface Reponse {
  carnet: Carnet;
  ok: boolean;
  texte: string;
}

const hhmm = (min: number): string => `${String(Math.floor((((min % 1440) + 1440) % 1440) / 60)).padStart(2, "0")}:${String((((min % 1440) + 1440) % 1440) % 60).padStart(2, "0")}`;
const duree = (min: number): string => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`);
const libelle = (s: Segment): string => `${s.titre === "Trajet retour" ? "trajet retour" : s.titre === "Trajet direct" ? "trajet direct" : "trajet"}${s.detail ? ` (${s.detail})` : ""}`;

export function jeSuisParti(c: Carnet, jour: Jour, trajets: readonly Segment[], maintenantMin: number): Reponse {
  const notes = notesDe(c, jour);
  const i = cible(trajets, notes, maintenantMin);
  const refus = (texte: string): Reponse => ({ carnet: c, ok: false, texte });
  if (i < 0) return refus("Il n'y a plus de trajet aujourd'hui : « Je suis parti » est refusé.");
  const t = trajets[i]!;
  const note = notes[String(i)];
  if (note) return refus(`Refusé : vous êtes déjà parti à ${hhmm(note.depart)}. Appuyez sur « Je suis arrivé » en arrivant.`);
  if (maintenantMin < t.debutMin - AVANCE_MAX_MIN) return refus(`Refusé : le prochain ${libelle(t)} est à ${hhmm(t.debutMin)}, dans ${duree(t.debutMin - maintenantMin)}. Rien à noter pour l'instant.`);
  const ecart = maintenantMin - t.debutMin;
  const quand = ecart > 0 ? `${ecart} min après` : ecart < 0 ? `${-ecart} min avant` : "pile à";
  return {
    carnet: { ...c, trajets: { ...c.trajets, [jour]: { ...notes, [String(i)]: { depart: maintenantMin, arrivee: null } } } },
    ok: true,
    texte: `Départ noté à ${hhmm(maintenantMin)} (${libelle(t)}) : ${quand} l'heure conseillée.`,
  };
}

export function jeSuisArrive(c: Carnet, jour: Jour, trajets: readonly Segment[], maintenantMin: number): Reponse {
  const notes = notesDe(c, jour);
  const i = cible(trajets, notes, maintenantMin);
  const refus = (texte: string): Reponse => ({ carnet: c, ok: false, texte });
  if (i < 0) return refus("Il n'y a plus de trajet aujourd'hui : « Je suis arrivé » est refusé.");
  const t = trajets[i]!;
  const note = notes[String(i)];
  if (!note) return refus(`Refusé : vous n'êtes pas parti. Le prochain départ est à ${hhmm(t.debutMin)} (${libelle(t)}) : appuyez d'abord sur « Je suis parti ».`);
  const reel = maintenantMin - note.depart;
  const prevu = t.finMin - t.debutMin;
  const ecart = reel - prevu;
  return {
    carnet: { ...c, trajets: { ...c.trajets, [jour]: { ...notes, [String(i)]: { depart: note.depart, arrivee: maintenantMin } } } },
    ok: true,
    texte: `Arrivée notée à ${hhmm(maintenantMin)} : trajet réel ${duree(reel)} pour ${duree(prevu)} estimées (${ecart > 0 ? "+" : ""}${ecart} min). Enregistré pour ajuster les temps de trajet.`,
  };
}