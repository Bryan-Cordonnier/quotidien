// Ajouter une recette à la liste de courses ouverte : l'IA fusionne les ingrédients avec ce qui y est déjà (pas de doublon, quantités
// ajustées, ce qui est en commun n'est pas racheté). On montre ensuite ce qui change avant d'écrire chez Courses.
import type { Recette } from "./types";

export const SCHEMA_FUSION = {
  type: "object",
  properties: { articles: { type: "array", items: { type: "string" } }, remarques: { type: "string" } },
  required: ["articles", "remarques"],
};

export function consigneFusion(actuels: readonly string[], recette: Recette, personnes: number): string {
  return `Voici ma liste de courses actuelle :
${actuels.map((a) => `- ${a}`).join("\n") || "- (vide)"}

Je veux y ajouter de quoi cuisiner « ${recette.nom} » pour ${personnes} personne${personnes > 1 ? "s" : ""} (recette prévue pour ${recette.portions}) :
${recette.ingredients.map((i) => `- ${`${i.quantite} ${i.nom}`.trim()}`).join("\n")}

Rends la liste COMPLÈTE après ajout, en unités d'achat du commerce (« Farine 1 kg », « Œufs x6 ») :
- garde tous les articles déjà présents, tels quels quand rien ne change ;
- si un ingrédient est déjà dans la liste, ne l'ajoute pas une deuxième fois : augmente la quantité seulement s'il n'en restera vraiment pas assez ;
- ajoute seulement ce qui manque, à la bonne quantité pour ${personnes} personne${personnes > 1 ? "s" : ""} ;
- n'ajoute pas sel, poivre, huile ni épices courantes.
Dans "remarques", dis en une ou deux phrases ce que tu as ajouté, ce qui était en commun et les quantités changées.`;
}

const propre = (v: unknown): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) : "");

/** La liste proposée (sans doublon, bornée) et ce qui change par rapport à l'actuelle. */
export function lireFusionIa(texte: string, actuels: readonly string[]): { articles: string[]; ajoutes: string[]; retires: string[]; remarques: string } | string {
  let brut: unknown;
  try {
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    brut = JSON.parse(debut >= 0 && fin > debut ? texte.slice(debut, fin + 1) : texte);
  } catch {
    return "La réponse de l'IA est illisible : réessayez.";
  }
  const o = (brut ?? {}) as Record<string, unknown>;
  const vus = new Set<string>();
  const articles = (Array.isArray(o.articles) ? o.articles : []).map(propre).filter((a) => a !== "" && !vus.has(a.toLowerCase()) && vus.add(a.toLowerCase())).slice(0, 300);
  if (articles.length === 0) return "L'IA n'a rendu aucun article : réessayez.";
  return {
    articles,
    ajoutes: articles.filter((a) => !actuels.includes(a)),
    retires: actuels.filter((a) => !articles.includes(a)),
    remarques: typeof o.remarques === "string" ? o.remarques.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 600) : "",
  };
}
