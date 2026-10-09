// Proposer des repas et la liste de courses qui va avec, dans le budget. L'IA part de NOS données (les articles et prix déjà vus sur les
// tickets), puis, si on l'autorise, complète avec internet (recettes, prix qui manquent). Comme pour les tickets, tout ce qui revient est
// validé et borné ici : l'IA peut se tromper de format, de prix ou de budget.
import type { Centimes } from "@etabli/ui/money";
import type { Donnees } from "./types";

/** Un article déjà acheté : son prix unitaire moyen d'après les tickets scannés (hors budget compris). */
export interface PrixConnu {
  nom: string;
  prixCents: Centimes;
  fois: number;
}

export const normaliser = (nom: string): string =>
  nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Les articles les plus achetés et leur prix unitaire moyen, d'après les lignes des tickets (les plus fréquents d'abord). */
export function prixConnus(d: Donnees, max = 60): PrixConnu[] {
  const groupes = new Map<string, { nom: string; unitaires: number[] }>();
  for (const t of d.tickets) {
    for (const l of t.articles) {
      const cle = normaliser(l.nom);
      if (cle === "" || l.quantite <= 0) continue;
      const g = groupes.get(cle) ?? { nom: l.nom, unitaires: [] };
      g.unitaires.push(l.prixCents / l.quantite);
      groupes.set(cle, g);
    }
  }
  return [...groupes.values()]
    .map((g) => ({ nom: g.nom, prixCents: Math.round(g.unitaires.reduce((a, b) => a + b, 0) / g.unitaires.length), fois: g.unitaires.length }))
    .sort((a, b) => b.fois - a.fois || a.nom.localeCompare(b.nom, "fr"))
    .slice(0, max);
}

export interface Demande {
  personnes: number;
  repas: number;
  budgetCents: Centimes;
  /** Envies et contraintes en vrac : « sans poisson, rapide, plutôt végétarien ». */
  envies: string;
  /** Laisser l'IA chercher sur internet ce que nos données ne disent pas (recettes, prix). */
  internet: boolean;
  /** Plats déjà proposés, à ne pas redonner (« autre proposition »). */
  aEviter?: readonly string[];
  /** Quand la proposition précédente dépassait le budget : de combien (« moins cher »). */
  depassementCents?: Centimes;
}

const eur = (c: number): string => `${(c / 100).toFixed(2).replace(".", ",")} €`;

export function construireConsigne(demande: Demande, connus: readonly PrixConnu[]): string {
  const donnees =
    connus.length > 0
      ? `MES DONNÉES (à utiliser en priorité : ce que j'achète déjà et ce que ça m'a coûté, prix unitaire moyen) :\n${connus.map((c) => `- ${c.nom} : ${eur(c.prixCents)} (acheté ${c.fois} fois)`).join("\n")}`
      : "MES DONNÉES : aucun ticket scanné pour l'instant, estime les prix d'après les supermarchés français.";
  const source = demande.internet
    ? "Utilise d'abord mes données. Cherche sur internet seulement ce qui manque : idées de recettes et prix réalistes des ingrédients que je n'ai pas dans mes données."
    : "Utilise mes données ; pour un ingrédient qui n'y est pas, estime un prix réaliste de supermarché français.";
  return [
    `Tu es un assistant de courses pour un foyer français. Propose ${demande.repas} repas (plats) pour ${demande.personnes} personne${demande.personnes > 1 ? "s" : ""}, et pour chaque plat les ingrédients À ACHETER avec leur quantité et leur prix.`,
    `BUDGET : le total des ingrédients de tous les plats ne doit PAS dépasser ${eur(demande.budgetCents)}. On suppose que le sel, le poivre, l'huile, le sucre et les épices de base sont déjà à la maison (ne les compte pas). Un ingrédient utilisé dans plusieurs plats est à acheter une seule fois : indique-le dans chaque plat avec la part utilisée.`,
    demande.depassementCents ? `ATTENTION : ta proposition précédente dépassait le budget de ${eur(demande.depassementCents)}. Fais clairement moins cher (ingrédients de saison, légumineuses, pâtes, riz, œufs).` : "",
    demande.envies.trim() ? `ENVIES ET CONTRAINTES : ${demande.envies.trim()}` : "",
    demande.aEviter?.length ? `NE REPROPOSE PAS ces plats : ${demande.aEviter.join(", ")}.` : "",
    source,
    donnees,
    "Pour chaque plat : un nom court, un résumé d'une phrase (comment ça se prépare), la liste des ingrédients (nom, quantité en toutes lettres comme « 500 g » ou « 2 », prix en euros pour la quantité à acheter).",
  ]
    .filter((x) => x !== "")
    .join("\n\n");
}

