// Données de Repas et recettes : lecture stricte, saisies validées, opérations. Règle de sécurité : « rien d'enregistré » donne des données
// vides, mais des données PRÉSENTES et illisibles sont une erreur, jamais des données vides : on écraserait la bibliothèque de recettes.
import {
  CATEGORIES,
  ErreurRepas,
  MOMENTS,
  SCHEMA,
  SOURCES,
  type Donnees,
  type Ingredient,
  type LigneCourse,
  type Nutrition,
  type Plan,
  type PrixReleve,
  type Recette,
  type RepasPlan,
  type TotalMagasin,
} from "./types";
import { choix, entier, jourValide, liste, montant, objet, texte, texteFacultatif } from "./validation";

export const RECETTES_MAX = 3000;
export const PRIX_MAX = 5000;
export const PLANS_MAX = 20;
export const USTENSILES_MAX = 150;
export const LIMITE_OCTETS = 3_500_000;

export const donneesVides = (): Donnees => ({ schema: SCHEMA, suivant: 1, recettes: [], ustensiles: [], prix: [], plans: [] });

function verifier(d: Donnees): Donnees {
  if (JSON.stringify(d).length > LIMITE_OCTETS) throw new ErreurRepas("limite_atteinte", "Les données de Repas sont pleines (3,5 Mo) : supprimez de vieilles recettes ou de vieux relevés de prix.");
  return d;
}

const textes = (v: unknown, nom: string, max: number, longueur: number): string[] => liste(v ?? [], nom, (x) => texte(x, nom, longueur), max);

function lireIngredient(brut: unknown): Ingredient {
  const o = objet(brut, ["nom"], ["quantite"]);
  return { nom: texte(o.nom, "ingrédient", 80), quantite: texteFacultatif(o.quantite, "quantité", 40) };
}

export function lireNutrition(brut: unknown): Nutrition | null {
  if (brut === undefined || brut === null) return null;
  const o = objet(brut, ["kcal", "proteines", "glucides", "lipides"]);
  return { kcal: entier(o.kcal, "kcal", 0, 10_000), proteines: entier(o.proteines, "proteines", 0, 1000), glucides: entier(o.glucides, "glucides", 0, 1000), lipides: entier(o.lipides, "lipides", 0, 1000) };
}

/** Une recette telle qu'on la saisit (sans identifiant) ou telle qu'elle est enregistrée (avec). */
export function lireRecette(brut: unknown, avecId: boolean): Omit<Recette, "id"> & { id?: string } {
  const o = objet(brut, ["nom", "categorie", "ingredients"], [...(avecId ? ["id"] : []), "portions", "tempsMin", "etapes", "ustensiles", "notes", "source", "favori", "nutrition"]);
  const ingredients = liste(o.ingredients, "ingredients", lireIngredient, 60);
  if (ingredients.length === 0) throw new ErreurRepas("argument_invalide", "Une recette a au moins un ingrédient.");
  return {
    ...(avecId ? { id: String(o.id) } : {}),
    nom: texte(o.nom, "nom", 120),
    categorie: choix(o.categorie, "categorie", CATEGORIES),
    portions: o.portions === undefined ? 2 : entier(o.portions, "portions", 1, 50),
    tempsMin: o.tempsMin === undefined || o.tempsMin === null ? null : entier(o.tempsMin, "tempsMin", 1, 2880),
    ingredients,
    etapes: textes(o.etapes, "etapes", 60, 600),
    ustensiles: textes(o.ustensiles, "ustensiles", 30, 60),
    notes: texteFacultatif(o.notes, "notes", 1000),
    source: o.source === undefined ? "moi" : choix(o.source, "source", SOURCES),
    favori: o.favori === true,
    nutrition: lireNutrition(o.nutrition),
  };
}

function lirePrix(brut: unknown): PrixReleve {
  const o = objet(brut, ["nom", "magasin", "prixCents", "jour"], ["unite", "source"]);
  return {
    nom: texte(o.nom, "nom", 120),
    magasin: texte(o.magasin, "magasin", 60),
    prixCents: montant(o.prixCents, "prixCents", 1),
    unite: texteFacultatif(o.unite, "unite", 40),
    jour: jourValide(o.jour, "jour"),
    source: o.source === undefined ? "saisie" : choix(o.source, "source", ["recherche", "saisie", "max"] as const),
  };
}

