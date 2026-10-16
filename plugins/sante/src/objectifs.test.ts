import { describe, expect, it } from "vitest";
import { besoinCalories, besoinProteines, imc, nettoyer, OBJECTIFS_DEFAUT, peser } from "./objectifs";

describe("objectifs de santé", () => {
  it("rien ou n'importe quoi : les valeurs par défaut", () => {
    for (const brut of [null, undefined, "x", 4, []]) expect(nettoyer(brut)).toEqual(OBJECTIFS_DEFAUT);
  });

  it("garde ce qui est propre, borne le reste", () => {
    const o = nettoyer({ caloriesJour: 2200.4, proteinesJour: -3, regime: "végétarien", but: "voler", allergies: "arachides\u0000", inconnu: 1 });
    expect(o).toMatchObject({ caloriesJour: 2200, proteinesJour: 0, regime: "végétarien", but: "manger équilibré", allergies: "arachides " });
    expect(o).not.toHaveProperty("inconnu");
  });

  it("pesées : une par jour, triées ; IMC et besoins calculés", () => {
    let o = nettoyer({ sexe: "homme", age: 30, tailleCm: 180, activite: "modéré", pesees: [{ jour: "2026-10-10", dixiemesKg: 810 }, { jour: "x", dixiemesKg: 800 }] });
    o = peser(o, "2026-10-05", 82);
    o = peser(o, "2026-10-12", 80);
    expect(o.pesees).toEqual([{ jour: "2026-10-05", dixiemesKg: 820 }, { jour: "2026-10-10", dixiemesKg: 810 }, { jour: "2026-10-12", dixiemesKg: 800 }]);
    expect(imc(o)).toBe(24.7);
    expect(besoinCalories(o)).toBe(2750); // (800 + 1125 - 150 + 5) × 1,55 = 2759
    expect(besoinCalories({ ...o, but: "perdre du poids" })).toBe(2350);
    expect(besoinProteines({ ...o, but: "prendre du muscle" })).toBe(144);
    expect(besoinCalories({ ...o, age: 0 })).toBeNull();
  });
});
