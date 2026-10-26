// Les paramètres du plugin (manifeste, `parameters`) vus par les calculs : même identifiants, mêmes valeurs par défaut (un test le vérifie).
import type { Reglages } from "./types";

export type Parametres = Record<string, number | string | boolean>;

export const PARAMETRES_DEFAUT = { budget: 70, jour: "6", alerte: 80, report: false, estimation: true, pause: false } as const;

export const REGLAGES_DEFAUT: Reglages = { budgetCents: 7000, jourCourses: 6, alertePourcent: 80, report: false, estimation: true, pause: false };

export function reglagesDepuis(p: Parametres | null | undefined): Reglages {
  const v = p ?? {};
  const budget = typeof v.budget === "number" && Number.isFinite(v.budget) && v.budget >= 0 ? v.budget : PARAMETRES_DEFAUT.budget;
  const jour = Number(typeof v.jour === "string" ? v.jour : PARAMETRES_DEFAUT.jour);
  const alerte = typeof v.alerte === "number" && Number.isFinite(v.alerte) && v.alerte > 0 ? v.alerte : PARAMETRES_DEFAUT.alerte;
  return {
    budgetCents: Math.round(budget * 100),
    jourCourses: Number.isInteger(jour) && jour >= 0 && jour <= 6 ? jour : 6,
    alertePourcent: alerte,
    report: v.report === true,
    // En pause, les courses ne comptent nulle part (ni dans les finances, ni dans les alertes).
    estimation: v.estimation !== false && v.pause !== true,
    pause: v.pause === true,
  };
}