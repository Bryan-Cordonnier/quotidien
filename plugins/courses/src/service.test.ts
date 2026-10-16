import { describe, expect, it } from "vitest";
import { ajouterTicket, donneesVides } from "./donnees";
import { executer, FONCTIONS } from "./service";
import manifeste from "../public/manifest.json";

const avecTickets = () => {
  let d = donneesVides();
  d = ajouterTicket(d, { jour: "2026-10-10", magasin: "Lidl", montantCents: 500, articles: [{ nom: "Pâtes 500g", quantite: 2, prixCents: 160 }] }).donnees;
  d = ajouterTicket(d, { jour: "2026-10-11", magasin: "Leclerc", montantCents: 500, articles: [{ nom: "Pâtes 500g", quantite: 1, prixCents: 95 }] }).donnees;
  return d;
};

describe("service courses@1", () => {
  it("les fonctions et leurs accès sont ceux du manifeste", () => {
    expect((manifeste as any).functions.courses).toEqual(Object.fromEntries(Object.entries(FONCTIONS).map(([f, acces]) => [f, { acces }])));
  });

  it("contexte.lire : budget, jour des courses et prix par magasin, sans rien écrire", () => {
    const r = executer(avecTickets(), { budget: 80, jour: "6" }, "contexte.lire", {});
    expect(r.donnees).toBeNull();
    expect(r.valeur).toMatchObject({ budgetSemaineCents: 8000, jourCourses: 6 });
    const prix = (r.valeur as any).prix as { magasin: string; prixCents: number }[];
    expect(prix.find((p) => p.magasin === "Lidl")?.prixCents).toBe(80);
    expect(prix.find((p) => p.magasin === "Leclerc")?.prixCents).toBe(95);
  });

  it("listes.ajouter : crée la liste, et la même demande rejouée ne crée pas de doublon", () => {
    const a = executer(donneesVides(), {}, "listes.ajouter", { nom: "Semaine du 17", articles: ["Pâtes 500g", "Tomates"] });
    expect(a.valeur).toMatchObject({ rejoue: false });
    expect(a.donnees?.listes[0]?.articles.map((x) => x.nom)).toEqual(["Pâtes 500g", "Tomates"]);
    const b = executer(a.donnees, {}, "listes.ajouter", { nom: "Semaine du 17", articles: ["Pâtes 500g", "Tomates"] });
    expect(b).toMatchObject({ valeur: { rejoue: true }, donnees: null });
  });

  it("listes.remplacer : remplace les articles d'une liste ouverte, garde ce qui était coché ; contexte.lire la montre", () => {
    const a = executer(donneesVides(), {}, "listes.ajouter", { nom: "Semaine", articles: ["Pâtes", "Tomates"] });
    const d = { ...a.donnees!, listes: a.donnees!.listes.map((l) => ({ ...l, articles: l.articles.map((x) => ({ ...x, pris: x.nom === "Pâtes" })) })) };
    expect((executer(d, {}, "contexte.lire", {}).valeur as any).listes).toEqual([{ id: "l1", nom: "Semaine", articles: ["Pâtes", "Tomates"] }]);
    const b = executer(d, {}, "listes.remplacer", { id: "l1", articles: ["Pâtes", "Tomates x3", "Basilic"] });
    expect(b.donnees?.listes[0]?.articles.map((x) => [x.nom, x.pris])).toEqual([["Pâtes", true], ["Tomates x3", false], ["Basilic", false]]);
    expect(() => executer(d, {}, "listes.remplacer", { id: "l9", articles: ["x"] })).toThrow();
  });

  it("refuse une fonction inconnue ou des arguments faux", () => {
    expect(() => executer(donneesVides(), {}, "tout.effacer", {})).toThrow();
    expect(() => executer(donneesVides(), {}, "listes.ajouter", { nom: "x" })).toThrow();
    expect(() => executer(donneesVides(), {}, "listes.ajouter", { nom: "", articles: [] })).toThrow();
  });
});
