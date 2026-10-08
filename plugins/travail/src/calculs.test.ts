// Vecteurs d'or de la paie. Les chiffres viennent de paie.rs (gestion-budget-perso) ou ont été recalculés à la main ; les taux sont ceux des
// réglages par défaut (hypothèses à confirmer sur un bulletin, voir types.ts).
import { describe, expect, it } from "vitest";
import { avancement, datePaiement, detailMission, detailReserve, joursDeLaSemaine, joursDeMission, minutesDeLaSemaine, minutesDuJour, paiesContrat, paiesMission, reglagesDeMission, statutContrat, titreContrat } from "./calculs";
import { REGLAGES_DEFAUT, type Agence, type Contrat, type Mission, type PeriodeReserve } from "./types";

const R = REGLAGES_DEFAUT;
const mission = (extra: Partial<Mission> = {}): Mission => ({
  id: "m1",
  libelle: "Mission",
  entreprise: "",
  agenceId: null,
  trajetMin: null,
  panierCents: 0,
  deplacementCents: 0,
  debut: "2026-10-05", // lundi
  fin: "2026-10-09",
  joursSemaine: [1, 2, 3, 4, 5],
  exclusions: [],
  debutMin: 8 * 60,
  finMin: 15 * 60,
  pauseMin: 0,
  tauxHoraireCents: 1300,
  supplementaires: [],
  ...extra,
});

describe("intérim", () => {
  it("vecteur d'or : 5 jours de 7 h à 13 € → brut 455 €, IFM 45,50 €, CP 50,05 €, net 429,43 €", () => {
    const d = detailMission(mission(), R);
    expect(d.semaines).toHaveLength(1);
    expect(d.semaines[0]).toMatchObject({ planifieMin: 2100, normalesMin: 2100, sup1Min: 0, sup2Min: 0 });
    expect(d.brutBaseCents).toBe(45_500);
    expect(d.ifmCents).toBe(4_550);
    expect(d.cpCents).toBe(5_005);
    expect(d.brutTotalCents).toBe(55_055);
    expect(d.netCents).toBe(42_943);
  });

  it("5 jours de 9 h : 35 h normales + 8 h à +25 % + 2 h à +50 % → brut 624 €, net 588,93 €", () => {
    const d = detailMission(mission({ finMin: 17 * 60 }), R);
    expect(d.semaines[0]).toMatchObject({ planifieMin: 2700, normalesMin: 2100, sup1Min: 480, sup2Min: 120 });
    // 455 € + 8 h × 16,25 € (130 €) + 2 h × 19,50 € (39 €) = 624 €
    expect(d.brutBaseCents).toBe(62_400);
    expect(d.netCents).toBe(58_893);
  });

  it("une mission à cheval sur deux semaines : les heures supplémentaires se comptent par semaine lundi → dimanche", () => {
    const d = detailMission(mission({ debut: "2026-10-07", fin: "2026-10-13", joursSemaine: [1, 2, 3, 4, 5, 6, 7], finMin: 16 * 60 }), R);
    expect(d.semaines.map((s) => [s.lundi, s.planifieMin, s.sup1Min])).toEqual([
      ["2026-10-05", 2400, 300], // mercredi → dimanche : 5 × 8 h = 40 h
      ["2026-10-12", 960, 0], // lundi, mardi : 16 h
    ]);
  });

  it("une nuit 22 h → 6 h avec 30 min de pause dure 7 h 30 et compte pour le jour où elle commence", () => {
    const nuit = mission({ debutMin: 22 * 60, finMin: 6 * 60, pauseMin: 30 });
    expect(minutesDuJour(nuit)).toBe(450);
  });

  it("les exclusions retirent des jours ; les minutes supplémentaires manuelles sont payées en heures supplémentaires", () => {
    expect(joursDeMission(mission({ exclusions: ["2026-10-07"] }))).toEqual(["2026-10-05", "2026-10-06", "2026-10-08", "2026-10-09"]);
    const d = detailMission(mission({ supplementaires: [{ jour: "2026-10-08", minutes: 60 }] }), R);
    // 35 h normales + 1 h à 16,25 € : 455 + 16,25 = 471,25 €
    expect(d.semaines[0]).toMatchObject({ normalesMin: 2100, sup1Min: 60 });
    expect(d.brutBaseCents).toBe(47_125);
  });

  it("une mission sans journée travaillée ne rapporte rien et n'a pas de date de paiement", () => {
    const d = detailMission(mission({ joursSemaine: [7] }), R);
    expect(d.netCents).toBe(0);
    expect(d.datePaiement).toBeNull();
  });

  it("la paie tombe 7 jours après le dernier jour, reportée au jour ouvré suivant", () => {
    expect(detailMission(mission(), R).datePaiement).toBe("2026-10-16"); // vendredi 9 + 7 = vendredi 16
    expect(datePaiement("2026-10-10", 7)).toBe("2026-10-19"); // samedi + 7 = samedi 17 → lundi 19
    expect(datePaiement("2026-12-18", 7)).toBe("2026-12-28"); // vendredi 25 décembre, férié → lundi 28
  });

  it("les taux sont des réglages : 20 % de cotisations au lieu de 22 % change le net", () => {
    expect(detailMission(mission(), { ...R, cotisationsBp: 2000 }).netCents).toBe(44_044); // 550,55 × 0,80 = 440,44
  });
});

