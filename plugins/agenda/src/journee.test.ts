import { describe, expect, it } from "vitest";
import { carnetVide } from "./carnet";
import { coucherDe as coucherDeJour, departDe, journee, leverDe, trajetsDe, type ReglagesJournee } from "./journee";
import type { Occurrence } from "./types";

const R: ReglagesJournee = { margeArriveeMin: 10, miseEnRouteMin: 10, preparationMin: 45, sommeilMin: 480, endormissementMin: 15, majorationTrajetBp: 0, leverDefautMin: 480, enchainerMin: 90 };
const occ = (p: Partial<Occurrence> & Pick<Occurrence, "titre" | "debutMin" | "finMin">): Occurrence => ({
  evenementId: "e1", type: "autre", lieu: null, jour: "2026-10-08", trajetMin: null, contrat: null, tempsContratMin: null, source: "@utilisateur", ...p,
});
const travail = occ({ titre: "Opérateur de production", type: "travail", lieu: "Logis-Verre", debutMin: 375, finMin: 855, trajetMin: 25, contrat: "interim", tempsContratMin: 450, source: "travail" });
const medecin = occ({ titre: "Médecin", type: "rdv", lieu: "Cabinet Durand", debutMin: 1020, finMin: 1050, trajetMin: 15 });
const resume = (j: ReturnType<typeof journee>) => j.segments.map((s) => `${s.genre}:${s.debutMin}-${s.finMin}`);

describe("lever, départ et coucher", () => {
  it("le départ est le début moins le trajet et la marge ; sans trajet, le début", () => {
    expect(departDe(travail, R)).toBe(340);
    expect(departDe(occ({ titre: "x", debutMin: 600, finMin: 660 }), R)).toBe(600);
  });

  it("le lever se calcule à rebours depuis le premier départ du matin : 4 h 45 ; sans événement tôt, l'heure par défaut", () => {
    expect(leverDe([travail], R)).toBe(285);
    expect(leverDe([medecin], R)).toBe(480); // un rendez-vous l'après-midi ne commande pas le réveil
    expect(leverDe([], R)).toBe(480);
  });

  it("le coucher est le lever du lendemain moins 8 h de sommeil et 15 min pour s'endormir : 20 h 30", () => {
    expect(coucherDeJour([travail], R)).toBe(1230);
    expect(coucherDeJour([], R)).toBe(480 + 1440 - 480 - 15);
  });

  it("la majoration du trajet allonge le trajet (et avance le départ)", () => {
    expect(departDe(travail, { ...R, majorationTrajetBp: 2000 })).toBe(375 - 30 - 10);
  });
});

describe("la journée", () => {
  it("travail puis rendez-vous : préparation, trajet, travail, retour, temps libre, trajet, rendez-vous, retour, temps libre, coucher", () => {
    const j = journee([travail, medecin], [travail], R);
    expect(resume(j)).toEqual([
      "preparation:285-340",
      "trajet:340-375",
      "evenement:375-855",
      "trajet:855-880",
      "libre:880-995",
      "trajet:995-1020",
      "evenement:1020-1050",
      "trajet:1050-1065",
      "libre:1065-1230",
      "coucher:1230-1230",
    ]);
    expect(j.leverMin).toBe(285);
    expect(j.coucherMin).toBe(1230);
    expect(trajetsDe(j)).toHaveLength(4);
  });

  it("un rendez-vous juste après le travail : un trajet direct, pas de retour à la maison ni de nouvel aller", () => {
    const cafe = occ({ titre: "Café avec Léa", lieu: "Place du Marché", debutMin: 900, finMin: 960, trajetMin: 12 });
    const j = journee([travail, cafe], [], R);
    const trajets = trajetsDe(j);
    expect(trajets.map((t) => [t.titre, t.debutMin, t.finMin, t.direct])).toEqual([
      ["Trajet", 340, 375, false],
      ["Trajet direct", 888, 900, true],
      ["Trajet retour", 960, 972, false],
    ]);
    expect(trajets[1]?.detail).toBe("depuis « Opérateur de production »");
  });

  it("deux événements éloignés (plus de 90 min) ne s'enchaînent pas ; le seuil se règle", () => {
    const tard = occ({ titre: "Dîner", lieu: "Chez Paul", debutMin: 855 + 100, finMin: 1100, trajetMin: 12 });
    expect(trajetsDe(journee([travail, tard], [], R)).map((t) => t.titre)).toEqual(["Trajet", "Trajet retour", "Trajet", "Trajet retour"]);
    expect(trajetsDe(journee([travail, tard], [], { ...R, enchainerMin: 120 })).map((t) => t.titre)).toEqual(["Trajet", "Trajet direct", "Trajet retour"]);
  });

  it("deux événements qui se chevauchent : aucun trajet inventé, le chevauchement est signalé", () => {
    const banque = occ({ titre: "Banque", debutMin: 810, finMin: 870, trajetMin: 10 });
    const j = journee([travail, banque], [], R);
    expect(j.conflits.sort()).toEqual(["Banque", "Opérateur de production"]);
    expect(trajetsDe(j).filter((t) => t.debutMin >= 800 && t.debutMin < 870)).toEqual([]);
  });

  it("un jour sans événement : un seul bloc de temps libre du lever au coucher", () => {
    const j = journee([], [], R);
    expect(resume(j)).toEqual(["libre:480-1425", "coucher:1425-1425"]);
  });

  it("le carnet vide a ses nouveaux champs", () => {
    expect(carnetVide()).toMatchObject({ sommeil: {}, trajets: {} });
  });
});