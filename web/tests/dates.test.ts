import { describe, expect, it } from 'vitest';
import { addDays, debutSemaine, depuisMinutes, diffJours, formatHeure, grilleMois, jourSemaine } from '../src/lib/dates';

describe('dates', () => {
  it('jour de la semaine : lundi = 0', () => {
    expect(jourSemaine('2026-10-05')).toBe(0); // lundi 5 octobre 2026
    expect(jourSemaine('2026-10-03')).toBe(5); // samedi
    expect(jourSemaine('2026-10-04')).toBe(6);
  });
  it('début de semaine', () => {
    expect(debutSemaine('2026-10-08')).toBe('2026-10-05');
    expect(debutSemaine('2026-10-05')).toBe('2026-10-05');
    expect(debutSemaine('2026-10-11')).toBe('2026-10-05');
  });
  it('addDays traverse les mois et les années', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('diffJours', () => {
    expect(diffJours('2026-10-03', '2026-10-17')).toBe(14);
  });
  it('grille de mois : 42 jours, commence un lundi', () => {
    const g = grilleMois(2026, 9);
    expect(g).toHaveLength(42);
    expect(jourSemaine(g[0])).toBe(0);
    expect(g).toContain('2026-10-01');
    expect(g).toContain('2026-10-31');
  });
  it('formatHeure gère la veille', () => {
    expect(formatHeure(430)).toBe('07:10');
    expect(formatHeure(-110)).toBe('22:10 (veille)');
    expect(depuisMinutes(-110)).toBe('22:10');
  });
});