describe("réserve", () => {
  const periode: PeriodeReserve = { id: "r1", libelle: "Réserve", jours: ["2026-10-07", "2026-10-08", "2026-10-09"], horsBase: 2 };

  it("3 jours à 100 € moins 22 % + 2 jours hors base à 38 € → 310 €", () => {
    const d = detailReserve(periode, { ...R, tarifReserveCents: 10_000 });
    expect(d).toMatchObject({ brutCents: 30_000, netJoursCents: 23_400, indemniteCents: 7_600, netCents: 31_000, dernierJour: "2026-10-09", datePaiement: "2026-10-16" });
  });

  it("sans tarif réglé, seuls les jours hors base rapportent", () => {
    expect(detailReserve(periode, R).netCents).toBe(7_600);
  });
});

describe("CDI et CDD", () => {
  const cdi: Contrat = { id: "c1", libelle: "CDI", entreprise: "", type: "cdi", brutMensuelCents: 300_000, debut: "2026-10-15", fin: null, jourDePaie: 28 };

  it("CDI qui commence le 15 octobre : prorata en jours ouvrés (12 sur 22), puis le mois complet reporté au lundi", () => {
    const p = paiesContrat(cdi, R, "2026-10-01", "2026-11-30");
    // 3 000 € × 12 / 22 = 1 636,36 € brut (163 636 centimes) → × 0,78 = 1 276,36 € ; novembre : 3 000 × 0,78 = 2 340 €
    expect(p.map((x) => [x.datePaiement, x.netCents])).toEqual([["2026-10-28", 127_636], ["2026-11-30", 234_000]]);
  });

  it("une paie hors de la fenêtre demandée n'est pas rendue", () => {
    expect(paiesContrat(cdi, R, "2026-11-01", "2026-11-30").map((x) => x.datePaiement)).toEqual(["2026-11-30"]);
    expect(paiesContrat(cdi, R, "2027-01-01", "2027-01-31")).toHaveLength(1);
  });

  it("CDD du 1er octobre au 30 novembre à 2 000 € : deux paies de 1 560 € et une ligne de fin de contrat de 624 €", () => {
    const cdd: Contrat = { id: "c2", libelle: "CDD", entreprise: "", type: "cdd", brutMensuelCents: 200_000, debut: "2026-10-01", fin: "2026-11-30", jourDePaie: 28 };
    const p = paiesContrat(cdd, R, "2026-10-01", "2027-01-31");
    // brut total 4 000 € : précarité 400 € + congés 400 € = 800 € brut → 624 € net
    expect(p.map((x) => [x.datePaiement, x.netCents, x.libelle])).toEqual([
      ["2026-10-28", 156_000, "CDD"],
      ["2026-11-30", 156_000, "CDD"],
      ["2026-11-30", 62_400, "CDD (fin de contrat)"],
    ]);
  });
});

