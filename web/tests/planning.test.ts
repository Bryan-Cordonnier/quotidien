import { beforeAll, describe, expect, it } from 'vitest';
import { chargerCoeur } from './helpers';
import { evenementsDuJour, horairesJournee, joursMission, payeMission, payeReserve, plagesTravail, rappelsPour } from '../src/lib/planning';
import { coeur } from '../src/lib/wasm';
import { REGLAGES_DEFAUT, type Donnees, type Mission, type Reserve } from '../src/lib/types';

const mission = (p: Partial<Mission> = {}): Mission => ({
  id: 'm1',
  agence: 'Agence',
  entreprise: 'Chaudronnerie Test',
  lieu: 'Bayonne',
  debut: '2026-11-02', // lundi
  fin: '2026-11-13', // vendredi suivant
  joursSemaine: [0, 1, 2, 3, 4],
  heureDebutMin: 8 * 60,
  heureFinMin: 16 * 60,
  pauseMin: 60,
  tauxCents: 1300,
  tauxSupCents: 1625,
  seuilHebdoMin: 2100,
  trajetMin: 30,
  statut: 'confirme',
  ajustementsSup: {},
  exclusions: [],
  ...p,
});

const donnees = (m: Mission[] = [], r: Reserve[] = []): Donnees => ({
  version: 1,
  missions: m,
  reserves: r,
  rdvs: [],
  reglages: { ...REGLAGES_DEFAUT },
});

beforeAll(chargerCoeur);

describe('missions', () => {
  it('jours travaillés : 2 semaines × 5 jours', () => {
    expect(joursMission(mission())).toHaveLength(10);
  });
  it('les absences sont retirées', () => {
    expect(joursMission(mission({ exclusions: ['2026-11-03'] }))).toHaveLength(9);
  });
  it('net de 2 semaines à 35 h', () => {
    const p = payeMission(mission(), REGLAGES_DEFAUT);
    expect(p.minutes_normales).toBe(2 * 2100);
    expect(p.minutes_sup).toBe(0);
    expect(p.net_cents).toBe(2 * 42_943 + 0); // 2 semaines identiques (arrondis par semaine non cumulés ici)
  });
  it('une absence réduit le net', () => {
    const plein = payeMission(mission(), REGLAGES_DEFAUT).net_cents;
    const absent = payeMission(mission({ exclusions: ['2026-11-03'] }), REGLAGES_DEFAUT).net_cents;
    expect(absent).toBeLessThan(plein);
  });
  it('+1 h sup un soir est payée au taux sup', () => {
    const base = payeMission(mission(), REGLAGES_DEFAUT);
    const aj = payeMission(mission({ ajustementsSup: { '2026-11-04': 60 } }), REGLAGES_DEFAUT);
    expect(aj.minutes_sup).toBe(60);
    expect(aj.brut_base_cents - base.brut_base_cents).toBe(1625);
  });
});

describe('réserve', () => {
  it('13 jours hors base', () => {
    const r: Reserve = {
      id: 'r1',
      lieu: 'Caserne',
      jours: Array.from({ length: 13 }, (_, i) => ({ date: `2026-10-${String(17 + i).padStart(2, '0')}`, horsBase: true })),
      heureArriveeMin: 7 * 60,
      heureDepartMin: 18 * 60,
      tarifJourCents: 6000,
      indemniteHorsBaseCents: 3800,
      trajetMin: 45,
      statut: 'confirme',
    };
    expect(payeReserve(r, REGLAGES_DEFAUT).net_cents).toBe(110_240);
  });
});

describe('horaires et rappels', () => {
  it('exemple 8 h / trajet 30 min / marge 10 min', () => {
    const r = { ...REGLAGES_DEFAUT, majorationTrajetPct: 0 };
    const p = horairesJournee(8 * 60, 30, 10, r);
    expect(p.arrivee_visee_min).toBe(7 * 60 + 50);
    expect(p.depart_reel_min).toBe(7 * 60 + 20);
    expect(p.decision_partir_min).toBe(7 * 60 + 10);
  });
  it('les rappels sont ordonnés et incluent partir maintenant', () => {
    const d = donnees([mission()]);
    const [e] = evenementsDuJour('2026-11-02', d);
    const plan = horairesJournee(e.debutMin, e.trajetMin, e.margeMin, d.reglages);
    const rappels = rappelsPour(e, plan, d.reglages);
    expect(rappels.map((x) => x.genre)).toEqual(['coucher_rappel', 'coucher', 'reveil', 'pre_alerte', 'partir']);
    expect(rappels[0].minute).toBeLessThan(0);
    for (let i = 1; i < rappels.length; i++) expect(rappels[i].minute).toBeGreaterThanOrEqual(rappels[i - 1].minute);
  });
  it('alerte de repos entre deux missions trop rapprochées', () => {
    const tard = mission({ id: 'm1', debut: '2026-11-02', fin: '2026-11-02', heureDebutMin: 14 * 60, heureFinMin: 22 * 60 });
    const tot = mission({ id: 'm2', debut: '2026-11-03', fin: '2026-11-03', heureDebutMin: 6 * 60, heureFinMin: 14 * 60 });
    const d = donnees([tard, tot]);
    const alertes = coeur.repos(plagesTravail(d, '2026-11-02', 2));
    expect(alertes.some((a) => a.type === 'repos_insuffisant')).toBe(true);
  });
});
