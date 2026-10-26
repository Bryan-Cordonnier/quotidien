import { describe, expect, it } from "vitest";
import { ajouterRecette, donneesVides } from "./donnees";
import { alertes, caseDe, cuisines, prevoir, reglerRepas, septJours } from "./semaine";

const avecRecette = () => {
  const r = ajouterRecette(donneesVides(), { nom: "Pâtes carbo", categorie: "Pâtes", ingredients: [{ nom: "pâtes", quantite: "200 g" }], tempsMin: 25 });
  // le système de repas est coupé au départ : on l'allume pour les essais
  return { d: reglerRepas(r.donnees, { actif: true }), id: r.id };
};

describe("la semaine des repas", () => {
  it("montre sept jours, aujourd'hui au milieu", () => {
    expect(septJours("2026-10-27")).toEqual(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);
  });
  it("calcule l'heure où commencer à cuisiner et la pose dans l'agenda", () => {
    const { d, id } = avecRecette();
    const p = prevoir(d, { jour: "2026-10-27", moment: "soir", plat: "", recetteId: id, heureMin: 20 * 60 });
    const c = caseDe(p, "2026-10-27", "soir");
    expect([c.plat, c.cuisinerMin, c.origine]).toEqual(["Pâtes carbo", 20 * 60 - 25, "saisi"]);
    expect(cuisines(p, "2026-10-27")).toEqual([{ jour: "2026-10-27", debutMin: 1175, finMin: 1200, titre: "🍳 Cuisiner : Pâtes carbo" }]);
    expect(cuisines(reglerRepas(p, { actif: false }), "2026-10-27")).toEqual([]);
  });
  it("alerte quand rien n'est prévu et quand il n'y a pas de liste de courses", () => {
    const { d, id } = avecRecette();
    expect(alertes(d, "2026-10-27", 0, 0).map((a) => a.niveau)).toEqual(["urgent", "info"]);
    const p = prevoir(d, { jour: "2026-10-27", moment: "midi", plat: "", recetteId: id, heureMin: null });
    expect(alertes(p, "2026-10-27", 0, 0).some((a) => a.texte.includes("aucune liste de courses"))).toBe(true);
    expect(alertes(reglerRepas(p, { alertes: false }), "2026-10-27", 0, 0)).toEqual([]);
  });
  it("effacer une case la retire", () => {
    const { d } = avecRecette();
    const p = prevoir(d, { jour: "2026-10-27", moment: "matin", plat: "Céréales", recetteId: null, heureMin: null });
    expect(prevoir(p, { jour: "2026-10-27", moment: "matin", plat: "", recetteId: null, heureMin: null }).semaine).toEqual([]);
  });
});
