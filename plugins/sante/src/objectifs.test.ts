import { describe, expect, it } from "vitest";
import { appliquerParametres, conseils, besoinCalories, imcIlYa30Jours, besoinProteines, imc, nettoyer, OBJECTIFS_DEFAUT, peser } from "./objectifs";

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

  it("les Paramètres remplacent le profil, sauf ceux restés par défaut (rien de déjà saisi ne se perd)", () => {
    const avant = nettoyer({ age: 30, tailleCm: 180, regime: "halal" });
    const o = appliquerParametres(avant, { taille: 182, poidsVise: 75.5, age: 0 });
    expect(o).toMatchObject({ age: 30, tailleCm: 182, poidsViseDixiemes: 755, regime: "halal" });
  });

  it("IMC d'il y a 30 jours", () => {
    const o = nettoyer({ tailleCm: 200, pesees: [{ jour: "2026-08-01", dixiemesKg: 1000 }, { jour: "2026-09-20", dixiemesKg: 960 }, { jour: "2026-10-12", dixiemesKg: 900 }] });
    expect(imcIlYa30Jours(o)).toBe(24);
    expect(imcIlYa30Jours(nettoyer({ tailleCm: 200 }))).toBeNull();
  });

  it("conseils : d'après l'IMC, son sens et ce que l'on mange", () => {
    const o = nettoyer({ tailleCm: 180, age: 30, pesees: [{ jour: "2026-09-20", dixiemesKg: 900 }, { jour: "2026-10-16", dixiemesKg: 880 }] });
    const c = conseils(o, { kcal: 800, proteines: 15, glucides: 70, lipides: 45 });
    expect(c[0]).toMatch(/baisse/);
    expect(c.some((x) => x.includes("protéines"))).toBe(true);
    expect(c.some((x) => x.includes("gras"))).toBe(true);
    expect(conseils(nettoyer({}), null)).toEqual(["Renseigne ta taille et pèse-toi pour avoir ton IMC et des conseils."]);
  });
});
