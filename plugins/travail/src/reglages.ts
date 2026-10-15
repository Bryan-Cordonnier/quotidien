// Les réglages de Travail sont les paramètres que le plugin déclare au moteur (`parameters` du manifeste) : l'utilisateur les règle dans
// Paramètres → Travail, le moteur les envoie aux pages. Ce fichier fait le pont entre les valeurs des paramètres (pourcentages, heures, euros)
// et ce que les calculs veulent (points de base, minutes, centimes entiers). Les mêmes identifiants et valeurs par défaut sont dans le manifeste.
import { REGLAGES_DEFAUT, type Reglages } from "./types";

export type Parametres = Record<string, number | string | boolean>;

/** Valeurs par défaut, dans les unités des paramètres (celles du manifeste). */
export const PARAMETRES_DEFAUT = {
  cotisations: 22,
  ifm: 10,
  cp: 10,
  seuilSemaine: 35,
  majoration1: 25,
  majoration2: 50,
  seuilMajoration1: 8,
  delaiPaie: 7,
  tarifReserve: 60,
  indemniteReserve: 38,
  tarifHorsBase: 0,
  precarite: 10,
  cpCdd: 10,
  reserveDebut: "08:00",
  reserveFin: "17:00",
  baseNom: "",
  baseAdresse: "",
} as const;

const texte = (v: unknown): string => (typeof v === "string" ? v.trim().slice(0, 200) : "");
const nombre = (v: unknown, repli: number): number => (typeof v === "number" && Number.isFinite(v) ? v : repli);
const heure = (v: unknown, repli: string): number => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(typeof v === "string" ? v : repli) ?? /^(\d\d):(\d\d)$/.exec(repli)!;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** Réglages des calculs d'après les valeurs des paramètres ; une valeur absente ou fausse reprend celle de `REGLAGES_DEFAUT`. */
export function reglagesDepuis(p: Parametres | null | undefined): Reglages {
  const v = p ?? {};
  const d = PARAMETRES_DEFAUT;
  return {
    ...REGLAGES_DEFAUT,
    cotisationsBp: Math.round(nombre(v.cotisations, d.cotisations) * 100),
    ifmBp: Math.round(nombre(v.ifm, d.ifm) * 100),
    cpBp: Math.round(nombre(v.cp, d.cp) * 100),
    seuilSemaineMin: Math.round(nombre(v.seuilSemaine, d.seuilSemaine) * 60),
    majorationSup1Bp: Math.round(nombre(v.majoration1, d.majoration1) * 100),
    majorationSup2Bp: Math.round(nombre(v.majoration2, d.majoration2) * 100),
    seuilSup1Min: Math.round(nombre(v.seuilMajoration1, d.seuilMajoration1) * 60),
    delaiPaieJours: Math.round(nombre(v.delaiPaie, d.delaiPaie)),
    tarifReserveCents: Math.round(nombre(v.tarifReserve, d.tarifReserve) * 100),
    indemniteReserveCents: Math.round(nombre(v.indemniteReserve, d.indemniteReserve) * 100),
    tarifHorsBaseCents: Math.round(nombre(v.tarifHorsBase, d.tarifHorsBase) * 100),
    precariteBp: Math.round(nombre(v.precarite, d.precarite) * 100),
    cpCddBp: Math.round(nombre(v.cpCdd, d.cpCdd) * 100),
    reserveDebutMin: heure(v.reserveDebut, d.reserveDebut),
    reserveFinMin: heure(v.reserveFin, d.reserveFin),
    baseLieu: texte(v.baseAdresse) || texte(v.baseNom),
  };
}
