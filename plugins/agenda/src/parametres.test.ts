import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PARAMETRES_DEFAUT, reglagesDepuis } from "./parametres";
import { REGLAGES_DEFAUT } from "./types";

const manifeste = JSON.parse(readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8")) as { parameters: { id: string; default: unknown }[] };

describe("paramètres du manifeste", () => {
  it("chaque paramètre déclaré a sa valeur par défaut dans parametres.ts, et inversement", () => {
    expect(Object.fromEntries(manifeste.parameters.map((p) => [p.id, p.default]))).toEqual(PARAMETRES_DEFAUT);
  });

  it("les valeurs par défaut redonnent les réglages par défaut du carnet", () => {
    const r = reglagesDepuis({ ...PARAMETRES_DEFAUT });
    expect(r.carnet).toEqual({ ...REGLAGES_DEFAUT, majorationTrajetBp: 0 });
    expect(r.rappelsHoraires).toBe(true);
    expect(r.journee).toMatchObject({ leverDefautMin: 480, enchainerMin: 90, sommeilMin: 480 });
    expect(reglagesDepuis(null)).toEqual(r);
  });

  it("convertit heures, minutes et pourcentages ; une valeur fausse reprend la valeur par défaut", () => {
    const r = reglagesDepuis({ sommeil: 7.5, majoration: 15, leverDefaut: "06:30", enchainer: 60, rappelsHoraires: false, marge: 15 });
    expect(r.carnet).toMatchObject({ sommeilMin: 450, majorationTrajetBp: 1500, margeArriveeMin: 15 });
    expect(r.journee).toMatchObject({ leverDefautMin: 390, enchainerMin: 60, margeArriveeMin: 15 });
    expect(r.rappelsHoraires).toBe(false);
    const faux = reglagesDepuis({ sommeil: "beaucoup", marge: -3, leverDefaut: "25:00", preparation: Number.NaN });
    expect(faux.carnet.sommeilMin).toBe(480);
    expect(faux.carnet.margeArriveeMin).toBe(10);
    expect(faux.journee.leverDefautMin).toBe(480);
    expect(faux.carnet.preparationMin).toBe(45);
  });
});