function lireRepasPlan(brut: unknown): RepasPlan {
  const o = objet(brut, ["jour", "moment", "personnes", "plat"], ["recetteId"]);
  return {
    jour: jourValide(o.jour, "jour"),
    moment: choix(o.moment, "moment", MOMENTS),
    personnes: entier(o.personnes, "personnes", 1, 60),
    plat: texte(o.plat, "plat", 160),
    recetteId: o.recetteId === undefined || o.recetteId === null ? null : texte(o.recetteId, "recetteId", 20),
  };
}

function lireLigne(brut: unknown): LigneCourse {
  const o = objet(brut, ["nom", "unites"], ["pour", "prixUnitaireCents", "estime"]);
  return {
    nom: texte(o.nom, "nom", 120),
    pour: texteFacultatif(o.pour, "pour", 200),
    unites: entier(o.unites, "unites", 1, 200),
    prixUnitaireCents: o.prixUnitaireCents === undefined || o.prixUnitaireCents === null ? null : montant(o.prixUnitaireCents, "prixUnitaireCents", 0),
    estime: o.estime === true,
  };
}

function lireTotal(brut: unknown): TotalMagasin {
  const o = objet(brut, ["magasin", "totalCents"], ["connues"]);
  return { magasin: texte(o.magasin, "magasin", 60), totalCents: montant(o.totalCents, "totalCents", 0), connues: o.connues === undefined ? 0 : entier(o.connues, "connues", 0, 1000) };
}

export function lirePlan(brut: unknown): Plan {
  const o = objet(brut, ["id", "cree", "debut", "jours", "budgetCents", "repas", "courses"], ["exceptionnel", "envies", "magasinConseille", "totaux", "totalCents", "remarques", "envoye"]);
  return {
    id: texte(o.id, "id", 20),
    cree: jourValide(o.cree, "cree"),
    debut: jourValide(o.debut, "debut"),
    jours: entier(o.jours, "jours", 1, 31),
    budgetCents: montant(o.budgetCents, "budgetCents", 0),
    exceptionnel: o.exceptionnel === true,
    envies: texteFacultatif(o.envies, "envies", 2000),
    repas: liste(o.repas, "repas", lireRepasPlan, 200),
    courses: liste(o.courses, "courses", lireLigne, 300),
    magasinConseille: texteFacultatif(o.magasinConseille, "magasinConseille", 60),
    totaux: liste(o.totaux ?? [], "totaux", lireTotal, 50),
    totalCents: o.totalCents === undefined ? 0 : montant(o.totalCents, "totalCents", 0),
    remarques: texteFacultatif(o.remarques, "remarques", 3000),
    envoye: o.envoye === true,
  };
}

/** Données enregistrées → données validées. `null`/`undefined` → vides ; toute autre forme inattendue → `ErreurRepas("illisible")`. */
export function lireDonnees(enregistre: unknown): Donnees {
  if (enregistre === null || enregistre === undefined) return donneesVides();
  try {
    const o = objet(enregistre, ["schema", "suivant", "recettes"], ["ustensiles", "prix", "plans"]);
    if (o.schema !== SCHEMA) throw new ErreurRepas("illisible", `Version des données inconnue : ${String(o.schema)}.`);
    const suivant = entier(o.suivant, "suivant", 1, 2_000_000_000);
    const recettes = liste(o.recettes, "recettes", (r) => lireRecette(r, true) as Recette, RECETTES_MAX);
    for (const r of recettes) if (!/^r[1-9]\d{0,9}$/.test(r.id) || Number(r.id.slice(1)) >= suivant) throw new ErreurRepas("illisible", "Identifiant de recette illisible.");
    return {
      schema: SCHEMA,
      suivant,
      recettes,
      ustensiles: textes(o.ustensiles, "ustensiles", USTENSILES_MAX, 60),
      prix: liste(o.prix ?? [], "prix", lirePrix, PRIX_MAX),
      plans: liste(o.plans ?? [], "plans", lirePlan, PLANS_MAX),
    };
  } catch (e) {
    if (e instanceof ErreurRepas && e.code === "illisible") throw e;
    throw new ErreurRepas("illisible", `Données de Repas illisibles : ${e instanceof Error ? e.message : String(e)} Rien n'a été modifié.`);
  }
}

