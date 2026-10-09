import { describe, expect, it } from "vitest";
import { budgetDisponible, budgetDeLaSemaine, depenseSemaine, magasinsConnus, moyenneMensuelle, moyenneSemaines, prochainsJoursCourses, semainesRecentes, toutesLesSemaines } from "./calculs";
import { ajouterTicket, donneesVides } from "./donnees";
import { REGLAGES_DEFAUT } from "./parametres";
import type { Donnees } from "./types";

const R = REGLAGES_DEFAUT; // 70 € par semaine, samedi, alerte à 80 %, sans report
function avec(tickets: [string, string, number][]): Donnees {
  return tickets.reduce((d, [jour, magasin, cents]) => ajouterTicket(d, { jour, magasin, montantCents: cents }).donnees, donneesVides());
}
const AUJ = "2026-10-08"; // jeudi ; la semaine va du lundi 5 au dimanche 11 octobre

describe("budget de la semaine", () => {
  const d = avec([["2026-10-05", "Boulangerie", 680], ["2026-10-07", "Leclerc Drive", 3450], ["2026-10-03", "Leclerc Drive", 5210]]);

  it("compte les tickets de la semaine lundi → dimanche, pas ceux d'avant", () => {
    expect(depenseSemaine(d, AUJ)).toEqual({ totalCents: 4130, nb: 2 });
    expect(depenseSemaine(d, "2026-10-04")).toEqual({ totalCents: 5210, nb: 1 }); // dimanche 4 : la semaine du 28 septembre
  });

  it("ce qui reste à dépenser, la part dépensée et le niveau de la jauge", () => {
    expect(budgetDisponible(d, R, AUJ)).toMatchObject({ budgetCents: 7000, depenseCents: 4130, disponibleCents: 2870, nbTickets: 2, niveau: "normal" });
    const quatreVingts = budgetDisponible(avec([["2026-10-06", "A", 5600]]), R, AUJ);
    expect(quatreVingts.pourcent).toBeCloseTo(80, 5);
    expect(quatreVingts.niveau).toBe("attention");
  });

  it("au-delà du budget : disponible négatif et niveau « alerte »", () => {
    const b = budgetDisponible(avec([["2026-10-06", "A", 8250]]), R, AUJ);
    expect(b).toMatchObject({ disponibleCents: -1250, niveau: "alerte" });
    expect(b.pourcent).toBeGreaterThan(100);
  });

  it("sans ticket : tout le budget, niveau normal", () => {
    expect(budgetDisponible(donneesVides(), R, AUJ)).toMatchObject({ disponibleCents: 7000, pourcent: 0, niveau: "normal" });
  });
});

describe("report du budget non dépensé", () => {
  const d = avec([["2026-09-29", "A", 5000], ["2026-10-06", "A", 1000]]);

  it("désactivé : le budget est toujours celui des paramètres", () => {
    expect(budgetDeLaSemaine(d, R, AUJ)).toBe(7000);
  });

  it("activé : les 20 € non dépensés la semaine précédente s'ajoutent", () => {
    expect(budgetDeLaSemaine(d, { ...R, report: true }, AUJ)).toBe(9000);
    expect(budgetDisponible(d, { ...R, report: true }, AUJ).disponibleCents).toBe(8000);
  });

  it("le report s'enchaîne d'une semaine à l'autre, et un dépassement ne se reporte pas en négatif", () => {
    // Semaine du 21 septembre : 70 € - 20 € = 50 € de reste → 120 € pour la semaine du 28. 90 € dépensés : 30 € de reste → 100 € pour la semaine du 5 octobre.
    const e = avec([["2026-09-22", "A", 2000], ["2026-09-29", "A", 9000]]);
    expect(budgetDeLaSemaine(e, { ...R, report: true }, "2026-09-29")).toBe(12000);
    expect(budgetDeLaSemaine(e, { ...R, report: true }, AUJ)).toBe(10000);
    // Une semaine dépassée n'apporte rien et ne retire rien : le budget repart de celui des paramètres.
    const f = avec([["2026-09-29", "A", 20000]]);
    expect(budgetDeLaSemaine(f, { ...R, report: true }, AUJ)).toBe(7000);
  });
});

