import { describe, expect, it } from "vitest";
import { carnetVide } from "./carnet";
import { aCalculer, adresseDe, ajouterSejour, avecTrajet, avecTrajetAuto, enregistrerLieu, logementDu, supprimerLieu } from "./lieux";
import type { Carnet, Occurrence } from "./types";

const base = (): Carnet => {
  let c = enregistrerLieu(carnetVide(), { nom: "Chez maman", adresse: "103 Route des crêtes, 64300 Castetner", logement: true });
  c = enregistrerLieu(c, { nom: "Chez mamie", adresse: "Sainsontan, 64100 Bayonne", logement: false });
  c = enregistrerLieu(c, { nom: "Armar (Anglet)", adresse: "Armar, 64600 Anglet", logement: false });
  return c;
};
const occ = (jour: string, lieu: string | null = "Armar (Anglet)"): Occurrence => ({ evenementId: "e1", type: "travail", titre: "Mission", lieu, jour, debutMin: 450, finMin: 990, trajetMin: null, contrat: "interim", tempsContratMin: null, source: "travail" });

describe("lieux et trajets automatiques", () => {
  it("dort chez maman par défaut, chez mamie pendant un séjour", () => {
    const c = ajouterSejour(base(), { lieuId: "l2", du: "2026-10-28", au: null });
    expect(logementDu(c, "2026-10-27")?.nom).toBe("Chez maman");
    expect(logementDu(c, "2026-10-29")?.nom).toBe("Chez mamie");
  });
  it("trouve l'adresse d'un lieu enregistré, sinon garde le texte", () => {
    expect(adresseDe(base(), "armar (anglet)")).toBe("Armar, 64600 Anglet");
    expect(adresseDe(base(), "Leroy Merlin Bayonne")).toBe("Leroy Merlin Bayonne");
  });
  it("demande un calcul depuis le bon logement, puis le garde 30 min pour demain", () => {
    const c = ajouterSejour(base(), { lieuId: "l2", du: "2026-10-28", au: null });
    const T = Date.UTC(2026, 9, 27, 6);
    const [d] = aCalculer(c, [occ("2026-10-28")], "2026-10-27", T);
    expect(d).toMatchObject({ depuis: "Sainsontan, 64100 Bayonne", vers: "Armar, 64600 Anglet", arriveeMin: 450 - c.reglages.margeArriveeMin });
    const apres = avecTrajet(c, d!, 12.4, T, "2026-10-27");
    expect(aCalculer(apres, [occ("2026-10-28")], "2026-10-27", T + 10 * 60_000)).toEqual([]);
    expect(aCalculer(apres, [occ("2026-10-28")], "2026-10-27", T + 40 * 60_000)).toHaveLength(1);
    expect(avecTrajetAuto(occ("2026-10-28"), apres).trajetMin).toBe(12);
  });
  it("ne calcule rien sans lieu, ni pour un jour passé, ni si c'est désactivé", () => {
    const c = base();
    expect(aCalculer(c, [occ("2026-10-28", null), occ("2026-10-20")], "2026-10-27", 0)).toEqual([]);
    expect(aCalculer({ ...c, trajetsAutoActifs: false }, [occ("2026-10-28")], "2026-10-27", 0)).toEqual([]);
  });
  it("un seul logement par défaut ; supprimer un lieu retire ses séjours", () => {
    let c = enregistrerLieu(base(), { id: "l2", nom: "Chez mamie", adresse: "Sainsontan, 64100 Bayonne", logement: true });
    expect(c.lieux.filter((l) => l.logement).map((l) => l.nom)).toEqual(["Chez mamie"]);
    c = ajouterSejour(c, { lieuId: "l2", du: "2026-10-28", au: "2026-10-30" });
    expect(supprimerLieu(c, "l2").sejours).toEqual([]);
    expect(() => enregistrerLieu(c, { nom: "Chez maman", adresse: "x", logement: false })).toThrow();
  });
});
