// Les paramètres du manifeste et les réglages des calculs doivent dire la même chose : un taux modifié dans Paramètres change vraiment le net.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { detailMission } from "./calculs";
import { PARAMETRES_DEFAUT, reglagesDepuis } from "./reglages";
import { REGLAGES_DEFAUT, type Mission } from "./types";

const manifeste = JSON.parse(readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8")) as { parameters: { id: string; default: unknown }[] };

describe("paramètres du manifeste", () => {
  it("chaque paramètre déclaré a sa valeur par défaut dans reglages.ts, et inversement", () => {
    const declares = Object.fromEntries(manifeste.parameters.map((p) => [p.id, p.default]));
    expect(declares).toEqual(PARAMETRES_DEFAUT);
  });

  it("les valeurs par défaut des paramètres redonnent exactement les réglages par défaut des calculs", () => {
    expect(reglagesDepuis({ ...PARAMETRES_DEFAUT })).toEqual(REGLAGES_DEFAUT);
    expect(reglagesDepuis(null)).toEqual(REGLAGES_DEFAUT);
    expect(reglagesDepuis({})).toEqual(REGLAGES_DEFAUT);
  });
});

describe("reglagesDepuis", () => {
  it("convertit les pourcentages en points de base, les heures en minutes et les euros en centimes", () => {
    const r = reglagesDepuis({ cotisations: 21.5, seuilSemaine: 39, majoration1: 20, tarifReserve: 96.5, reserveDebut: "07:30", reserveTravail: 7.5, delaiPaie: 5 });
    expect(r).toMatchObject({ cotisationsBp: 2150, seuilSemaineMin: 2340, majorationSup1Bp: 2000, tarifReserveCents: 9650, reserveDebutMin: 450, reserveTravailMin: 450, delaiPaieJours: 5 });
  });

  it("une valeur absente, fausse ou d'un autre type reprend la valeur par défaut", () => {
    const r = reglagesDepuis({ cotisations: "beaucoup", ifm: Number.NaN, reserveDebut: "25:61", seuilSemaine: true });
    expect(r.cotisationsBp).toBe(2200);
    expect(r.ifmBp).toBe(1000);
    expect(r.reserveDebutMin).toBe(480);
    expect(r.seuilSemaineMin).toBe(2100);
  });

  it("un taux réglé change le net : 20 % de cotisations au lieu de 22 %", () => {
    const m: Mission = { id: "m1", libelle: "M", entreprise: "", agenceId: null, trajetMin: null, panierCents: 0, deplacementCents: 0, debut: "2026-10-05", fin: "2026-10-09", joursSemaine: [1, 2, 3, 4, 5], exclusions: [], debutMin: 480, finMin: 900, pauseMin: 0, tauxHoraireCents: 1300, supplementaires: [] };
    expect(detailMission(m, reglagesDepuis({})).netCents).toBe(42_943);
    expect(detailMission(m, reglagesDepuis({ cotisations: 20 })).netCents).toBe(44_044);
  });
});