// Mise en forme des dates et des durées de la page Travail (français, jamais de date américaine).
import { decomposer, differenceJours, jourDeSemaine, type Jour } from "@etabli/ui/civil";

const pad = (n: number): string => String(n).padStart(2, "0");
const JOURS = ["", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const MOIS = ["", "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 09/10 » */
export function jourMois(j: Jour): string {
  const { mois, jour } = decomposer(j);
  return `${pad(jour)}/${pad(mois)}`;
}

/** « du 01/10 au 28/12 » */
export const periodeCourte = (debut: Jour, fin: Jour | null): string => (fin ? `du ${jourMois(debut)} au ${jourMois(fin)}` : `depuis le ${jourMois(debut)}`);

/** « jeu. 5 nov. » */
export function jourLong(j: Jour): string {
  const { mois, jour } = decomposer(j);
  return `${JOURS[jourDeSemaine(j)]} ${jour} ${MOIS[mois]}`;
}

/** « dans 60 j », « demain », « aujourd'hui » */
export function dans(aujourdhui: Jour, j: Jour): string {
  const n = differenceJours(aujourdhui, j);
  return n <= 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} j`;
}

/** 2195 → « 36 h 35 » */
export function heuresMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)} h ${pad(m % 60)}`;
}