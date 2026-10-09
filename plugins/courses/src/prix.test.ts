import { describe, expect, it } from "vitest";
import { ajouterTicket, donneesVides } from "./donnees";
import { baseDePrix, estimerListe, jetons, multiplicateur, trouver } from "./prix";

const ligne = (nom: string, prixCents: number, quantite = 1) => ({ nom, quantite, prixCents });
function donnees() {
  let d = donneesVides();
  d = ajouterTicket(d, { jour: "2026-10-01", montantCents: 3000, magasin: "Lidl", articles: [ligne("Lait cru bio 1L", 110), ligne("Salade verte", 90), ligne("Coca-Cola 1,5L", 180), ligne("Lait demi-écrémé 1L", 95), ligne("Yaourts nature x8", 240)] }).donnees;
  d = ajouterTicket(d, { jour: "2026-10-05", montantCents: 3000, magasin: "Leclerc", articles: [ligne("Lait cru bio 1L", 130), ligne("Salade", 120), ligne("Coca-Cola 1.5L", 150)] }).donnees;
  d = ajouterTicket(d, { jour: "2026-10-09", montantCents: 500, magasin: "Lidl", horsBudget: true, articles: [ligne("Salade verte", 110)] }).donnees;
  return d;
}

describe("jetons", () => {
  it("garde les mots qui comptent, sans quantités, unités ni petits mots", () => {
    expect(jetons("Lait cru 1L")).toEqual(["lait", "cru"]);
    expect(jetons("500 g de Pâtes")).toEqual(["pate"]);
    expect(jetons("Coca-Cola 1,5L")).toEqual(["coca", "cola"]);
    expect(jetons("Yaourts nature x8")).toEqual(["yaourt", "nature"]);
    expect(jetons("")).toEqual([]);
  });

  it("repère une quantité devant le nom", () => {
    expect(multiplicateur("2 yaourts")).toBe(2);
    expect(multiplicateur("6x œufs")).toBe(6);
    expect(multiplicateur("Lait 1L")).toBe(1);
    expect(multiplicateur("99 ballons")).toBe(1);
  });
});

describe("trouver", () => {
  const base = baseDePrix(donnees());

  it("rapproche un nom simple de l'article connu qui le contient", () => {
    expect(trouver("Lait cru 1L", base)?.nom).toBe("Lait cru bio 1L");
    expect(trouver("salade", base)?.nom).toMatch(/Salade/);
    expect(trouver("coca", base)?.nom).toMatch(/Coca/);
  });

  it("ne confond pas deux produits différents ni ne devine à moitié", () => {
    expect(trouver("lait cru", base)?.nom).not.toMatch(/demi/);
    expect(trouver("lait de coco", base)).toBeNull();
    expect(trouver("rhubarbe", base)).toBeNull();
    expect(trouver("", base)).toBeNull();
  });
});

describe("estimerListe", () => {
  const base = baseDePrix(donnees());

  it("conseille le magasin le moins cher pour toute la liste", () => {
    const e = estimerListe(["Lait cru 1L", "salade", "coca"], base);
    expect(e.connus).toBe(3);
    // Lidl : 1,10 + moyenne des deux prix de la salade (0,90 ; 1,10 ; Lidl = 1,00) + 1,80 ; Leclerc : 1,30 + 1,20 + 1,50
    expect(e.conseille?.magasin).toBe("Lidl");
    expect(e.magasins.map((m) => [m.magasin, m.totalCents])).toEqual([["Lidl", 390], ["Leclerc", 400]]);
    expect(e.lignes.map((l) => l.prixCents)).toEqual([110, 100, 180]);
  });

  it("multiplie par la quantité devant le nom", () => {
    const e = estimerListe(["2 salade"], base);
    expect(e.lignes[0]?.prixCents).toBe(200);
  });

  it("complète par le prix moyen d'ailleurs quand un article n'a pas été vu dans ce magasin, et le dit", () => {
    const e = estimerListe(["yaourts nature", "salade"], base);
    const leclerc = e.magasins.find((m) => m.magasin === "Leclerc")!;
    expect(leclerc.vusIci).toBe(1);
    expect(leclerc.totalCents).toBe(240 + 120);
  });

  it("les articles inconnus ne sont pas chiffrés mais comptés", () => {
    const e = estimerListe(["salade", "rhubarbe"], base);
    expect(e.connus).toBe(1);
    expect(e.total).toBe(2);
    expect(e.lignes[1]).toEqual({ nom: "rhubarbe", connu: null, quantite: 1, prixCents: null });
  });

  it("sans ticket, rien à conseiller", () => {
    const e = estimerListe(["lait"], baseDePrix(donneesVides()));
    expect(e.conseille).toBeNull();
    expect(e.lignes[0]?.prixCents).toBeNull();
  });
});