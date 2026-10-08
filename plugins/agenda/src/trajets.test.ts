import { describe, expect, it } from "vitest";
import { carnetVide } from "./carnet";
import { journee, trajetsDe, type ReglagesJournee } from "./journee";
import { cible, etats, jeSuisArrive, jeSuisParti } from "./trajets";
import type { Occurrence } from "./types";

const R: ReglagesJournee = { margeArriveeMin: 10, miseEnRouteMin: 10, preparationMin: 45, sommeilMin: 480, endormissementMin: 15, majorationTrajetBp: 0, leverDefautMin: 480, enchainerMin: 90 };
const occ = (p: Partial<Occurrence> & Pick<Occurrence, "titre" | "debutMin" | "finMin">): Occurrence => ({
  evenementId: "e1", type: "autre", lieu: null, jour: "2026-10-08", trajetMin: null, contrat: null, tempsContratMin: null, source: "@utilisateur", ...p,
});
const travail = occ({ titre: "Opérateur", type: "travail", lieu: "Logis-Verre", debutMin: 375, finMin: 855, trajetMin: 25 });
const medecin = occ({ titre: "Médecin", type: "rdv", lieu: "Cabinet Durand", debutMin: 1020, finMin: 1050, trajetMin: 15 });
const JOUR = "2026-10-08";
// Quatre trajets : 340-375, 855-880, 995-1020, 1050-1065
const trajets = trajetsDe(journee([travail, medecin], [travail], R));
const h = (heures: number, minutes = 0) => heures * 60 + minutes;

describe("quel trajet ?", () => {
  it("le logiciel devine le trajet d'après l'heure et ce qui est déjà noté", () => {
    expect(cible(trajets, {}, h(5, 30))).toBe(0);
    expect(cible(trajets, {}, h(7))).toBe(0); // le premier reste le trajet visé jusqu'à 1 h 30 après son arrivée prévue (6 h 15)
  });

  it("un trajet arrivé est passé ; un trajet oublié depuis plus de 1 h 30 est laissé de côté", () => {
    const notes = { "0": { depart: 341, arrivee: 372 } };
    expect(cible(trajets, notes, h(9))).toBe(1);
    expect(cible(trajets, {}, h(9))).toBe(1); // 6 h 15 + 1 h 30 = 7 h 45 : à 9 h, le premier est oublié
    expect(cible(trajets, { "0": { depart: 1, arrivee: 2 }, "1": { depart: 3, arrivee: 4 }, "2": { depart: 5, arrivee: 6 }, "3": { depart: 7, arrivee: 8 } }, h(18))).toBe(-1);
  });

  it("l'état des points : fait, en route, prochain, à venir", () => {
    const notes = { "0": { depart: 341, arrivee: 372 }, "1": { depart: 856, arrivee: null } };
    expect(etats(trajets, notes, h(14, 30))).toEqual(["fait", "en_route", "a_venir", "a_venir"]);
    expect(etats(trajets, {}, h(5))).toEqual(["prochain", "a_venir", "a_venir", "a_venir"]);
  });
});

describe("je suis parti", () => {
  it("accepté à l'heure : le départ est noté, avec l'avance ou le retard", () => {
    const r = jeSuisParti(carnetVide(), JOUR, trajets, h(5, 30));
    expect(r.ok).toBe(true);
    expect(r.texte).toContain("10 min avant");
    expect(r.carnet.trajets[JOUR]).toEqual({ "0": { depart: 330, arrivee: null } });
  });

  it("refusé quand on est déjà parti", () => {
    const parti = jeSuisParti(carnetVide(), JOUR, trajets, h(5, 30)).carnet;
    const r = jeSuisParti(parti, JOUR, trajets, h(5, 32));
    expect(r.ok).toBe(false);
    expect(r.texte).toContain("déjà parti à 05:30");
    expect(r.carnet).toBe(parti);
  });

  it("refusé quand le prochain trajet est dans plus d'une heure : on dit à quelle heure", () => {
    const ok = { ...carnetVide(), trajets: { [JOUR]: { "0": { depart: 340, arrivee: 372 } } } };
    const r = jeSuisParti(ok, JOUR, trajets, h(9));
    expect(r.ok).toBe(false);
    expect(r.texte).toContain("14:15");
    expect(r.texte).toContain("5 h 15");
  });

  it("refusé quand il n'y a plus de trajet", () => {
    const tous = Object.fromEntries([0, 1, 2, 3].map((i) => [String(i), { depart: 1, arrivee: 2 }]));
    expect(jeSuisParti({ ...carnetVide(), trajets: { [JOUR]: tous } }, JOUR, trajets, h(20)).ok).toBe(false);
  });
});

describe("je suis arrivé", () => {
  it("refusé quand on n'est pas parti, avec l'heure du prochain départ", () => {
    const r = jeSuisArrive(carnetVide(), JOUR, trajets, h(5, 30));
    expect(r.ok).toBe(false);
    expect(r.texte).toContain("05:40");
    expect(r.texte).toContain("appuyez d'abord sur « Je suis parti »");
  });

  it("accepté après le départ : le trajet réel est comparé à l'estimé", () => {
    const parti = jeSuisParti(carnetVide(), JOUR, trajets, h(5, 30)).carnet;
    const r = jeSuisArrive(parti, JOUR, trajets, h(6, 12));
    expect(r.ok).toBe(true);
    expect(r.texte).toContain("trajet réel 42 min pour 35 min");
    expect(r.texte).toContain("+7 min");
    expect(r.carnet.trajets[JOUR]?.["0"]).toEqual({ depart: 330, arrivee: 372 });
  });

  it("une journée entière : chaque bouton ne répond qu'au trajet du moment", () => {
    let c = carnetVide();
    const pas = (f: typeof jeSuisParti, minutes: number, attendu: boolean) => {
      const r = f(c, JOUR, trajets, minutes);
      expect(r.ok, `${f.name} à ${minutes} : ${r.texte}`).toBe(attendu);
      c = r.carnet;
    };
    pas(jeSuisParti, h(5, 38), true);
    pas(jeSuisArrive, h(6, 10), true);
    pas(jeSuisArrive, h(9), false); // pas parti
    pas(jeSuisParti, h(9), false); // trop tôt pour le retour de 14 h 15
    pas(jeSuisParti, h(14, 20), true);
    pas(jeSuisArrive, h(14, 45), true);
    pas(jeSuisParti, h(16, 40), true);
    pas(jeSuisArrive, h(17), true);
    pas(jeSuisParti, h(17, 35), true);
    pas(jeSuisArrive, h(17, 50), true);
    expect(etats(trajets, c.trajets[JOUR]!, h(18))).toEqual(["fait", "fait", "fait", "fait"]);
  });
});