import { describe, expect, it } from "vitest";
import { courbe, ecartDeRecalage, estime, precision, premierJourSousSeuil, prochainsPaiements, reglagesDepuis, roleDe } from "./calculs";
import { avecRecalage, avecRole, donneesVides, lireDonnees } from "./donnees";
import { ErreurMesFinances, RECALAGES_MAX, type Compte, type Prevision } from "./types";

const courant: Compte = { id: "c1", nom: "Courant", type: "courant" };
const livret: Compte = { id: "c2", nom: "Livret", type: "epargne" };
const comptes = [courant, livret];
const prev = (id: string, jour: string, montantCents: number, compteId: string | null = "c1"): Prevision => ({ id, jour, montantCents, compteId, libelle: id });

describe("rôles et estimé", () => {
  it("l'épargne est du secours par défaut, le reste est la vie courante", () => {
    expect(roleDe(courant, {})).toBe("vie");
    expect(roleDe(livret, {})).toBe("secours");
    expect(roleDe(livret, { c2: "vie" })).toBe("vie");
  });

  it("additionne par rôle et ignore les comptes « hors »", () => {
    const soldes = { c1: 120000, c2: 500000 };
    expect(estime(comptes, soldes, {})).toEqual({ vie: 120000, secours: 500000 });
    expect(estime(comptes, soldes, { c2: "hors" })).toEqual({ vie: 120000, secours: 0 });
    expect(estime(comptes, soldes, { c2: "vie" })).toEqual({ vie: 620000, secours: 0 });
  });
});

describe("courbe", () => {
  it("part d'aujourd'hui et applique chaque prévision le jour dit", () => {
    const c = courbe(100000, "2026-10-08", 3, [prev("a", "2026-10-09", -30000), prev("b", "2026-10-11", 50000)], comptes, {});
    expect(c.map((p) => p.jour)).toEqual(["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"]);
    expect(c.map((p) => p.soldeCents)).toEqual([100000, 70000, 70000, 120000]);
  });

  it("compte une prévision du jour même, ignore le passé et les comptes de secours", () => {
    const c = courbe(1000, "2026-10-08", 1, [prev("hier", "2026-10-07", -999), prev("auj", "2026-10-08", -100), prev("livret", "2026-10-09", -500, "c2")], comptes, {});
    expect(c.map((p) => p.soldeCents)).toEqual([900, 900]);
  });

  it("une prévision sans compte choisi touche la vie courante", () => {
    expect(courbe(0, "2026-10-08", 1, [prev("x", "2026-10-09", -200, null)], comptes, {}).at(-1)?.soldeCents).toBe(-200);
  });
});

describe("jusqu'à quand je tiens", () => {
  const points = courbe(10000, "2026-10-08", 5, [prev("loyer", "2026-10-10", -9000), prev("elec", "2026-10-12", -2000)], comptes, {});

  it("donne le premier jour sous le seuil", () => {
    expect(premierJourSousSeuil(points, 0)).toBe("2026-10-12");
    expect(premierJourSousSeuil(points, 2000)).toBe("2026-10-10");
  });

  it("rend null quand l'estimé tient sur tout l'horizon", () => {
    expect(premierJourSousSeuil(points, -5000)).toBeNull();
  });
});

describe("prochains paiements", () => {
  it("garde les sorties à venir, de la plus proche à la plus lointaine", () => {
    const l = prochainsPaiements([prev("c", "2026-10-20", -100), prev("a", "2026-10-09", -300), prev("e", "2026-10-09", 900), prev("p", "2026-10-01", -50), prev("b", "2026-10-09", -700)], "2026-10-08", 2);
    expect(l.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("précision et recalage", () => {
  it("n'existe pas sans recalage, puis moyenne des écarts absolus récents", () => {
    expect(precision([], 6)).toBeNull();
    const r = [
      { jour: "2026-09-01", ecartCents: 10000 },
      { jour: "2026-09-15", ecartCents: -2000 },
      { jour: "2026-10-01", ecartCents: 4000 },
    ];
    expect(precision(r, 6)).toBe(5333);
    expect(precision(r, 2)).toBe(3000);
  });

  it("l'écart est le réel moins l'estimé", () => {
    expect(ecartDeRecalage(95000, 100000)).toBe(-5000);
  });
});

describe("réglages", () => {
  it("convertit le seuil en centimes et refuse un horizon inconnu", () => {
    expect(reglagesDepuis({ seuil: 50, horizon: "90", precisionRecalages: 3 })).toEqual({ seuilCents: 5000, horizon: 90, recalagesRetenus: 3 });
    expect(reglagesDepuis({ horizon: "12" }).horizon).toBe(60);
    expect(reglagesDepuis(null)).toEqual({ seuilCents: 0, horizon: 60, recalagesRetenus: 6 });
  });
});

describe("données", () => {
  it("rien d'enregistré donne des données vides, du contenu illisible est une erreur", () => {
    expect(lireDonnees(null)).toEqual(donneesVides());
    expect(() => lireDonnees({ schema: 9, roles: {}, recalages: [] })).toThrow(ErreurMesFinances);
    expect(() => lireDonnees({ schema: 1, roles: { c1: "roi" }, recalages: [] })).toThrow(ErreurMesFinances);
    expect(() => lireDonnees({ schema: 1, roles: {}, recalages: [{ jour: "2026-02-30", ecartCents: 1 }] })).toThrow(ErreurMesFinances);
    expect(() => lireDonnees({ schema: 1, roles: {}, recalages: [{ jour: "2026-02-10", ecartCents: 1.5 }] })).toThrow(ErreurMesFinances);
  });

  it("relit ce qu'il a écrit et borne l'historique", () => {
    let d = avecRole(donneesVides(), "c2", "vie");
    for (let i = 0; i < RECALAGES_MAX + 5; i++) d = avecRecalage(d, { jour: "2026-10-01", ecartCents: i });
    expect(d.recalages).toHaveLength(RECALAGES_MAX);
    expect(d.recalages.at(-1)?.ecartCents).toBe(RECALAGES_MAX + 4);
    expect(lireDonnees(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
});
