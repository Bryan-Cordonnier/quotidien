import { describe, expect, it } from "vitest";
import { carnetVide } from "./carnet";
import { aCalculer, adresseDe, avecTrajet, avecTrajetAuto, enregistrerLieu, supprimerLieu } from "./lieux";
import type { Carnet, Occurrence } from "./types";

const base = (): Carnet => {
  let c = enregistrerLieu(carnetVide(), { nom: "Chez maman", adresse: "103 Route des crêtes, 64300 Castetner", logement: true });
  c = enregistrerLieu(c, { nom: "Chez mamie", adresse: "Sainsontan, 64100 Bayonne", logement: false });
  c = enregistrerLieu(c, { nom: "Armar (Anglet)", adresse: "Armar, 64600 Anglet", logement: false });
  return c;
};
const occ = (jour: string, lieu: string | null = "Armar (Anglet)"): Occurrence => ({ evenementId: "e1", type: "travail", titre: "Mission", lieu, jour, debutMin: 450, finMin: 990, trajetMin: null, contrat: "interim", tempsContratMin: null, source: "travail" });

describe("lieux et trajets automatiques", () => {
  it("trouve l'adresse d'un lieu enregistré, sinon garde le texte", () => {
    expect(adresseDe(base(), "armar (anglet)")).toBe("Armar, 64600 Anglet");
    expect(adresseDe(base(), "Leroy Merlin Bayonne")).toBe("Leroy Merlin Bayonne");
  });
  it("demande un calcul (départ réglé dans le moteur), le garde 30 min pour demain, ignore un trajet absurde", () => {
    const c = base();
    const T = Date.UTC(2026, 9, 27, 6);
    const [d] = aCalculer(c, [occ("2026-10-28")], "2026-10-27", T);
    expect(d).toMatchObject({ depuis: "", vers: "Armar, 64600 Anglet", arriveeMin: 450 - c.reglages.margeArriveeMin });
    expect(avecTrajetAuto(occ("2026-10-28"), avecTrajet(c, d!, 600, T, "2026-10-27")).trajetMin).toBeNull();
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
  it("supprime un lieu et refuse un doublon", () => {
    const c = base();
    expect(supprimerLieu(c, "l2").lieux.map((l) => l.nom)).toEqual(["Chez maman", "Armar (Anglet)"]);
    expect(() => enregistrerLieu(c, { nom: "Chez maman", adresse: "x", logement: false })).toThrow();
  });
});
