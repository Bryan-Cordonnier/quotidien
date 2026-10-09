import { describe, expect, it } from "vitest";
import { ajouterArticle, ajouterTicket, basculerPris, creerListe, donneesVides, lireDonnees, listesEnCours, listesReglees, renommerArticle, renommerListe, reglerListe, retirerArticle, supprimerListe, supprimerTicket } from "./donnees";
import { ErreurCourses, type Donnees } from "./types";

function refus(f: () => unknown): ErreurCourses {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurCourses) return e;
    throw e;
  }
  throw new Error("Un refus était attendu.");
}

const avecListe = (): { id: string; d: Donnees } => {
  const r = creerListe(donneesVides(), "Courses du samedi", ["Lait (6)", "Pâtes", "Poulet"]);
  return { id: r.id, d: r.donnees };
};

describe("tickets", () => {
  it("un ticket peut être gardé hors budget ; l'indicateur doit être vrai ou faux et se relit", () => {
    const { donnees } = ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 840, magasin: "Lidl", horsBudget: true });
    expect(donnees.tickets[0]?.horsBudget).toBe(true);
    expect(lireDonnees(JSON.parse(JSON.stringify(donnees))).tickets[0]?.horsBudget).toBe(true);
    expect(ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 840 }).donnees.tickets[0]?.horsBudget).toBe(false);
    expect(refus(() => ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 840, horsBudget: "oui" })).code).toBe("argument_invalide");
  });
  it("un ticket lu sur photo garde ses lignes, relues telles quelles ; un ancien ticket sans lignes reste lisible", () => {
    const lignes = [{ nom: "Lait", quantite: 6, prixCents: 690 }, { nom: "Pâtes", quantite: 1, prixCents: 150 }];
    const { donnees } = ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 840, magasin: "Lidl", articles: lignes });
    expect(donnees.tickets[0]?.articles).toEqual(lignes);
    expect(lireDonnees(JSON.parse(JSON.stringify(donnees))).tickets[0]?.articles).toEqual(lignes);
    const ancien = { schema: 1, suivant: 2, tickets: [{ id: "t1", jour: "2026-10-01", magasin: "Aldi", montantCents: 500, listeId: null }], listes: [], transmis: {} };
    expect(lireDonnees(ancien).tickets[0]?.articles).toEqual([]);
    for (const articles of [[{ nom: "", quantite: 1, prixCents: 1 }], [{ nom: "A", quantite: 0, prixCents: 1 }], [{ nom: "A", quantite: 1, prixCents: -1 }], [{ nom: "A", quantite: 1, prixCents: 1, extra: 1 }], "oui"]) {
      expect(refus(() => ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 100, articles })).code, JSON.stringify(articles)).toBe("argument_invalide");
    }
  });
  it("un ticket sans magasin devient « Sans magasin » ; le montant doit être positif", () => {
    const { donnees } = ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 1240 });
    expect(donnees.tickets[0]).toMatchObject({ id: "t1", magasin: "Sans magasin", montantCents: 1240, listeId: null });
    expect(refus(() => ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 0 })).code).toBe("argument_invalide");
    expect(refus(() => ajouterTicket(donneesVides(), { jour: "2026-13-08", montantCents: 100 })).code).toBe("argument_invalide");
    expect(refus(() => ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 100, remise: 1 })).code).toBe("argument_invalide");
  });

  it("un ticket saisi à la main se supprime ; un ticket qui a réglé une liste, non", () => {
    const { donnees, id } = ajouterTicket(donneesVides(), { jour: "2026-10-08", montantCents: 500 });
    expect(supprimerTicket(donnees, id).tickets).toEqual([]);
    expect(refus(() => supprimerTicket(donnees, "t9")).code).toBe("introuvable");
    const { id: lid, d } = avecListe();
    const r = reglerListe(d, lid, { jour: "2026-10-10", montantCents: 4120, magasin: "Leclerc" });
    expect(refus(() => supprimerTicket(r.donnees, r.ticketId)).code).toBe("argument_invalide");
  });
});