describe("semaines et moyennes", () => {
  const d = avec([["2026-09-14", "A", 6600], ["2026-09-21", "A", 6120], ["2026-09-28", "A", 6890], ["2026-10-05", "A", 4130]]);

  it("les cinq dernières semaines, la plus récente en dernier", () => {
    const s = semainesRecentes(d, AUJ, 5);
    expect(s.map((x) => [x.lundi, x.totalCents])).toEqual([
      ["2026-09-07", 0],
      ["2026-09-14", 6600],
      ["2026-09-21", 6120],
      ["2026-09-28", 6890],
      ["2026-10-05", 4130],
    ]);
  });

  it("la moyenne par semaine ne compte pas la semaine en cours", () => {
    expect(moyenneSemaines(semainesRecentes(d, AUJ, 5))).toBe(Math.round((0 + 6600 + 6120 + 6890) / 4));
    expect(moyenneSemaines([])).toBe(0);
  });

  it("le graphique complet : un mois (5 semaines), un an ou tout depuis le premier ticket", () => {
    expect(toutesLesSemaines(d, AUJ, "total")).toHaveLength(4);
    expect(toutesLesSemaines(d, AUJ, "mois")).toHaveLength(4);
    expect(toutesLesSemaines(d, AUJ, "annee")).toHaveLength(4);
    expect(toutesLesSemaines(donneesVides(), AUJ, "total")).toHaveLength(1);
  });
});

describe("moyenne par mois", () => {
  it("la moyenne des mois terminés, depuis le premier ticket, sans le mois en cours", () => {
    const d = avec([["2026-07-04", "A", 20_000], ["2026-08-10", "A", 30_000], ["2026-08-24", "A", 10_000], ["2026-10-03", "A", 5_000]]);
    // juillet 200 €, août 400 €, septembre 0 € → 600 / 3 = 200 € ; ce mois-ci : 50 €
    expect(moyenneMensuelle(d, AUJ)).toEqual({ moyenneCents: 20_000, nbMois: 3, ceMoisCents: 5_000 });
  });

  it("sans mois terminé : moyenne nulle, mais le mois en cours est compté", () => {
    expect(moyenneMensuelle(avec([["2026-10-03", "A", 5_000]]), AUJ)).toEqual({ moyenneCents: 0, nbMois: 0, ceMoisCents: 5_000 });
  });
});

describe("jours de courses et magasins", () => {
  it("les prochains samedis, aujourd'hui compris si c'est un samedi", () => {
    expect(prochainsJoursCourses(AUJ, R, 3)).toEqual(["2026-10-10", "2026-10-17", "2026-10-24"]);
    expect(prochainsJoursCourses("2026-10-10", R, 2)).toEqual(["2026-10-10", "2026-10-17"]);
    expect(prochainsJoursCourses(AUJ, { ...R, jourCourses: 0 }, 1)).toEqual(["2026-10-11"]);
  });

  it("les magasins connus, du plus fréquent au moins fréquent, sans « Sans magasin »", () => {
    const d = avec([["2026-10-01", "Lidl", 100], ["2026-10-02", "Leclerc", 100], ["2026-10-03", "Leclerc", 100], ["2026-10-04", "", 100]]);
    expect(magasinsConnus(d)).toEqual(["Leclerc", "Lidl"]);
  });
});

describe("tickets hors budget", () => {
  const avecHors = (): Donnees => {
    let d = avec([["2026-10-05", "Boulangerie", 680], ["2026-10-07", "Leclerc Drive", 3450]]);
    d = ajouterTicket(d, { jour: "2026-10-06", magasin: "Lidl", montantCents: 9999, horsBudget: true }).donnees;
    d = ajouterTicket(d, { jour: "2026-09-10", magasin: "Lidl", montantCents: 7777, horsBudget: true }).donnees;
    return d;
  };

  it("ne comptent ni dans la dépense de la semaine, ni dans le budget disponible", () => {
    const d = avecHors();
    expect(depenseSemaine(d, AUJ)).toEqual({ totalCents: 4130, nb: 2 });
    expect(budgetDisponible(d, R, AUJ).depenseCents).toBe(4130);
  });

  it("ne comptent pas dans les moyennes par mois, ni dans le report du budget", () => {
    const d = avecHors();
    expect(moyenneMensuelle(d, AUJ)).toEqual({ moyenneCents: 0, nbMois: 0, ceMoisCents: 4130 });
    expect(budgetDeLaSemaine(d, { ...R, report: true }, AUJ)).toBe(budgetDeLaSemaine(avec([["2026-10-05", "Boulangerie", 680], ["2026-10-07", "Leclerc Drive", 3450]]), { ...R, report: true }, AUJ));
  });

  it("le magasin reste connu pour les suggestions", () => {
    expect(magasinsConnus(avecHors())).toContain("Lidl");
  });
});
