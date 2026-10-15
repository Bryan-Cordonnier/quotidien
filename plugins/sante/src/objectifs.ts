// Les objectifs de santé, publiés pour les autres plugins (contrat `sante@1`) : Repas et recettes s'en sert pour concocter les repas.
// Lecture défensive : une valeur absente, fausse ou hors bornes reprend la valeur par défaut ; on ne publie que ce qui est propre.

export const REGIMES = ["omnivore", "flexitarien", "végétarien", "végétalien", "sans porc", "halal", "casher"] as const;
export const BUTS = ["manger équilibré", "perdre du poids", "prendre du muscle", "garder mon poids", "plus d'énergie"] as const;

export interface Objectifs {
  /** Calories par jour visées, ou 0 si non précisé. */
  caloriesJour: number;
  /** Protéines par jour en grammes, ou 0. */
  proteinesJour: number;
  but: (typeof BUTS)[number];
  regime: (typeof REGIMES)[number];
  /** Allergies et intolérances (texte libre, strictement à respecter). */
  allergies: string;
  /** Ce qu'on préfère éviter. */
  eviter: string;
  /** Ce qu'on aime. */
  aime: string;
  notes: string;
}

export const OBJECTIFS_DEFAUT: Objectifs = { caloriesJour: 0, proteinesJour: 0, but: "manger équilibré", regime: "omnivore", allergies: "", eviter: "", aime: "", notes: "" };

const entier = (v: unknown, max: number): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : 0);
const texte = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max) : "");
const parmi = <T extends string>(v: unknown, liste: readonly T[], defaut: T): T => ((liste as readonly unknown[]).includes(v) ? (v as T) : defaut);

export function nettoyer(enregistre: unknown): Objectifs {
  const o = typeof enregistre === "object" && enregistre !== null ? (enregistre as Record<string, unknown>) : {};
  return {
    caloriesJour: entier(o.caloriesJour, 10_000),
    proteinesJour: entier(o.proteinesJour, 1_000),
    but: parmi(o.but, BUTS, OBJECTIFS_DEFAUT.but),
    regime: parmi(o.regime, REGIMES, OBJECTIFS_DEFAUT.regime),
    allergies: texte(o.allergies, 500),
    eviter: texte(o.eviter, 500),
    aime: texte(o.aime, 500),
    notes: texte(o.notes, 1000),
  };
}
