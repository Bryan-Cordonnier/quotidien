// Les paramètres de l'agenda (manifeste, `parameters`) vus par les calculs : mêmes identifiants, mêmes valeurs par défaut (un test le vérifie).
// Le carnet garde ses `reglages` (le service des rappels les lit sans l'écran) : la page les met à jour dès que les paramètres changent.
import type { ReglagesJournee } from "./journee";
import { REGLAGES_DEFAUT, type Reglages } from "./types";

export type Parametres = Record<string, number | string | boolean>;

export const PARAMETRES_DEFAUT = {
  leverDefaut: "08:00",
  preparation: 45,
  miseEnRoute: 10,
  marge: 10,
  majoration: 0,
  enchainer: 90,
  sommeil: 8,
  endormissement: 15,
  preAlerte: 5,
  rappelCoucher: 30,
  rappelsHoraires: true,
} as const;

const nombre = (v: unknown, repli: number, min: number, max: number): number => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : repli);
const heure = (v: unknown, repli: string): number => {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(typeof v === "string" ? v : "") ?? /^(\d\d):(\d\d)$/.exec(repli)!;
  return Number(m[1]) * 60 + Number(m[2]);
};

export interface ReglagesAgenda {
  /** Ce que le carnet garde (et que le service des rappels lit). */
  carnet: Reglages;
  rappelsHoraires: boolean;
  /** Ce que la journée à plat utilise. */
  journee: ReglagesJournee;
}

export function reglagesDepuis(p: Parametres | null | undefined): ReglagesAgenda {
  const v = p ?? {};
  const d = PARAMETRES_DEFAUT;
  const preparation = Math.round(nombre(v.preparation, d.preparation, 0, 480));
  const miseEnRoute = Math.round(nombre(v.miseEnRoute, d.miseEnRoute, 0, 240));
  const marge = Math.round(nombre(v.marge, d.marge, 0, 240));
  const majoration = Math.round(nombre(v.majoration, d.majoration, 0, 200) * 100);
  const sommeil = Math.round(nombre(v.sommeil, d.sommeil, 0, 16) * 60);
  const endormissement = Math.round(nombre(v.endormissement, d.endormissement, 0, 240));
  return {
    carnet: {
      ...REGLAGES_DEFAUT,
      margeArriveeMin: marge,
      miseEnRouteMin: miseEnRoute,
      preparationMin: preparation,
      sommeilMin: sommeil,
      endormissementMin: endormissement,
      majorationTrajetBp: majoration,
      preAlerteMin: Math.round(nombre(v.preAlerte, d.preAlerte, 0, 120)),
      rappelCoucherMin: Math.round(nombre(v.rappelCoucher, d.rappelCoucher, 0, 240)),
    },
    rappelsHoraires: typeof v.rappelsHoraires === "boolean" ? v.rappelsHoraires : d.rappelsHoraires,
    journee: {
      margeArriveeMin: marge,
      miseEnRouteMin: miseEnRoute,
      preparationMin: preparation,
      sommeilMin: sommeil,
      endormissementMin: endormissement,
      majorationTrajetBp: majoration,
      leverDefautMin: heure(v.leverDefaut, d.leverDefaut),
      enchainerMin: Math.round(nombre(v.enchainer, d.enchainer, 0, 600)),
    },
  };
}