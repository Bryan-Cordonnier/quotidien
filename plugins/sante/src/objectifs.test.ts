import { describe, expect, it } from "vitest";
import { nettoyer, OBJECTIFS_DEFAUT } from "./objectifs";

describe("objectifs de santé", () => {
  it("rien ou n'importe quoi : les valeurs par défaut", () => {
    for (const brut of [null, undefined, "x", 4, []]) expect(nettoyer(brut)).toEqual(OBJECTIFS_DEFAUT);
  });

  it("garde ce qui est propre, borne le reste", () => {
    const o = nettoyer({ caloriesJour: 2200.4, proteinesJour: -3, regime: "végétarien", but: "voler", allergies: "arachides\u0000", inconnu: 1 });
    expect(o).toMatchObject({ caloriesJour: 2200, proteinesJour: 0, regime: "végétarien", but: "manger équilibré", allergies: "arachides " });
    expect(o).not.toHaveProperty("inconnu");
  });
});
