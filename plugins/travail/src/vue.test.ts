import { describe, expect, it } from "vitest";
import { dans, heuresMinutes, jourLong, jourMois, periodeCourte } from "./affichage";
import { ajouterAgence, ajouterContrat, ajouterMission, ajouterReserve, donneesVides, enregistrerBulletin } from "./donnees";
import { lignes, missionEnCours, missionProchaine, precisionMoyenne, resume } from "./vue";
import { REGLAGES_DEFAUT, type Donnees } from "./types";

const R = { ...REGLAGES_DEFAUT, tarifReserveCents: 10_000 };
const base = { libelle: "Opérateur", entreprise: "Logis-Verre", debut: "2026-10-05", fin: "2026-10-09", joursSemaine: [1, 2, 3, 4, 5], debutMin: 480, finMin: 900, pauseMin: 0, tauxHoraireCents: 1300 };

function jeu(): Donnees {
  let d = donneesVides();
  const a = ajouterAgence(d, { nom: "Interim Plus", rythme: "mois" });
  d = a.donnees;
  d = ajouterMission(d, { ...base, agenceId: a.id }).donnees; // m2 : en cours le 8 octobre
  d = ajouterMission(d, { ...base, libelle: "Cariste", entreprise: "Dupont", debut: "2026-12-07", fin: "2026-12-11" }).donnees; // prévue
  d = ajouterMission(d, { ...base, libelle: "Manutention", entreprise: "", debut: "2026-08-03", fin: "2026-08-07" }).donnees; // terminée
  d = ajouterReserve(d, { libelle: "Réserve de septembre", jours: ["2026-09-09", "2026-09-10"], horsBase: 1 }).donnees;
  d = ajouterContrat(d, { libelle: "Opérateur", entreprise: "Verallia", type: "cdd", brutMensuelCents: 200_000, debut: "2026-10-01", fin: "2026-11-30", jourDePaie: 28 }).donnees;
  d = ajouterContrat(d, { libelle: "Chef d'équipe", type: "cdi", brutMensuelCents: 300_000, debut: "2026-10-15", jourDePaie: 28 }).donnees;
  return d;
}
const AUJ = "2026-10-08";

describe("lignes des onglets", () => {
  it("intérim : la plus récente en premier, avec statut, net et net par mois", () => {
    const l = lignes(jeu(), R, "interim", AUJ);
    expect(l.map((x) => [x.titre, x.statut])).toEqual([
      ["Cariste — Dupont", "prevu"],
      ["Opérateur — Logis-Verre", "encours"],
      ["Manutention", "termine"],
    ]);
    expect(l[1]?.netCents).toBe(42_943);
    expect(l[1]?.parMoisCents).toBe(42_943); // moins d'un mois : le net de la mission est aussi son net du mois
  });

  it("réserve : une ligne par période, entre son premier et son dernier jour", () => {
    const [p] = lignes(jeu(), R, "reserve", AUJ);
    expect(p).toMatchObject({ titre: "Réserve de septembre", debut: "2026-09-09", fin: "2026-09-10", statut: "termine" });
    // 2 jours à 100 € moins 22 % + 1 jour hors base à 38 €
    expect(p?.netCents).toBe(15_600 + 3_800);
  });

  it("CDD : net de tout le contrat ; CDI sans fin : seulement le net par mois", () => {
    const [cdd] = lignes(jeu(), R, "cdd", AUJ);
    expect(cdd).toMatchObject({ titre: "Opérateur — Verallia", statut: "encours" });
    expect(cdd?.netCents).toBe(156_000 * 2 + 62_400);
    const [cdi] = lignes(jeu(), R, "cdi", AUJ);
    expect(cdi).toMatchObject({ titre: "Chef d'équipe", fin: null, netCents: null, parMoisCents: 234_000, statut: "prevu" });
  });

  it("le bulletin reçu accompagne sa ligne", () => {
    const d = enregistrerBulletin(jeu(), "mission:m2", { netCents: 43_000, jour: "2026-10-16", ecritureId: null });
    expect(lignes(d, R, "interim", AUJ).find((x) => x.ref === "mission:m2")?.bulletin?.netCents).toBe(43_000);
  });
});

describe("mission en cours et prochaine", () => {
  it("trouve la mission en cours, la prochaine, et rien quand il n'y en a pas", () => {
    expect(missionEnCours(jeu(), AUJ)?.id).toBe("m2");
    expect(missionProchaine(jeu(), AUJ)?.libelle).toBe("Cariste");
    expect(missionEnCours(jeu(), "2027-06-01")).toBeUndefined();
    expect(missionProchaine(jeu(), "2027-06-01")).toBeUndefined();
  });

  it("le résumé : avancement, semaine, prochaine paie selon le rythme de l'agence (au mois : une paie, 7 jours après le dernier jour)", () => {
    const d = jeu();
    const r = resume(d, R, missionEnCours(d, AUJ)!, AUJ);
    expect(r).toMatchObject({ titre: "Opérateur — Logis-Verre", faits: 4, total: 5, pourcent: 80, netCents: 42_943 });
    expect(r.semaine).toEqual({ planifieMin: 2100, ajouteesMin: 0, totalMin: 2100 });
    expect(r.prochainePaie).toEqual({ date: "2026-10-16", netCents: 42_943 });
  });
});

describe("précision moyenne", () => {
  it("aucun bulletin : pas de chiffre ; avec des bulletins : 100 % moins l'écart moyen", () => {
    expect(precisionMoyenne(jeu(), R)).toBeNull();
    let d = jeu();
    d = enregistrerBulletin(d, "mission:m2", { netCents: 42_943, jour: "2026-10-16", ecritureId: null }); // exact
    expect(precisionMoyenne(d, R)).toBe(1);
    d = enregistrerBulletin(d, "reserve:m5".replace("m5", "r5"), { netCents: 19_400 + 1_940, jour: "2026-09-20", ecritureId: null }); // +10 %
    // exact : écart 0 ; réserve : 1 940 / 19 400 = 10 % → moyenne des écarts 5 % → précision 95 %
    expect(precisionMoyenne(d, R)).toBeCloseTo(0.95, 5);
  });
});

describe("affichage", () => {
  it("dates courtes en français", () => {
    expect(jourMois("2026-10-09")).toBe("09/10");
    expect(periodeCourte("2026-10-01", "2026-12-28")).toBe("du 01/10 au 28/12");
    expect(periodeCourte("2026-10-15", null)).toBe("depuis le 15/10");
    expect(jourLong("2026-11-05")).toBe("jeu. 5 nov.");
    expect(dans("2026-10-08", "2026-12-07")).toBe("dans 60 j");
    expect(dans("2026-10-08", "2026-10-09")).toBe("demain");
    expect(dans("2026-10-08", "2026-10-08")).toBe("aujourd'hui");
    expect(heuresMinutes(2195)).toBe("36 h 35");
    expect(heuresMinutes(0)).toBe("0 h 00");
  });
});