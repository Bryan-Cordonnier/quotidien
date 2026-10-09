import { describe, expect, it } from "vitest";
import { ajouterTicket, donneesVides } from "./donnees";
import { construireConsigne, listeDepuisPlats, lireMenuIa, normaliser, prixConnus, texteArticle, type Plat } from "./menu";

const avecTickets = () => {
  let d = donneesVides();
  d = ajouterTicket(d, { jour: "2026-10-05", montantCents: 1000, magasin: "Lidl", articles: [{ nom: "Lait demi-écrémé", quantite: 6, prixCents: 600 }, { nom: "Pâtes", quantite: 1, prixCents: 120 }] }).donnees;
  d = ajouterTicket(d, { jour: "2026-10-12", montantCents: 800, horsBudget: true, articles: [{ nom: "lait demi ecreme", quantite: 3, prixCents: 360 }, { nom: "Riz", quantite: 2, prixCents: 300 }] }).donnees;
  return d;
};

describe("prixConnus", () => {
  it("regroupe les articles malgré les accents et la casse, avec leur prix unitaire moyen", () => {
    const p = prixConnus(avecTickets());
    expect(p[0]).toEqual({ nom: "Lait demi-écrémé", prixCents: 110, fois: 2 });
    expect(p.map((x) => x.nom)).toContain("Riz");
    expect(p.find((x) => x.nom === "Riz")?.prixCents).toBe(150);
  });

  it("rien sans ticket, et borné", () => {
    expect(prixConnus(donneesVides())).toEqual([]);
    expect(prixConnus(avecTickets(), 1)).toHaveLength(1);
  });
});

describe("construireConsigne", () => {
  const base = { personnes: 2, repas: 5, budgetCents: 4500, envies: "", internet: true };

  it("met le budget, le nombre de repas et mes données en priorité", () => {
    const c = construireConsigne(base, prixConnus(avecTickets()));
    expect(c).toContain("5 repas");
    expect(c).toContain("2 personnes");
    expect(c).toContain("45,00 €");
    expect(c).toContain("Lait demi-écrémé : 1,10 €");
    expect(c).toContain("en priorité");
    expect(c).toContain("Cherche sur internet seulement ce qui manque");
  });

  it("sans internet, estime au lieu de chercher ; sans données, le dit", () => {
    const c = construireConsigne({ ...base, internet: false }, []);
    expect(c).not.toContain("Cherche sur internet");
    expect(c).toContain("aucun ticket scanné");
  });

  it("reprend les envies, les plats à éviter et le dépassement", () => {
    const c = construireConsigne({ ...base, envies: "sans poisson", aEviter: ["Gratin", "Curry"], depassementCents: 520 }, []);
    expect(c).toContain("sans poisson");
    expect(c).toContain("NE REPROPOSE PAS ces plats : Gratin, Curry");
    expect(c).toContain("dépassait le budget de 5,20 €");
  });
});

describe("lireMenuIa", () => {
  const reponse = {
    plats: [
      { nom: "Pâtes à la tomate", resume: "Cuire, mélanger.", ingredients: [{ nom: "Pâtes", quantite: "500 g", prix: 1.2 }, { nom: "Sauce tomate", quantite: "1 pot", prix: 1.8 }] },
      { nom: "Riz cantonais", resume: "Sauter.", ingredients: [{ nom: "Riz", quantite: "300 g", prix: 1 }, { nom: "Œufs", quantite: "4", prix: 1.5 }] },
    ],
  };

  it("lit les plats, convertit en centimes et calcule le coût de chacun", () => {
    const r = lireMenuIa(JSON.stringify(reponse), 2);
    expect(r.ok && r.plats.map((p) => [p.nom, p.coutCents])).toEqual([["Pâtes à la tomate", 300], ["Riz cantonais", 250]]);
  });

  it("accepte du JSON entouré de balises ou d'une phrase (réponse avec recherche internet)", () => {
    expect(lireMenuIa("```json\n" + JSON.stringify(reponse) + "\n```", 2).ok).toBe(true);
    expect(lireMenuIa("Voici ma proposition :\n" + JSON.stringify(reponse) + "\nBon appétit !", 2).ok).toBe(true);
  });

  it("écarte les ingrédients et les plats absurdes", () => {
    const r = lireMenuIa(JSON.stringify({ plats: [{ nom: "", ingredients: [{ nom: "x", prix: 1 }] }, { nom: "Sans rien", ingredients: [] }, { nom: "Prix fous", ingredients: [{ nom: "Truffe", prix: 99999 }, { nom: "Négatif", prix: -2 }, { nom: "Texte", prix: "1,5" }, { nom: "Bon", prix: 2 }] }] }), 3);
    expect(r.ok && r.plats).toHaveLength(1);
    expect(r.ok && r.plats[0]?.ingredients.map((i) => i.nom)).toEqual(["Bon"]);
  });

  it("refuse ce qui n'est pas lisible", () => {
    for (const brut of ["", "n'importe quoi", "[1]", '{"plats":"non"}', '{"plats":[]}']) expect(lireMenuIa(brut, 3).ok, brut).toBe(false);
  });

  it("borne le nombre de plats", () => {
    const beaucoup = { plats: Array.from({ length: 40 }, (_, i) => ({ nom: `Plat ${i}`, ingredients: [{ nom: "X", prix: 1 }] })) };
    const r = lireMenuIa(JSON.stringify(beaucoup), 5);
    expect(r.ok && r.plats.length).toBe(7);
  });
});

describe("listeDepuisPlats", () => {
  const plats: Plat[] = [
    { nom: "A", resume: "", ingredients: [{ nom: "Riz", quantite: "300 g", prixCents: 100 }, { nom: "Œufs", quantite: "4", prixCents: 150 }], coutCents: 250 },
    { nom: "B", resume: "", ingredients: [{ nom: "riz", quantite: "200 g", prixCents: 70 }, { nom: "Tomates", quantite: "1 kg", prixCents: 260 }], coutCents: 330 },
  ];

  it("fusionne un ingrédient partagé : quantités mises bout à bout, prix additionnés", () => {
    const { lignes, totalCents } = listeDepuisPlats(plats);
    expect(lignes.map((l) => [l.nom, l.quantite, l.prixCents])).toEqual([["Œufs", "4", 150], ["Riz", "300 g + 200 g", 170], ["Tomates", "1 kg", 260]]);
    expect(totalCents).toBe(580);
  });

  it("une liste vide quand aucun plat n'est gardé", () => {
    expect(listeDepuisPlats([])).toEqual({ lignes: [], totalCents: 0 });
  });

  it("écrit un article avec sa quantité, borné", () => {
    expect(texteArticle({ nom: "Riz", quantite: "300 g + 200 g", prixCents: 170 })).toBe("Riz (300 g + 200 g)");
    expect(texteArticle({ nom: "Sel", quantite: "", prixCents: 0 })).toBe("Sel");
    expect(texteArticle({ nom: "N".repeat(200), quantite: "", prixCents: 0 })).toHaveLength(120);
  });
});

describe("normaliser", () => {
  it("ignore accents, casse et ponctuation", () => {
    expect(normaliser("  Lait Demi-Écrémé ! ")).toBe("lait demi ecreme");
  });
});