describe("indemnités, agences et paies", () => {
  it("panier et déplacement s'ajoutent au net par jour travaillé, sans cotisations : +11,60 € × 5 jours = 58 €", () => {
    const d = detailMission(mission({ panierCents: 710, deplacementCents: 450 }), R);
    expect(d.indemnitesCents).toBe(5_800);
    expect(d.netCents).toBe(42_943 + 5_800);
  });

  it("les cotisations de l'agence remplacent celles des paramètres ; sans agence ou sans taux propre, les paramètres s'appliquent", () => {
    const agences: Agence[] = [
      { id: "a1", nom: "Interim Plus", cotisationsBp: 2000, rythme: "fin" },
      { id: "a2", nom: "Atelier", cotisationsBp: null, rythme: "fin" },
    ];
    expect(reglagesDeMission({ agenceId: "a1" }, agences, R).cotisationsBp).toBe(2000);
    expect(reglagesDeMission({ agenceId: "a2" }, agences, R).cotisationsBp).toBe(2200);
    expect(reglagesDeMission({ agenceId: null }, agences, R).cotisationsBp).toBe(2200);
    expect(reglagesDeMission({ agenceId: "inconnue" }, agences, R).cotisationsBp).toBe(2200);
    expect(detailMission(mission(), reglagesDeMission({ agenceId: "a1" }, agences, R)).netCents).toBe(44_044);
  });

  it("paie à la fin : une seule paie, 7 jours après le dernier jour", () => {
    expect(paiesMission(mission(), R, "fin")).toEqual([{ date: "2026-10-16", netCents: 42_943 }]);
  });

  it("paie à la semaine : une paie par semaine, la somme est exacte au centime", () => {
    const m = mission({ debut: "2026-10-05", fin: "2026-10-16" }); // deux semaines de 5 jours
    const paies = paiesMission(m, R, "semaine");
    expect(paies.map((p) => p.date)).toEqual(["2026-10-16", "2026-10-23"]);
    expect(paies.reduce((s, p) => s + p.netCents, 0)).toBe(detailMission(m, R).netCents);
    expect(paies[0]!.netCents).toBe(paies[1]!.netCents);
  });

  it("paie au mois : une mission à cheval sur deux mois a deux paies, chacune au prorata de ses heures", () => {
    const m = mission({ debut: "2026-10-26", fin: "2026-11-06" }); // lun. 26 → ven. 6 : 5 jours en octobre (26 → 30), 5 en novembre (2 → 6)
    const paies = paiesMission(m, R, "mois");
    expect(paies).toHaveLength(2);
    expect(paies[0]?.date).toBe("2026-11-06"); // 30 octobre + 7 jours = 6 novembre
    expect(paies.reduce((s, p) => s + p.netCents, 0)).toBe(detailMission(m, R).netCents);
  });

  it("une mission sans journée ne donne aucune paie", () => {
    expect(paiesMission(mission({ joursSemaine: [7] }), R, "mois")).toEqual([]);
  });
});

describe("avancement et semaine", () => {
  it("12 jours sur 40 : on compte les jours travaillés déjà passés, aujourd'hui compris", () => {
    expect(avancement(mission(), "2026-10-04")).toEqual({ faits: 0, total: 5 });
    expect(avancement(mission(), "2026-10-07")).toEqual({ faits: 3, total: 5 });
    expect(avancement(mission(), "2026-12-01")).toEqual({ faits: 5, total: 5 });
  });

  it("la semaine : lundi → dimanche, le temps prévu et le temps ajouté à la main", () => {
    expect(joursDeLaSemaine("2026-10-08")[0]).toBe("2026-10-05");
    expect(joursDeLaSemaine("2026-10-08")[6]).toBe("2026-10-11");
    const m = mission({ supplementaires: [{ jour: "2026-10-08", minutes: 95 }, { jour: "2026-10-08", minutes: 0 }] });
    expect(minutesDeLaSemaine(m, "2026-10-08")).toEqual({ planifieMin: 2100, ajouteesMin: 95, totalMin: 2195 });
    expect(minutesDeLaSemaine(m, "2026-10-14")).toEqual({ planifieMin: 0, ajouteesMin: 0, totalMin: 0 });
  });

  it("le statut d'un contrat signé suit les dates : prévu, en cours, terminé", () => {
    expect(statutContrat("2026-10-05", "2026-10-09", "2026-10-04")).toBe("prevu");
    expect(statutContrat("2026-10-05", "2026-10-09", "2026-10-05")).toBe("encours");
    expect(statutContrat("2026-10-05", "2026-10-09", "2026-10-09")).toBe("encours");
    expect(statutContrat("2026-10-05", "2026-10-09", "2026-10-10")).toBe("termine");
    expect(statutContrat("2026-10-05", null, "2030-01-01")).toBe("encours");
  });

  it("« Poste — Entreprise » ; le poste seul sans entreprise", () => {
    expect(titreContrat({ libelle: "Cariste", entreprise: "Dupont Logistique" })).toBe("Cariste — Dupont Logistique");
    expect(titreContrat({ libelle: "Cariste", entreprise: "" })).toBe("Cariste");
  });
});