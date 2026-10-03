import type { ISODate } from './types';

const JOUR_MS = 86_400_000;

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISO(new Date(parseISO(s).getTime() + n * JOUR_MS));
}

/** Lundi = 0 … dimanche = 6. */
export function jourSemaine(s: ISODate): number {
  return (parseISO(s).getUTCDay() + 6) % 7;
}

export function debutSemaine(s: ISODate): ISODate {
  return addDays(s, -jourSemaine(s));
}

/** Nombre de jours entre deux dates (b − a). */
export function diffJours(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / JOUR_MS);
}

export function plage(debut: ISODate, fin: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = debut; d <= fin; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Grille de 6 semaines (42 jours) commençant un lundi, pour un mois donné (mois 0-11). */
export function grilleMois(annee: number, mois: number): ISODate[] {
  const premier = toISO(new Date(Date.UTC(annee, mois, 1)));
  const debut = debutSemaine(premier);
  return Array.from({ length: 42 }, (_, i) => addDays(debut, i));
}

export function aujourdhui(): ISODate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function libelleJour(s: ISODate): string {
  const d = parseISO(s);
  return `${JOURS[jourSemaine(s)]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`;
}

/** « 07:10 » ; une valeur négative ou ≥ 24 h ajoute un suffixe de jour (« 22:10 (veille) »). */
export function formatHeure(min: number): string {
  const jour = Math.floor(min / 1440);
  const r = min - jour * 1440;
  const hhmm = `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
  if (jour === 0) return hhmm;
  if (jour === -1) return `${hhmm} (veille)`;
  return jour < 0 ? `${hhmm} (J${jour})` : `${hhmm} (J+${jour})`;
}

export function enMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function depuisMinutes(min: number): string {
  const r = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(r / 60)).padStart(2, '0')}:${String(r % 60).padStart(2, '0')}`;
}

export function formatDuree(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}` : `${m} min`;
}

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export function formatEuros(cents: number): string {
  return EUR.format(cents / 100);
}
