import { addDays, plage } from './dates';
import { evenementsDuJour, horairesJournee, rappelsPour, type EvenementJour } from './planning';
import type { Donnees, ISODate } from './types';

/** Date-heure locale « flottante » (sans fuseau) ; gère les minutes négatives ou ≥ 24 h. */
export function dateHeureLocale(date: ISODate, minute: number): string {
  const decalage = Math.floor(minute / 1440);
  const d = addDays(date, decalage).replaceAll('-', '');
  const r = minute - decalage * 1440;
  return `${d}T${String(Math.floor(r / 60)).padStart(2, '0')}${String(r % 60).padStart(2, '0')}00`;
}

const echapper = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);

function evenement(uid: string, debut: string, fin: string, titre: string, description: string, alarme: boolean): string {
  const l = [
    'BEGIN:VEVENT',
    `UID:${uid}@budget-planning`,
    `DTSTAMP:${debut}`,
    `DTSTART:${debut}`,
    `DTEND:${fin}`,
    `SUMMARY:${echapper(titre)}`,
  ];
  if (description) l.push(`DESCRIPTION:${echapper(description)}`);
  if (alarme) l.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${echapper(titre)}`, 'TRIGGER:PT0S', 'END:VALARM');
  l.push('END:VEVENT');
  return l.join('\r\n');
}

/**
 * Flux iCalendar : les événements, plus un mini-événement avec alarme pour chaque rappel
 * (coucher, réveil, « pars dans 5 min », « pars maintenant »). Lu par Calendrier (iPhone)
 * et Agenda (Android) ; sert de filet de sécurité aux alarmes natives.
 */
export function genererIcs(d: Donnees, debut: ISODate, fin: ISODate): string {
  const blocs: string[] = [];
  for (const date of plage(debut, fin)) {
    const evts = evenementsDuJour(date, d);
    evts.forEach((e: EvenementJour, i) => {
      const uid = `${date}-${e.type}-${e.id}`;
      blocs.push(evenement(uid, dateHeureLocale(date, e.debutMin), dateHeureLocale(date, e.finMin), e.titre, e.lieu, false));
      if (i !== 0) return;
      const plan = horairesJournee(e.debutMin, e.trajetMin, e.margeMin, d.reglages);
      for (const r of rappelsPour(e, plan, d.reglages)) {
        const t = dateHeureLocale(date, r.minute);
        const fin5 = dateHeureLocale(date, r.minute + 5);
        blocs.push(evenement(`${uid}-${r.genre}`, t, fin5, r.titre, r.message, true));
      }
    });
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Budget Planning//FR', 'CALSCALE:GREGORIAN', ...blocs, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
