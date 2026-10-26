// Lieux et trajets automatiques : les adresses enregistrées (chez maman, chez mamie, le travail…), l'endroit où l'on dort selon la
// période, et le temps de trajet calculé (avec les bouchons prévus) pour chaque événement qui a un lieu. Fonctions pures : le calcul
// lui-même (TomTom) est fait par le moteur, la session ne fait qu'appeler `aCalculer` puis `avecTrajet`.
import { ajouterJours, comparerJours, type Jour } from "@etabli/ui/civil";
import { ErreurAgenda, type Carnet, type Lieu, type Occurrence, type Sejour, type TrajetAuto } from "./types";

/** Au plus tant de calculs par passage (le quota gratuit de TomTom est large, mais inutile de le gaspiller). */
export const CALCULS_PAR_PASSAGE = 20;
/** Jours à l'avance pour lesquels les trajets sont calculés. */
export const JOURS_AVANCE = 7;

const norme = (t: string): string => t.trim().toLocaleLowerCase("fr");

/** Le lieu où l'on dort ce jour-là : le séjour qui le couvre (le plus récent gagne), sinon le logement par défaut. */
export function logementDu(c: Carnet, jour: Jour): Lieu | null {
  const sejour = [...c.sejours]
    .filter((s) => comparerJours(s.du, jour) <= 0 && (s.au === null || comparerJours(jour, s.au) <= 0))
    .sort((a, b) => comparerJours(b.du, a.du))[0];
  const id = sejour?.lieuId ?? c.lieux.find((l) => l.logement)?.id;
  return c.lieux.find((l) => l.id === id) ?? null;
}

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
    const logement = logementDu(c, o.jour);
    const depuis = logement?.adresse ?? "";
    const vers = adresseDe(c, o.lieu);
    if (norme(vers) === norme(depuis)) continue;
    const deja = c.trajetsAuto[cleTrajet(o)];
    const proche = comparerJours(o.jour, ajouterJours(aujourdhui, 1)) <= 0;
    const valide = deja && deja.depuis === depuis && deja.vers === vers && maintenant - deja.calculeLe < (proche ? 30 : 24 * 60) * 60_000;
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
  return t ? { ...o, trajetMin: t.min } : o;
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
  return { ...c, lieux: c.lieux.filter((l) => l.id !== id), sejours: c.sejours.filter((s) => s.lieuId !== id) };
}

/** « Je dors chez mamie du 28 octobre au … » (`au` vide : jusqu'à nouvel ordre). */
export function ajouterSejour(c: Carnet, s: Sejour): Carnet {
  if (!c.lieux.some((l) => l.id === s.lieuId)) throw new ErreurAgenda("introuvable", "Lieu introuvable.");
  if (s.au !== null && comparerJours(s.au, s.du) < 0) throw new ErreurAgenda("argument_invalide", "La fin du séjour ne peut pas précéder son début.");
  return { ...c, sejours: [...c.sejours, s].sort((a, b) => comparerJours(a.du, b.du)) };
}

export function supprimerSejour(c: Carnet, index: number): Carnet {
  return { ...c, sejours: c.sejours.filter((_, i) => i !== index) };
}
