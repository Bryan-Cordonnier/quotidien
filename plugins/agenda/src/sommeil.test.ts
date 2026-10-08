import { describe, expect, it } from "vitest";
import { carnetVide } from "./carnet";
import { coucherDe, dureeNuit, grilleNuits, noterCoucher, sommeilMoyen, zone } from "./sommeil";
import { localVersInstant } from "@etabli/ui/civil";

const lever = (): number => 285; // 4 h 45 le lendemain, comme une journée de travail
const a = (jour: string, minutes: number) => localVersInstant(jour, minutes);

describe("le coucher", () => {
  it("un coucher le soir appartient à ce soir-là ; après minuit et avant 4 h, à la nuit qui a commencé la veille", () => {
    expect(coucherDe(a("2026-10-08", 21 * 60 + 50))).toEqual({ jourSoir: "2026-10-08", coucherMin: 1310 });
    expect(coucherDe(a("2026-10-09", 30))).toEqual({ jourSoir: "2026-10-08", coucherMin: 1470 });
    expect(coucherDe(a("2026-10-09", 4 * 60))).toEqual({ jourSoir: "2026-10-09", coucherMin: 240 });
  });

  it("noter le coucher écrit dans le carnet sans toucher au reste, et le dernier de la nuit l'emporte", () => {
    const un = noterCoucher(carnetVide(), a("2026-10-08", 21 * 60 + 50)).carnet;
    expect(un.sommeil).toEqual({ "2026-10-08": 1310 });
    const deux = noterCoucher(un, a("2026-10-08", 22 * 60)).carnet;
    expect(deux.sommeil).toEqual({ "2026-10-08": 1320 });
  });

  it("la durée de la nuit va du coucher au lever prévu le lendemain : 21 h 50 → 4 h 45 = 6 h 55", () => {
    const c = noterCoucher(carnetVide(), a("2026-10-08", 21 * 60 + 50)).carnet;
    expect(dureeNuit(c, "2026-10-08", lever())).toBe(415);
    expect(dureeNuit(c, "2026-10-07", lever())).toBeNull();
    expect(dureeNuit(c, "2026-10-08", -2000)).toBeNull();
    // Un coucher noté à 6 h du matin n'est pas une nuit de 22 h.
    expect(dureeNuit({ ...c, sommeil: { "2026-10-08": 379 } }, "2026-10-08", lever())).toBeNull();
  });
});

describe("zones et grille", () => {
  it("du rouge au vert selon la part de la cible dormie", () => {
    expect([480, 440, 400, 340, 200].map((m) => zone(m, 480))).toEqual(["z4", "z3", "z2", "z1", "z0"]);
  });

  it("la grille : une colonne par semaine, les nuits à venir sont vides, les nuits notées sont colorées", () => {
    const c = noterCoucher(noterCoucher(carnetVide(), a("2026-10-06", 21 * 60)).carnet, a("2026-10-07", 22 * 60)).carnet;
    const g = grilleNuits(c, "2026-10-08", 3, 480, lever);
    expect(g).toHaveLength(3);
    expect(g.every((w) => w.length === 7)).toBe(true);
    const semaine = g[2]!; // du lundi 5 au dimanche 11
    expect(semaine.map((x) => x.jour)[0]).toBe("2026-10-05");
    expect(semaine[1]).toMatchObject({ jour: "2026-10-06", minutes: 465, zone: "z3", futur: false }); // 21 h → 4 h 45 : 7 h 45
    expect(semaine[2]).toMatchObject({ jour: "2026-10-07", minutes: 405, zone: "z2" });
    expect(semaine[0]).toMatchObject({ minutes: null, zone: null, futur: false });
    expect(semaine[5]).toMatchObject({ minutes: null, futur: true });
  });

  it("le sommeil moyen ne compte que les nuits notées", () => {
    const c = noterCoucher(noterCoucher(carnetVide(), a("2026-10-06", 21 * 60)).carnet, a("2026-10-07", 22 * 60)).carnet;
    expect(sommeilMoyen(c, "2026-10-08", 30, lever)).toBe(Math.round((465 + 405) / 2));
    expect(sommeilMoyen(carnetVide(), "2026-10-08", 30, lever)).toBeNull();
  });
});