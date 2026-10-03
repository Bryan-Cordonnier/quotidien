import init, {
  initSync,
  calculer_interim,
  calculer_reserve,
  calculer_horaires,
  verifier_repos,
} from './wasm/budget_wasm.js';
import wasmUrl from './wasm/budget_wasm_bg.wasm?url';

let pret = false;

/** Charge le module WebAssembly (navigateur). */
export async function initialiser(): Promise<void> {
  if (pret) return;
  await init({ module_or_path: wasmUrl });
  pret = true;
}

/** Charge le module depuis des octets (tests Node). */
export function initialiserDepuisOctets(octets: BufferSource): void {
  if (pret) return;
  initSync({ module: octets });
  pret = true;
}

function appeler<T>(f: (json: string) => string, entree: unknown): T {
  const sortie = JSON.parse(f(JSON.stringify(entree)));
  if (sortie && typeof sortie === 'object' && 'erreur' in sortie) {
    throw new Error(String(sortie.erreur));
  }
  return sortie as T;
}

export interface PaieInterim {
  minutes_normales: number;
  minutes_sup: number;
  brut_base_cents: number;
  ifm_cents: number;
  cp_cents: number;
  brut_total_cents: number;
  net_cents: number;
}

export interface PaieReserve {
  jours: number;
  jours_hors_base: number;
  brut_imposable_cents: number;
  non_imposable_cents: number;
  net_cents: number;
}

export interface PlanHoraires {
  trajet_majore_min: number;
  arrivee_visee_min: number;
  depart_reel_min: number;
  decision_partir_min: number;
  pre_alerte_min: number;
  reveil_min: number;
  coucher_min: number;
  rappel_coucher_min: number;
}

export type Alerte =
  | { type: 'repos_insuffisant'; entre: number; repos_min: number }
  | { type: 'journee_trop_longue'; plage: number; duree_min: number }
  | { type: 'semaine_trop_longue'; depuis: number; total_min: number };

export const coeur = {
  interim: (e: unknown) => appeler<PaieInterim>(calculer_interim, e),
  reserve: (e: unknown) => appeler<PaieReserve>(calculer_reserve, e),
  horaires: (e: unknown) => appeler<PlanHoraires>(calculer_horaires, e),
  repos: (plages: { debut: number; fin: number }[]) => appeler<Alerte[]>(verifier_repos, plages),
};