export function ajouterRecette(d: Donnees, brut: unknown): { id: string; donnees: Donnees } {
  if (d.recettes.length >= RECETTES_MAX) throw new ErreurRepas("limite_atteinte", `Au plus ${RECETTES_MAX} recettes.`);
  const id = `r${d.suivant}`;
  return { id, donnees: verifier({ ...d, suivant: d.suivant + 1, recettes: [...d.recettes, { id, ...lireRecette(brut, false) } as Recette] }) };
}

export function modifierRecette(d: Donnees, id: string, brut: unknown): Donnees {
  if (!d.recettes.some((r) => r.id === id)) throw new ErreurRepas("introuvable", `Recette « ${id} » introuvable.`);
  const lue = lireRecette(brut, false);
  const o = typeof brut === "object" && brut !== null ? brut : {};
  // le formulaire ne connaît ni le favori ni les valeurs nutritionnelles : ce qu'il ne donne pas est gardé
  return verifier({ ...d, recettes: d.recettes.map((r) => (r.id === id ? ({ id, ...lue, favori: "favori" in o ? lue.favori : r.favori, nutrition: "nutrition" in o ? lue.nutrition : r.nutrition } as Recette) : r)) });
}

export function basculerFavori(d: Donnees, id: string): Donnees {
  if (!d.recettes.some((r) => r.id === id)) throw new ErreurRepas("introuvable", `Recette « ${id} » introuvable.`);
  return { ...d, recettes: d.recettes.map((r) => (r.id === id ? { ...r, favori: !r.favori } : r)) };
}

/** Pose les valeurs nutritionnelles estimées (par identifiant de recette) ; les identifiants inconnus sont ignorés. */
export function definirNutrition(d: Donnees, valeurs: Readonly<Record<string, Nutrition>>): Donnees {
  return { ...d, recettes: d.recettes.map((r) => (valeurs[r.id] ? { ...r, nutrition: lireNutrition(valeurs[r.id]) } : r)) };
}

export function supprimerRecette(d: Donnees, id: string): Donnees {
  if (!d.recettes.some((r) => r.id === id)) throw new ErreurRepas("introuvable", `Recette « ${id} » introuvable.`);
  return { ...d, recettes: d.recettes.filter((r) => r.id !== id) };
}

/** Remplace la liste des ustensiles (sans doublon, dans l'ordre donné). */
export function definirUstensiles(d: Donnees, brut: unknown): Donnees {
  const vus = new Set<string>();
  const ustensiles = textes(brut, "ustensiles", USTENSILES_MAX, 60).filter((u) => {
    const k = u.toLowerCase();
    if (vus.has(k)) return false;
    vus.add(k);
    return true;
  });
  return verifier({ ...d, ustensiles });
}

/** Ajoute des relevés de prix ; un relevé du même article dans le même magasin remplace l'ancien. Les plus anciens partent au-delà de la limite. */
export function ajouterPrix(d: Donnees, brut: unknown): Donnees {
  const nouveaux = liste(brut, "prix", lirePrix, 500);
  const cle = (p: PrixReleve) => `${p.nom.toLowerCase()}|${p.magasin.toLowerCase()}`;
  const remplaces = new Set(nouveaux.map(cle));
  const prix = [...d.prix.filter((p) => !remplaces.has(cle(p))), ...nouveaux].slice(-PRIX_MAX);
  return verifier({ ...d, prix });
}

/** Garde un plan (les plus récents d'abord, au plus PLANS_MAX). */
export function ajouterPlan(d: Donnees, plan: Omit<Plan, "id">): { id: string; donnees: Donnees } {
  const id = `p${d.suivant}`;
  const lu = lirePlan({ ...plan, id });
  return { id, donnees: verifier({ ...d, suivant: d.suivant + 1, plans: [lu, ...d.plans].slice(0, PLANS_MAX) }) };
}

export function marquerEnvoye(d: Donnees, planId: string): Donnees {
  if (!d.plans.some((p) => p.id === planId)) throw new ErreurRepas("introuvable", `Plan « ${planId} » introuvable.`);
  return { ...d, plans: d.plans.map((p) => (p.id === planId ? { ...p, envoye: true } : p)) };
}

export function supprimerPlan(d: Donnees, planId: string): Donnees {
  return { ...d, plans: d.plans.filter((p) => p.id !== planId) };
}
