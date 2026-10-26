// Lieux et trajets automatiques : les adresses des lieux qui reviennent (le travail…), et le temps de trajet calculé (avec les bouchons prévus) pour chaque événement qui a un lieu. Fonctions pures : le calcul
// lui-même (TomTom) est fait par le moteur, la session ne fait qu'appeler `aCalculer` puis `avecTrajet`.
import { ajouterJours, comparerJours, type Jour } from "@etabli/ui/civil";
import { ErreurAgenda, type Carnet, type Lieu, type Occurrence, type TrajetAuto } from "./types";

/** Au plus tant de calculs par passage (le quota gratuit de TomTom est large, mais inutile de le gaspiller). */
export const CALCULS_PAR_PASSAGE = 20;
/** Jours à l'avance pour lesquels les trajets sont calculés. */
export const JOURS_AVANCE = 7;
/** Au-delà, un trajet calculé est sûrement une adresse mal trouvée : il n'est pas utilisé (il fausserait réveil et coucher). */
export const TRAJET_MAX_MIN = 240;

const norme = (t: string): string => t.trim().toLocaleLowerCase("fr");

/** L'adresse à donner à TomTom pour le lieu d'un événement : celle d'un lieu enregistré du même nom, sinon le texte tel quel. */
export const adresseDe = (c: Carnet, lieu: string): string => c.lieux.find((l) => norme(l.nom) === norme(lieu))?.adresse ?? lieu.trim();

export const cleTrajet = (o: Pick<Occurrence, "evenementId" | "jour">): string => `${o.evenementId}|${o.jour}`;

export interface Demande {
  cle: string;
  depuis: string;
  vers: string;
  jour: Jour;
  /** Arriver avant (minutes depuis minuit du jour). */
  arriveeMin: number;
}

/**
 * Les trajets à (re)calculer : chaque événement avec un lieu, d'aujourd'hui à `JOURS_AVANCE` jours. Un calcul reste bon 24 h, sauf pour
 * aujourd'hui et demain où il se refait toutes les 30 min (les bouchons changent) ; il se refait aussi si l'on change d'endroit où l'on dort.
 */
export function aCalculer(c: Carnet, occ: readonly Occurrence[], aujourdhui: Jour, maintenant: number): Demande[] {
  if (!c.trajetsAutoActifs) return [];
  const fin = ajouterJours(aujourdhui, JOURS_AVANCE);
  const sortie: Demande[] = [];
  for (const o of occ) {
    if (!o.lieu || comparerJours(o.jour, aujourdhui) < 0 || comparerJours(o.jour, fin) > 0) continue;
    // Le départ est réglé dans le moteur (Paramètres → Trajets : un domicile ou le GPS) : on recalcule souvent pour suivre un changement.
    const depuis = "";
    const vers = adresseDe(c, o.lieu);
    const deja = c.trajetsAuto[cleTrajet(o)];
    const proche = comparerJours(o.jour, ajouterJours(aujourdhui, 1)) <= 0;
    const valide = deja && deja.vers === vers && maintenant - deja.calculeLe < (proche ? 30 : 6 * 60) * 60_000;
    if (!valide) sortie.push({ cle: cleTrajet(o), depuis, vers, jour: o.jour, arriveeMin: o.debutMin - c.reglages.margeArriveeMin });
    if (sortie.length >= CALCULS_PAR_PASSAGE) break;
  }
  return sortie;
}

/** Garde le résultat d'un calcul ; les calculs de jours passés sont oubliés. */
export function avecTrajet(c: Carnet, d: Demande, minutes: number, maintenant: number, aujourdhui: Jour): Carnet {
  const gardes = Object.fromEntries(Object.entries(c.trajetsAuto).filter(([k]) => comparerJours(k.split("|")[1] ?? "", aujourdhui) >= 0));
  const t: TrajetAuto = { min: Math.max(1, Math.round(minutes)), depuis: d.depuis, vers: d.vers, calculeLe: maintenant };
  return { ...c, trajetsAuto: { ...gardes, [d.cle]: t } };
}

/** Une occurrence avec son trajet calculé (s'il y en a un), à la place du trajet saisi à la main. */
export function avecTrajetAuto(o: Occurrence, c: Pick<Carnet, "trajetsAuto" | "trajetsAutoActifs">): Occurrence {
  if (!c.trajetsAutoActifs) return o;
  const t = c.trajetsAuto[cleTrajet(o)];
  return t && t.min <= TRAJET_MAX_MIN ? { ...o, trajetMin: t.min } : o;
}

// ——— Lieux et séjours ———

const NOM_MAX = 60;
const ADRESSE_MAX = 200;

function verifierLieu(nom: string, adresse: string): void {
  if (!nom.trim() || nom.trim().length > NOM_MAX) throw new ErreurAgenda("argument_invalide", `Le nom du lieu : 1 à ${NOM_MAX} caractères.`);
  if (!adresse.trim() || adresse.trim().length > ADRESSE_MAX) throw new ErreurAgenda("argument_invalide", `L'adresse : 1 à ${ADRESSE_MAX} caractères.`);
}

/** Ajoute ou modifie un lieu. Un seul logement par défaut : en cocher un décoche les autres. */
export function enregistrerLieu(c: Carnet, l: Omit<Lieu, "id"> & { id?: string }): Carnet {
  verifierLieu(l.nom, l.adresse);
  const id = l.id ?? `l${c.lieux.reduce((n, x) => Math.max(n, Number(x.id.slice(1)) || 0), 0) + 1}`;
  const lieu: Lieu = { id, nom: l.nom.trim(), adresse: l.adresse.trim(), logement: l.logement };
  const autres = c.lieux.filter((x) => x.id !== id).map((x) => (lieu.logement ? { ...x, logement: false } : x));
  if (autres.some((x) => norme(x.nom) === norme(lieu.nom))) throw new ErreurAgenda("argument_invalide", `Un lieu « ${lieu.nom} » existe déjà.`);
  const existait = c.lieux.some((x) => x.id === id);
  return { ...c, lieux: existait ? c.lieux.map((x) => (x.id === id ? lieu : (autres.find((a) => a.id === x.id) ?? x))) : [...autres, lieu] };
}

export function supprimerLieu(c: Carnet, id: string): Carnet {
  return { ...c, lieux: c.lieux.filter((l) => l.id !== id) };
}
