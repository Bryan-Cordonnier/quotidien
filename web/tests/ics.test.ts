import { beforeAll, describe, expect, it } from 'vitest';
import { chargerCoeur } from './helpers';
import { dateHeureLocale, genererIcs } from '../src/lib/ics';
import { REGLAGES_DEFAUT, type Donnees } from '../src/lib/types';

beforeAll(chargerCoeur);

describe('ics', () => {
  it('minutes négatives = veille', () => {
    expect(dateHeureLocale('2026-11-02', 430)).toBe('20261102T071000');
    expect(dateHeureLocale('2026-11-02', -110)).toBe('20261101T221000');
    expect(dateHeureLocale('2026-11-02', 1500)).toBe('20261103T010000');
  });

  it('génère événement + alarmes pour une mission', () => {
    const d: Donnees = {
      version: 1,
      reserves: [],
      rdvs: [],
      reglages: { ...REGLAGES_DEFAUT, majorationTrajetPct: 0 },
      missions: [{
        id: 'm1', agence: '', entreprise: 'Test', lieu: 'Bayonne', debut: '2026-11-02', fin: '2026-11-02',
        joursSemaine: [0], heureDebutMin: 480, heureFinMin: 960, pauseMin: 60, tauxCents: 1300, tauxSupCents: 1625,
        seuilHebdoMin: 2100, trajetMin: 30, statut: 'confirme', ajustementsSup: {}, exclusions: [],
      }],
    };
    const ics = genererIcs(d, '2026-11-02', '2026-11-02');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(6); // 1 mission + 5 rappels
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(5);
    expect(ics).toContain('DTSTART:20261102T071000'); // « pars maintenant »
    expect(ics).toContain('SUMMARY:Tu dois partir maintenant');
    expect(ics).toMatch(/\r\n$/);
  });
});
