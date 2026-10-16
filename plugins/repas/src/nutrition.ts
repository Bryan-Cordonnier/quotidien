// Valeurs nutritionnelles des recettes (par portion, estimées par l'IA) et ce que l'on mange en moyenne d'après les repas concoctés.
import type { Donnees, Nutrition, Recette } from "./types";

export const SCHEMA_VALEURS = {
  type: "object",
  properties: { kcal: { type: "number" }, proteines: { type: "number" }, glucides: { type: "number" }, lipides: { type: "number" } },
  required: ["kcal", "proteines", "glucides", "lipides"],
};

const borne = (v: unknown, max: number): number | null => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : null);

/** Lit des valeurs proposées par l'IA (arrondies, bornées) ; `null` si l'une manque ou est absurde. */
export function lireValeurs(v: unknown): Nutrition | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const kcal = borne(o.kcal, 5000);
  const proteines = borne(o.proteines, 500);
  const glucides = borne(o.glucides, 1000);
  const lipides = borne(o.lipides, 500);
  return kcal === null || proteines === null || glucides === null || lipides === null ? null : { kcal, proteines, glucides, lipides };
}

/** Consigne : estimer les valeurs d'une portion pour chaque recette donnée. */
export function consigneNutrition(recettes: readonly Recette[]): string {
  const liste = recettes.map((r) => `- [${r.id}] ${r.nom}, pour ${r.portions} portion${r.portions > 1 ? "s" : ""} : ${r.ingredients.map((i) => `${i.quantite} ${i.nom}`.trim()).join(", ")}`).join("\n");
  return `Estime les valeurs nutritionnelles d'UNE portion de chacune de ces recettes (tables nutritionnelles courantes, ingrédients crus) :
${liste}

Réponds avec "recettes" : pour chacune, "id" (celui entre crochets), "kcal", "proteines", "glucides" et "lipides" en grammes, pour une portion.`;
}

export const SCHEMA_NUTRITION = {
  type: "object",
  properties: { recettes: { type: "array", items: { type: "object", properties: { id: { type: "string" }, ...SCHEMA_VALEURS.properties }, required: ["id", ...SCHEMA_VALEURS.required] } } },
  required: ["recettes"],
};

/** Lit la réponse : seulement des identifiants demandés, des valeurs bornées. */
export function lireNutritionIa(texte: string, ids: readonly string[]): Record<string, Nutrition> | string {
  let brut: unknown;
  try {
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    brut = JSON.parse(debut >= 0 && fin > debut ? texte.slice(debut, fin + 1) : texte);
  } catch {
    return "La réponse de l'IA est illisible : réessayez.";
  }
  const sortie: Record<string, Nutrition> = {};
  const liste = (brut as { recettes?: unknown })?.recettes;
  for (const x of Array.isArray(liste) ? liste : []) {
    const id = (x as { id?: unknown })?.id;
    const v = lireValeurs(x);
    if (typeof id === "string" && ids.includes(id) && v) sortie[id] = v;
  }
  return Object.keys(sortie).length ? sortie : "L'IA n'a rendu aucune valeur lisible : réessayez.";
}

export interface Moyenne extends Nutrition {
  /** D'où vient la moyenne : les repas des plans concoctés, ou à défaut toutes les recettes. */
  base: "repas" | "recettes";
  /** Nombre de portions (repas) ou de recettes comptées. */
  nombre: number;
}

/**
 * Ce que l'on mange en moyenne par portion : d'après les repas des plans (chaque repas pèse son nombre de parts) dont la recette a ses
 * valeurs ; sans plan, la moyenne des recettes de la bibliothèque. `null` s'il n'y a aucune valeur.
 */
export function moyenneMangee(d: Donnees): Moyenne | null {
  const parId = new Map(d.recettes.map((r) => [r.id, r]));
  const poids: [Nutrition, number][] = d.plans.flatMap((p) => p.repas.flatMap((r) => {
    const n = r.recetteId ? parId.get(r.recetteId)?.nutrition : null;
    return n ? [[n, r.personnes] as [Nutrition, number]] : [];
  }));
  const base = poids.length ? "repas" : "recettes";
  const lignes = poids.length ? poids : d.recettes.flatMap((r) => (r.nutrition ? [[r.nutrition, 1] as [Nutrition, number]] : []));
  const total = lignes.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return null;
  const moy = (k: keyof Nutrition) => Math.round(lignes.reduce((s, [v, n]) => s + v[k] * n, 0) / total);
  return { kcal: moy("kcal"), proteines: moy("proteines"), glucides: moy("glucides"), lipides: moy("lipides"), base, nombre: total };
}
