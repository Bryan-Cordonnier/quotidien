import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ajouterTicket, donneesVides } from "./donnees";
import { PARAMETRES_DEFAUT, REGLAGES_DEFAUT, reglagesDepuis } from "./parametres";
import { empreinte, previsionsBudget } from "./projection";
import { transmettre, type Appeler, type Reponse } from "./transmission";

const R = REGLAGES_DEFAUT;
const AUJ = "2026-10-08"; // jeudi
const manifeste = JSON.parse(readFileSync(new URL("../public/manifest.json", import.meta.url), "utf8")) as { parameters: { id: string; default: unknown }[]; permissions: string[]; dependencies?: unknown; optionalDependencies: object };

describe("manifeste et paramètres", () => {
  it("les paramètres déclarés et leurs valeurs par défaut sont ceux du code", () => {
    expect(Object.fromEntries(manifeste.parameters.map((p) => [p.id, p.default]))).toEqual(PARAMETRES_DEFAUT);
    expect(reglagesDepuis({ ...PARAMETRES_DEFAUT })).toEqual(REGLAGES_DEFAUT);
    expect(reglagesDepuis(null)).toEqual(REGLAGES_DEFAUT);
  });

  it("convertit les euros en centimes ; une valeur fausse reprend la valeur par défaut", () => {
    expect(reglagesDepuis({ budget: 82.5, jour: "0", alerte: 90, report: true })).toEqual({ budgetCents: 8250, jourCourses: 0, alertePourcent: 90, report: true });
    expect(reglagesDepuis({ budget: -5, jour: "9", alerte: 0, report: "oui" })).toEqual(REGLAGES_DEFAUT);
  });

  it("Courses n'a que Budget en dépendance facultative et la permission d'appel exacte", () => {
    expect(manifeste.dependencies).toBeUndefined();
    expect(Object.keys(manifeste.optionalDependencies)).toEqual(["budget"]);
    expect([...manifeste.permissions].sort()).toEqual(["appelle:budget:ecriture", "reglages"]);
  });
});

describe("ce que Courses annonce à Budget", () => {
  it("quatre samedis : le reste du budget cette semaine, le budget entier ensuite", () => {
    const d = ajouterTicket(donneesVides(), { jour: "2026-10-07", montantCents: 3450 }).donnees;
    expect(previsionsBudget(d, R, AUJ)).toEqual([
      { montantCents: -3550, jour: "2026-10-10", libelle: "Courses" },
      { montantCents: -7000, jour: "2026-10-17", libelle: "Courses" },
      { montantCents: -7000, jour: "2026-10-24", libelle: "Courses" },
      { montantCents: -7000, jour: "2026-10-31", libelle: "Courses" },
    ]);
  });

  it("budget de la semaine dépassé : rien n'est annoncé pour cette semaine", () => {
    const d = ajouterTicket(donneesVides(), { jour: "2026-10-07", montantCents: 9000 }).donnees;
    expect(previsionsBudget(d, R, AUJ).map((p) => p.jour)).toEqual(["2026-10-17", "2026-10-24", "2026-10-31"]);
  });

  it("le jour des courses passé : la semaine en cours n'annonce plus rien", () => {
    expect(previsionsBudget(donneesVides(), R, "2026-10-12").map((p) => p.jour)).toEqual(["2026-10-17", "2026-10-24", "2026-10-31", "2026-11-07"]);
  });
});

function faux(reponse: Reponse = { ok: true, valeur: { ids: [], rejoue: false } }) {
  const appels: { fonction: string; args: Record<string, unknown> }[] = [];
  const appeler: Appeler = async (_service, fonction, args) => {
    appels.push({ fonction, args: args as Record<string, unknown> });
    return reponse;
  };
  return { appels, appeler };
}

describe("transmission à Budget", () => {
  it("envoie une fois, avec une clé liée au contenu ; la fois suivante tout est à jour", async () => {
    const { appels, appeler } = faux();
    const un = await transmettre(donneesVides(), R, AUJ, appeler);
    expect(un.rapport.etat).toBe("envoye");
    expect(appels).toHaveLength(1);
    expect(appels[0]?.fonction).toBe("previsions.remplacer");
    expect(String(appels[0]?.args.cle)).toMatch(/^courses@[0-9a-f]{8}$/);
    const deux = await transmettre(un.donnees, R, AUJ, appeler);
    expect(deux.rapport.etat).toBe("a_jour");
    expect(appels).toHaveLength(1);
  });

  it("un ticket change le reste du budget : la prévision repart", async () => {
    const { appels, appeler } = faux();
    const un = await transmettre(donneesVides(), R, AUJ, appeler);
    const avecTicket = ajouterTicket(un.donnees, { jour: "2026-10-07", montantCents: 1000 }).donnees;
    const deux = await transmettre(avecTicket, R, AUJ, appeler);
    expect(deux.rapport.etat).toBe("envoye");
    expect(appels).toHaveLength(2);
  });

  it("Budget absent : Courses ne plante pas, le message le dit, et la prévision repart une fois Budget installé", async () => {
    const absent = faux({ ok: false, code: "service_absent", message: "x" });
    const r = await transmettre(donneesVides(), R, AUJ, absent.appeler);
    expect(r.rapport.etat).toBe("absent");
    expect(r.rapport.message).toContain("Installez Budget");
    expect(r.donnees.transmis).toEqual({});
    const rejeu = faux();
    expect((await transmettre(r.donnees, R, AUJ, rejeu.appeler)).rapport.etat).toBe("envoye");
  });

  it("un refus de fond est une erreur à corriger, pas une indisponibilité", async () => {
    const { appeler } = faux({ ok: false, code: "argument_invalide", message: "Montant refusé." });
    const r = await transmettre(donneesVides(), R, AUJ, appeler);
    expect(r.rapport).toEqual({ etat: "erreur", message: "Budget a refusé la prévision : Montant refusé." });
  });

  it("l'empreinte est stable et change avec le contenu", () => {
    expect(empreinte([{ a: 1 }])).toBe(empreinte([{ a: 1 }]));
    expect(empreinte([{ a: 1 }])).not.toBe(empreinte([{ a: 2 }]));
  });
});