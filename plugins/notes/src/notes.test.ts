import { describe, expect, it } from "vitest";
import { ajouter, basculer, CARNET_VIDE, nettoyer, ordonner, retirer } from "./notes";

describe("notes", () => {
  it("rien ou n'importe quoi : un carnet vide", () => {
    for (const b of [null, undefined, "x", 3, []]) expect(nettoyer(b)).toEqual(CARNET_VIDE);
  });

  it("garde les notes propres, ignore les abîmées, recalcule le compteur", () => {
    const c = nettoyer({ suivant: 1, notes: [{ id: "n4", texte: " appeler mamie ", cree: 10, par: "max", rappel: { mode: "max", avant: "2026-10-30" } }, { id: "bad", texte: "x" }, { id: "n5", texte: "" }] });
    expect(c.notes).toEqual([{ id: "n4", texte: "appeler mamie", cree: 10, par: "max", fait: false, rappel: { mode: "max", avant: "2026-10-30" }, rappele: null }]);
    expect(c.suivant).toBe(5);
  });

  it("ajouter, cocher, retirer, ordonner", () => {
    let c = ajouter(CARNET_VIDE, "URSSAF cette semaine", { mode: "aucun" }, 1);
    c = ajouter(c, "appeler mamie", { mode: "heure", quand: 99 }, 2);
    c = basculer(c, "n1");
    expect(ordonner(c).map((n) => n.texte)).toEqual(["appeler mamie", "URSSAF cette semaine"]);
    expect(retirer(c, "n2").notes.map((n) => n.id)).toEqual(["n1"]);
    expect(ajouter(c, "   ", { mode: "aucun" }, 3)).toBe(c);
  });
});