export const SCHEMA_MENU = {
  type: "object",
  properties: {
    plats: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nom: { type: "string" },
          resume: { type: "string" },
          ingredients: {
            type: "array",
            items: { type: "object", properties: { nom: { type: "string" }, quantite: { type: "string" }, prix: { type: "number" } }, required: ["nom", "prix"] },
          },
        },
        required: ["nom", "ingredients"],
      },
    },
  },
  required: ["plats"],
} as const;

export interface Ingredient {
  nom: string;
  quantite: string;
  prixCents: Centimes;
}

export interface Plat {
  nom: string;
  resume: string;
  ingredients: Ingredient[];
  /** Somme des ingrédients du plat (un ingrédient partagé compte dans chaque plat qui l'utilise : le total réel est celui de la liste). */
  coutCents: Centimes;
}

export type Proposition = { ok: true; plats: Plat[] } | { ok: false; message: string };

const PLATS_MAX = 14;
const INGREDIENTS_MAX = 30;

const propre = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

function lireJson(texte: string): unknown {
  const net = texte.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(net);
  } catch {
    // Avec la recherche sur internet, l'IA peut entourer le JSON d'une phrase : on garde de la première accolade à la dernière.
    const debut = net.indexOf("{");
    const fin = net.lastIndexOf("}");
    if (debut < 0 || fin <= debut) return undefined;
    try {
      return JSON.parse(net.slice(debut, fin + 1));
    } catch {
      return undefined;
    }
  }
}

/** Réponse de l'IA → plats validés, ou un message clair. Les prix absurdes et les plats sans ingrédient sont écartés. */
export function lireMenuIa(texte: string, repasVoulus: number): Proposition {
  const o = lireJson(texte);
  const brut = o !== null && typeof o === "object" ? (o as Record<string, unknown>).plats : undefined;
  if (!Array.isArray(brut)) return { ok: false, message: "La réponse de l'IA n'a pas pu être lue : réessayez." };
  const plats: Plat[] = [];
  for (const p of brut.slice(0, Math.max(1, Math.min(PLATS_MAX, repasVoulus + 2)))) {
    const x = p as Record<string, unknown> | null;
    const nom = propre(x?.nom, 80);
    const ingredients: Ingredient[] = [];
    for (const i of Array.isArray(x?.ingredients) ? (x!.ingredients as unknown[]).slice(0, INGREDIENTS_MAX) : []) {
      const y = i as Record<string, unknown> | null;
      const n = propre(y?.nom, 80);
      const prix = typeof y?.prix === "number" && Number.isFinite(y.prix) && y.prix >= 0 && y.prix <= 500 ? Math.round(y.prix * 100) : null;
      if (n !== "" && prix !== null) ingredients.push({ nom: n, quantite: propre(y?.quantite, 40), prixCents: prix });
    }
    if (nom === "" || ingredients.length === 0) continue;
    plats.push({ nom, resume: propre(x?.resume, 240), ingredients, coutCents: ingredients.reduce((s, a) => s + a.prixCents, 0) });
  }
  return plats.length > 0 ? { ok: true, plats } : { ok: false, message: "L'IA n'a proposé aucun plat exploitable : réessayez." };
}

export interface LigneListe {
  nom: string;
  /** Les quantités de chaque plat, mises bout à bout (« 500 g + 250 g »). */
  quantite: string;
  prixCents: Centimes;
}

/** La liste de courses des plats gardés : un même ingrédient n'apparaît qu'une fois, ses quantités et ses prix s'additionnent. */
export function listeDepuisPlats(plats: readonly Plat[]): { lignes: LigneListe[]; totalCents: Centimes } {
  const parNom = new Map<string, LigneListe>();
  for (const plat of plats) {
    for (const i of plat.ingredients) {
      const cle = normaliser(i.nom);
      const l = parNom.get(cle) ?? { nom: i.nom, quantite: "", prixCents: 0 };
      l.prixCents += i.prixCents;
      if (i.quantite !== "" && !l.quantite.split(" + ").includes(i.quantite)) l.quantite = l.quantite === "" ? i.quantite : `${l.quantite} + ${i.quantite}`;
      parNom.set(cle, l);
    }
  }
  const lignes = [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return { lignes, totalCents: lignes.reduce((s, l) => s + l.prixCents, 0) };
}

/** Le texte d'un article de la liste de courses : « Pâtes (500 g) ». */
export const texteArticle = (l: LigneListe): string => (l.quantite !== "" ? `${l.nom} (${l.quantite})` : l.nom).slice(0, 120);