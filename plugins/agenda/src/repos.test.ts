import { describe, expect, it } from "vitest";
import { resumeRepos } from "./repos";
import type { Evenement } from "./types";

const evt = (jour: string, debutMin: number, finMin: number, type: Evenement["type"] = "travail"): Evenement => ({
  id: "e1", type, titre: "T", lieu: null, jour, debutMin, finMin, trajetMin: null, repetition: null, contrat: null, tempsContratMin: null, source: { plugin: "travail", ref: "x" },
});

describe("repos légal de la semaine", () => {
  it("cinq journées de 8 h : 40 h, 8 h au plus, 16 h de repos", () => {
    const sem = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"].map((j) => evt(j, 375, 855));
    expect(resumeRepos(sem, "2026-10-08")).toEqual({ totalMin: 2400, plusLongueJourneeMin: 480, reposMinMin: 960 });
  });

  it("une nuit qui passe minuit : le repos se compte depuis la fin réelle", () => {
    const nuits = [evt("2026-10-05", 22 * 60, 6 * 60), evt("2026-10-06", 22 * 60, 6 * 60)];
    expect(resumeRepos(nuits, "2026-10-06")).toEqual({ totalMin: 960, plusLongueJourneeMin: 480, reposMinMin: 16 * 60 });
  });

  it("les événements qui ne sont pas du travail ne comptent pas ; une autre semaine non plus", () => {
    const l = [evt("2026-10-06", 600, 660, "rdv"), evt("2026-10-12", 375, 855)];
    expect(resumeRepos(l, "2026-10-08")).toEqual({ totalMin: 0, plusLongueJourneeMin: 0, reposMinMin: null });
  });

  it("deux plages le même jour s'additionnent dans la journée", () => {
    expect(resumeRepos([evt("2026-10-05", 480, 720), evt("2026-10-05", 780, 1020)], "2026-10-05")).toMatchObject({ totalMin: 480, plusLongueJourneeMin: 480, reposMinMin: null });
  });
});