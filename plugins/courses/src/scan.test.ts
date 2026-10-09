import { describe, expect, it } from "vitest";
import { lireTicketIa } from "./scan";

const AUJ = "2026-10-09";
const ticket = {
  estTicket: true,
  magasin: "Lidl",
  date: "2026-10-07",
  total: 12.4,
  articles: [
    { nom: "Lait demi-écrémé", quantite: 6, prix: 6.9 },
    { nom: "Pâtes", quantite: 1, prix: 1.5 },
    { nom: "Poulet", prix: 4 },
  ],
};

describe("lireTicketIa", () => {
  it("lit un ticket complet et convertit en centimes", () => {
    const r = lireTicketIa(JSON.stringify(ticket), AUJ);
    expect(r).toMatchObject({ ok: true, ticket: { magasin: "Lidl", jour: "2026-10-07", totalCents: 1240, ecartCents: 0, dateDevinee: false } });
    if (r.ok) expect(r.ticket.articles).toEqual([
      { nom: "Lait demi-écrémé", quantite: 6, prixCents: 690 },
      { nom: "Pâtes", quantite: 1, prixCents: 150 },
      { nom: "Poulet", quantite: 1, prixCents: 400 },
    ]);
  });

  it("accepte le JSON entouré de balises de code", () => {
    expect(lireTicketIa("```json\n" + JSON.stringify(ticket) + "\n```", AUJ).ok).toBe(true);
  });

  it("signale un écart entre le total et les lignes", () => {
    const r = lireTicketIa(JSON.stringify({ ...ticket, total: 15 }), AUJ);
    expect(r).toMatchObject({ ok: true, ticket: { totalCents: 1500, ecartCents: 260 } });
  });

  it("propose la date du jour quand elle est illisible ou n'existe pas", () => {
    for (const date of ["", "hier", "2026-02-30", "07/10/2026"]) {
      expect(lireTicketIa(JSON.stringify({ ...ticket, date }), AUJ)).toMatchObject({ ok: true, ticket: { jour: AUJ, dateDevinee: true } });
    }
  });

  it("sans total lu, prend la somme des lignes ; sans rien de lisible, refuse", () => {
    expect(lireTicketIa(JSON.stringify({ ...ticket, total: 0 }), AUJ)).toMatchObject({ ok: true, ticket: { totalCents: 1240 } });
    expect(lireTicketIa(JSON.stringify({ estTicket: true, total: 0, articles: [] }), AUJ).ok).toBe(false);
  });

  it("refuse ce qui n'est pas un ticket ou pas du JSON", () => {
    expect(lireTicketIa(JSON.stringify({ estTicket: false, total: 5, articles: [] }), AUJ)).toMatchObject({ ok: false });
    for (const brut of ["", "pas du json", "[1,2]", "null", "12"]) expect(lireTicketIa(brut, AUJ).ok, brut).toBe(false);
  });

  it("écarte les lignes absurdes et borne le reste", () => {
    const r = lireTicketIa(
      JSON.stringify({
        estTicket: true,
        magasin: "x".repeat(200),
        total: 10,
        articles: [
          { nom: "", prix: 1 },
          { nom: "Négatif", prix: -3 },
          { nom: "Texte", prix: "2,50" },
          { nom: "Énorme", prix: 1e9 },
          { nom: "Bon", quantite: -2, prix: 10 },
          { nom: "N".repeat(300), quantite: 5000, prix: 1 },
          null,
          "chaîne",
        ],
      }),
      AUJ,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ticket.magasin).toHaveLength(80);
      expect(r.ticket.articles.map((a) => a.nom.length)).toEqual([3, 120]);
      expect(r.ticket.articles.map((a) => a.quantite)).toEqual([1, 1]);
    }
  });

  it("limite le nombre de lignes", () => {
    const articles = Array.from({ length: 400 }, (_, i) => ({ nom: `Article ${i}`, prix: 1 }));
    const r = lireTicketIa(JSON.stringify({ estTicket: true, total: 400, articles }), AUJ);
    expect(r.ok && r.ticket.articles.length).toBe(150);
  });
});