describe("listes de courses", () => {
  it("créer une liste : un nom et au moins un article ; les articles ne sont pas dans le caddie", () => {
    const { d } = avecListe();
    expect(d.listes[0]).toMatchObject({ id: "l1", nom: "Courses du samedi", reglement: null });
    expect(d.listes[0]?.articles.map((a) => [a.nom, a.pris])).toEqual([["Lait (6)", false], ["Pâtes", false], ["Poulet", false]]);
    expect(refus(() => creerListe(donneesVides(), "Vide", [])).code).toBe("argument_invalide");
    expect(refus(() => creerListe(donneesVides(), "  ", ["Lait"])).code).toBe("argument_invalide");
  });

  it("ajouter, renommer, retirer, mettre dans le caddie ; les identifiants ne se réutilisent jamais", () => {
    let { id, d } = avecListe();
    d = ajouterArticle(d, id, "Café");
    const café = d.listes[0]!.articles.at(-1)!;
    d = renommerArticle(d, id, café.id, "Café en grains");
    d = basculerPris(d, id, café.id);
    expect(d.listes[0]!.articles.at(-1)).toMatchObject({ nom: "Café en grains", pris: true });
    d = basculerPris(d, id, café.id);
    expect(d.listes[0]!.articles.at(-1)?.pris).toBe(false);
    d = retirerArticle(d, id, café.id);
    d = ajouterArticle(d, id, "Sucre");
    expect(d.listes[0]!.articles.map((a) => a.id)).not.toContain(café.id);
    expect(d.listes[0]!.articles).toHaveLength(4);
    d = renommerListe(d, id, "Samedi matin");
    expect(d.listes[0]?.nom).toBe("Samedi matin");
    expect(refus(() => ajouterArticle(d, "l99", "x")).code).toBe("introuvable");
    expect(refus(() => retirerArticle(d, id, "a999")).code).toBe("introuvable");
  });

  it("régler une course : le montant devient un ticket, la liste est verrouillée, un article non pris ne gêne pas", () => {
    let { id, d } = avecListe();
    d = basculerPris(d, id, d.listes[0]!.articles[0]!.id); // un seul article sur trois dans le caddie
    const r = reglerListe(d, id, { jour: "2026-10-10", montantCents: 5210, magasin: "Leclerc Drive" });
    expect(r.donnees.tickets).toEqual([{ id: r.ticketId, jour: "2026-10-10", magasin: "Leclerc Drive", montantCents: 5210, listeId: id, articles: [], horsBudget: false }]);
    expect(r.donnees.listes[0]?.reglement).toEqual({ jour: "2026-10-10", magasin: "Leclerc Drive", montantCents: 5210, ticketId: r.ticketId });
    expect(listesEnCours(r.donnees)).toEqual([]);
    expect(listesReglees(r.donnees)).toHaveLength(1);
  });

  it("une liste réglée ne se modifie plus, ne se règle pas deux fois et ne se supprime pas", () => {
    const { id, d } = avecListe();
    const reglee = reglerListe(d, id, { jour: "2026-10-10", montantCents: 5210 }).donnees;
    const aid = reglee.listes[0]!.articles[0]!.id;
    for (const essai of [() => ajouterArticle(reglee, id, "x"), () => renommerListe(reglee, id, "x"), () => retirerArticle(reglee, id, aid), () => basculerPris(reglee, id, aid), () => renommerArticle(reglee, id, aid, "x"), () => supprimerListe(reglee, id), () => reglerListe(reglee, id, { jour: "2026-10-11", montantCents: 100 })]) {
      expect(refus(essai).code).toBe("argument_invalide");
    }
  });

  it("supprimer une liste en cours ; l'historique est trié, la plus récente d'abord", () => {
    let { id, d } = avecListe();
    const b = creerListe(d, "Marché", ["Tomates"]);
    d = reglerListe(b.donnees, b.id, { jour: "2026-10-11", montantCents: 1500 }).donnees;
    d = reglerListe(d, id, { jour: "2026-10-03", montantCents: 5000 }).donnees;
    expect(listesReglees(d).map((l) => l.nom)).toEqual(["Marché", "Courses du samedi"]);
    const c = creerListe(d, "À jeter", ["x"]);
    expect(supprimerListe(c.donnees, c.id).listes.map((l) => l.nom)).toEqual(["Courses du samedi", "Marché"]);
  });
});

describe("lecture des données", () => {
  it("rien d'enregistré : données vides ; données illisibles : erreur, jamais des données vides", () => {
    expect(lireDonnees(null)).toEqual(donneesVides());
    expect(refus(() => lireDonnees({ schema: 9 })).code).toBe("illisible");
    expect(refus(() => lireDonnees("n'importe quoi")).code).toBe("illisible");
    expect(refus(() => lireDonnees({ schema: 1, suivant: 1, tickets: [{ id: "t5" }], listes: [], transmis: {} })).code).toBe("illisible");
  });

  it("des données écrites se relisent à l'identique", () => {
    let { id, d } = avecListe();
    d = ajouterTicket(d, { jour: "2026-10-05", montantCents: 680, magasin: "Boulangerie" }).donnees;
    d = reglerListe(d, id, { jour: "2026-10-10", montantCents: 5210, magasin: "Leclerc" }).donnees;
    expect(lireDonnees(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
});