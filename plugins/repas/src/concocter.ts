// « Concocter » : le questionnaire (quels repas, pour combien, quel budget, quelles envies), la consigne donnée à l'IA, et la lecture STRICTE
// de sa réponse. L'IA choisit les plats (dans la bibliothèque ou de nouvelles recettes faisables avec les ustensiles de la maison) et la liste
// de courses en unités d'achat avec une estimation de prix ; le choix du magasin et les totaux sont recalculés ici avec NOS prix (prix.ts).
import { ajouterJours, jourDeSemaine, type Jour } from "@etabli/ui/civil";
import type { Centimes } from "@etabli/ui/money";
import { CATEGORIES, LIBELLES_MOMENTS, MOMENTS, type Categorie, type Moment, type Recette } from "./types";
import type { PrixConnu } from "./prix";

/** Les repas voulus : pour chaque jour, le nombre de personnes à chaque moment (0 = pas de repas à prévoir). */
export type Cases = Record<Jour, Record<Moment, number>>;

export const TEMPS = ["rapide", "normal", "long"] as const;
export type Temps = (typeof TEMPS)[number];
export const LIBELLES_TEMPS: Record<Temps, string> = { rapide: "Rapide (moins de 20 min)", normal: "Normal (30 à 45 min)", long: "J'ai le temps" };
export const NIVEAUX = ["facile", "moyen", "chef"] as const;
export type Niveau = (typeof NIVEAUX)[number];

/** Comment on cuisine cette fois-ci. */
export interface Preferences {
  /** Temps de cuisine en semaine (lundi-vendredi) et le week-end. */
  tempsSemaine: Temps;
  tempsWeekend: Temps;
  niveau: Niveau;
  /** Les midis de semaine se mangent à l'extérieur (gamelle) : plats qui se transportent et se mangent froids ou réchauffés. */
  gamelles: boolean;
  /** Cuisiner plus pour manger les restes un autre repas. */
  restes: boolean;
  /** Préparer à l'avance (le week-end) pour gagner du temps en semaine. */
  batch: boolean;
}

export const PREFERENCES_DEFAUT: Preferences = { tempsSemaine: "rapide", tempsWeekend: "normal", niveau: "facile", gamelles: false, restes: true, batch: false };

export interface Questionnaire {
  debut: Jour;
  jours: number;
  /** Personnes au foyer, d'habitude. */
  foyer: number;
  /** Personnes à chaque repas (invités compris). */
  cases: Cases;
  /** Économie voulue sur le budget conseillé (0 = viser le budget). */
  economieCents: Centimes;
  envies: string;
  preferences: Preferences;
}

/** Ce que l'IA doit savoir en plus du questionnaire. */
export interface Contexte {
  budgetSemaineCents: Centimes;
  ustensiles: readonly string[];
  recettes: readonly Recette[];
  prix: readonly PrixConnu[];
  /** Objectifs du plugin Santé s'il est là (calories, régime, allergies…), sinon `null`. */
  sante: Record<string, unknown> | null;
}

export const JOURS_MAX = 14;
const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const nomJour = (j: Jour): string => NOMS_JOURS[jourDeSemaine(j) % 7] ?? "";

/** Les jours couverts, du premier au dernier. */
export const joursDe = (debut: Jour, jours: number): Jour[] => Array.from({ length: Math.max(1, Math.min(JOURS_MAX, jours)) }, (_, i) => ajouterJours(debut, i));

/** Le lendemain du prochain jour de courses (0 = dimanche … 6 = samedi) : une semaine de courses commence là. */
export function debutConseille(aujourdhui: Jour, jourCourses: number): Jour {
  for (let i = 0; i < 7; i++) {
    const j = ajouterJours(aujourdhui, i);
    if (jourDeSemaine(j) % 7 === jourCourses % 7) return ajouterJours(j, 1);
  }
  return ajouterJours(aujourdhui, 1);
}

/** Par défaut : midi et soir pour le foyer, pas de petit-déjeuner. */
export function casesParDefaut(debut: Jour, jours: number, foyer: number, moments: readonly Moment[] = ["midi", "soir"]): Cases {
  return Object.fromEntries(joursDe(debut, jours).map((j) => [j, Object.fromEntries(MOMENTS.map((m) => [m, moments.includes(m) ? foyer : 0])) as Record<Moment, number>]));
}

/** Les cases cochées, dans l'ordre (jour puis moment). */
export function repasVoulus(q: Questionnaire): { jour: Jour; moment: Moment; personnes: number }[] {
  return joursDe(q.debut, q.jours).flatMap((jour) => MOMENTS.map((moment) => ({ jour, moment, personnes: q.cases[jour]?.[moment] ?? 0 })).filter((c) => c.personnes > 0));
}

export interface Budget {
  /** Budget habituel pour ces jours (budget de la semaine × jours / 7). */
  habituelCents: Centimes;
  /** Vrai si la semaine sort de l'ordinaire (beaucoup d'invités) : le budget habituel ne peut pas suffire, il est ajusté au nombre de parts. */
  exceptionnel: boolean;
  /** Budget visé, après l'économie demandée. */
  viseCents: Centimes;
  /** Parts à cuisiner en tout, et parts d'une semaine habituelle (le foyer à chaque repas coché). */
  parts: number;
  partsHabituelles: number;
}

/**
 * Le budget à viser. D'habitude : le budget de Courses ramené aux jours couverts, moins l'économie voulue. Si on reçoit (plus de 1,5 fois les
 * parts habituelles, ou un repas pour plus du double du foyer), la semaine est exceptionnelle : le budget suit le nombre de parts, au même
 * coût par part qu'une semaine normale, plutôt que de faire manger 12 personnes avec le budget d'une seule.
 */
export function budget(q: Questionnaire, budgetSemaineCents: Centimes): Budget {
  const voulus = repasVoulus(q);
  const parts = voulus.reduce((s, c) => s + c.personnes, 0);
  const partsHabituelles = voulus.length * Math.max(1, q.foyer);
  const habituelCents = Math.round((budgetSemaineCents * Math.min(JOURS_MAX, q.jours)) / 7);
  const exceptionnel = parts > partsHabituelles * 1.5 || voulus.some((c) => c.personnes > Math.max(1, q.foyer) * 2);
  const base = exceptionnel && partsHabituelles > 0 ? Math.round((habituelCents * parts) / partsHabituelles) : habituelCents;
  return { habituelCents, exceptionnel, viseCents: Math.max(0, base - Math.max(0, q.economieCents)), parts, partsHabituelles };
}

const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",") + " €";

/** La consigne donnée à l'IA : tout ce qu'il faut pour un plan réaliste, rien de plus (la bibliothèque est résumée). */
/** Les repas avec des invités (plus de personnes que le foyer), en clair. */
export function invites(q: Questionnaire): string[] {
  return repasVoulus(q)
    .filter((c) => c.personnes > q.foyer)
    .map((c) => `${nomJour(c.jour)} ${Number(c.jour.slice(8))} ${LIBELLES_MOMENTS[c.moment].toLowerCase()} : ${c.personnes} personnes (${c.personnes - q.foyer} invité${c.personnes - q.foyer > 1 ? "s" : ""})`);
}

export function construireConsigne(q: Questionnaire, ctx: Contexte): string {
  const b = budget(q, ctx.budgetSemaineCents);
  const p = q.preferences;
  const avecInvites = invites(q);
  const voulus = repasVoulus(q);
  const lignesRepas = voulus.map((c) => `- ${c.jour} (${nomJour(c.jour)}) ${LIBELLES_MOMENTS[c.moment].toLowerCase()} : ${c.personnes} personne${c.personnes > 1 ? "s" : ""}`).join("\n");
  const recettes = ctx.recettes
    .slice(0, 120)
    .map((r) => `- [${r.id}] ${r.nom} (${r.categorie}, ${r.portions} pers. ; ${r.ingredients.map((i) => i.nom).slice(0, 10).join(", ")}${r.ustensiles.length ? ` ; ustensiles : ${r.ustensiles.join(", ")}` : ""})`)
    .join("\n");
  const prix = ctx.prix
    .slice(0, 250)
    .map((p) => `- ${p.nom} : ${euros(p.prixCents)} chez ${p.magasin}`)
    .join("\n");
  return `Tu es un cuisinier de la maison, économe et réaliste. Prépare le plan des repas suivants et la liste de courses qui va avec.

REPAS À PRÉVOIR (et seulement ceux-là, un plat par ligne) :
${lignesRepas}

BUDGET : ${euros(b.viseCents)} pour toutes les courses de ces repas.${b.exceptionnel ? ` Semaine EXCEPTIONNELLE (${b.parts} parts au lieu de ${b.partsHabituelles} d'habitude, des invités) : ce budget est déjà ajusté au nombre de parts ; reste raisonnable par personne, sans viser le budget d'une semaine normale.` : " Rentre dans ce budget."}${q.economieCents > 0 ? ` (Il comprend une économie voulue de ${euros(q.economieCents)}.)` : ""}
Ne sacrifie pas la qualité : des repas équilibrés et rassasiants (légumes, féculents, protéines), de saison si possible, pas de plats tout prêts à chaque repas. Prévois les restes (un plat cuisiné en grande quantité peut servir deux repas) et les produits de base qu'on finit (pas de 1 kg de farine pour une seule cuillère sans le réutiliser).

MANIÈRE DE CUISINER :
- Temps en semaine : ${LIBELLES_TEMPS[p.tempsSemaine].toLowerCase()} ; le week-end : ${LIBELLES_TEMPS[p.tempsWeekend].toLowerCase()}.
- Niveau : ${p.niveau === "facile" ? "facile, gestes simples" : p.niveau === "moyen" ? "moyen" : "ambitieux, je sais cuisiner"}.
${p.gamelles ? `- Les midis de semaine se mangent en GAMELLE : plats transportables, bons froids ou réchauffés au micro-ondes.
` : ""}${p.restes ? `- Les restes sont bienvenus : un plat cuisiné en double peut servir un autre repas (dis-le dans le nom du plat, ex. « Restes de lasagnes »).
` : `- Pas de restes : un plat différent à chaque repas.
`}${p.batch ? `- Préparation à l'avance : regroupe la cuisine le week-end (plats qui se gardent 3-4 jours au frigo).
` : ""}${avecInvites.length ? `- Repas avec invités (plats qui se partagent, en quantité) : ${avecInvites.join(" ; ")}.
` : ""}
ENVIES DE LA SEMAINE : ${q.envies.trim() || "aucune en particulier"}.
Place chaque envie sur un jour qui convient (un plat long un jour plus calme), et respecte-les exactement.

USTENSILES DE LA MAISON : ${ctx.ustensiles.length ? ctx.ustensiles.join(", ") : "non renseignés (reste sur des ustensiles courants : poêle, casserole, four, saladier)"}.
Ne propose RIEN qui demande un ustensile absent de cette liste.
${ctx.sante ? `\nOBJECTIFS DE SANTÉ (à respecter) : ${JSON.stringify(santeCourte(ctx.sante))}\n` : ""}
RECETTES DE LA BIBLIOTHÈQUE (réutilise-les quand elles conviennent, avec leur identifiant entre crochets) :
${recettes || "- (bibliothèque vide)"}

PRIX DÉJÀ VUS (tickets et relevés ; ce sont les seuls prix sûrs, sers-t'en pour estimer) :
${prix || "- (aucun prix connu : estime des prix de supermarché français)"}

RÉPONSE :
- "repas" : un élément par repas demandé, avec le jour (AAAA-MM-JJ), le moment ("matin", "midi" ou "soir"), le nom du plat, "recette" = l'identifiant d'une recette de la bibliothèque, ou "" si c'est une nouvelle recette, et dans ce cas "nouvelleRecette" complète (nom, catégorie, portions, temps en minutes, ingrédients avec quantités, étapes courtes, ustensiles). Une nouvelle recette ne sert qu'une fois dans la liste "repas" ; si elle revient, reprends le même nom de plat.
- "courses" : la liste à acheter pour TOUS ces repas, en unités d'achat du commerce (« Spaghetti 500 g » × 2, « Œufs boîte de 12 » × 1), regroupée (pas deux fois le même article), avec "pour" (les plats concernés), "unites" (nombre entier) et "prixUnitaire" (ton estimation en euros pour UNE unité, d'après les prix vus quand c'est possible). N'achète pas ce qui se garde d'habitude à la maison (sel, poivre, huile, épices) sauf si une recette en demande beaucoup.
- "remarques" : 1 à 3 phrases utiles (le budget est-il tenu, une astuce de restes, ce qui a été adapté).`;
}

const RECETTE_SCHEMA = {
  type: "object",
  properties: {
    nom: { type: "string" },
    categorie: { type: "string", enum: [...CATEGORIES] },
    portions: { type: "integer" },
    tempsMin: { type: "integer" },
    ingredients: { type: "array", items: { type: "object", properties: { nom: { type: "string" }, quantite: { type: "string" } }, required: ["nom", "quantite"] } },
    etapes: { type: "array", items: { type: "string" } },
    ustensiles: { type: "array", items: { type: "string" } },
  },
  required: ["nom", "categorie", "portions", "ingredients", "etapes", "ustensiles"],
};

export const SCHEMA_PLAN = {
  type: "object",
  properties: {
    repas: {
      type: "array",
      items: {
        type: "object",
        properties: { jour: { type: "string" }, moment: { type: "string", enum: [...MOMENTS] }, plat: { type: "string" }, recette: { type: "string" }, nouvelleRecette: RECETTE_SCHEMA },
        required: ["jour", "moment", "plat", "recette"],
      },
    },
    courses: {
      type: "array",
      items: { type: "object", properties: { nom: { type: "string" }, pour: { type: "string" }, unites: { type: "integer" }, prixUnitaire: { type: "number" } }, required: ["nom", "unites", "prixUnitaire"] },
    },
    remarques: { type: "string" },
  },
  required: ["repas", "courses", "remarques"],
};

export interface NouvelleRecette {
  nom: string;
  categorie: Categorie;
  portions: number;
  tempsMin: number | null;
  ingredients: { nom: string; quantite: string }[];
  etapes: string[];
  ustensiles: string[];
}

export interface PropositionPlan {
  repas: { jour: Jour; moment: Moment; personnes: number; plat: string; recetteId: string | null; nouvelle: NouvelleRecette | null }[];
  courses: { nom: string; pour: string; unites: number; estimeCents: Centimes | null }[];
  remarques: string;
  /** Repas demandés que l'IA a oubliés (on le dit plutôt que d'inventer). */
  oublies: number;
}

const court = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "");

function lireNouvelle(v: unknown, ustensilesMaison: readonly string[]): NouvelleRecette | null {
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  const nom = court(o.nom, 120);
  const ingredients = (Array.isArray(o.ingredients) ? o.ingredients : [])
    .slice(0, 40)
    .map((i) => ({ nom: court((i as Record<string, unknown>)?.nom, 80), quantite: court((i as Record<string, unknown>)?.quantite, 40) }))
    .filter((i) => i.nom !== "");
  if (nom === "" || ingredients.length === 0) return null;
  const categorie = (CATEGORIES as readonly string[]).includes(String(o.categorie)) ? (o.categorie as Categorie) : "Autres";
  const portions = Number.isInteger(o.portions) && (o.portions as number) >= 1 && (o.portions as number) <= 50 ? (o.portions as number) : 2;
  const tempsMin = Number.isInteger(o.tempsMin) && (o.tempsMin as number) >= 1 && (o.tempsMin as number) <= 2880 ? (o.tempsMin as number) : null;
  const etapes = (Array.isArray(o.etapes) ? o.etapes : []).map((e) => court(e, 600)).filter((e) => e !== "").slice(0, 40);
  const ustensiles = (Array.isArray(o.ustensiles) ? o.ustensiles : []).map((u) => court(u, 60)).filter((u) => u !== "").slice(0, 20);
  void ustensilesMaison;
  return { nom, categorie, portions, tempsMin, ingredients, etapes, ustensiles };
}

/**
 * Lit la réponse de l'IA. Tout est vérifié et borné : jours et moments limités à ceux demandés (le nombre de personnes vient du
 * questionnaire, jamais de l'IA), identifiants de recettes existants seulement, quantités entières, prix positifs et plafonnés.
 */
export function lirePlanIa(texte: string, q: Questionnaire, recettes: readonly Recette[], ustensilesMaison: readonly string[] = []): PropositionPlan | string {
  let brut: unknown;
  try {
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    brut = JSON.parse(debut >= 0 && fin > debut ? texte.slice(debut, fin + 1) : texte);
  } catch {
    return "La réponse de l'IA est illisible : réessayez.";
  }
  if (typeof brut !== "object" || brut === null) return "La réponse de l'IA est illisible : réessayez.";
  const o = brut as Record<string, unknown>;
  const voulus = repasVoulus(q);
  const cle = (j: string, m: string) => `${j}|${m}`;
  const personnes = new Map(voulus.map((c) => [cle(c.jour, c.moment), c.personnes]));
  const ids = new Set(recettes.map((r) => r.id));
  const vus = new Set<string>();
  const repas: PropositionPlan["repas"] = [];
  for (const r of Array.isArray(o.repas) ? o.repas : []) {
    const x = (r ?? {}) as Record<string, unknown>;
    const jour = court(x.jour, 10);
    const moment = court(x.moment, 10);
    const k = cle(jour, moment);
    const p = personnes.get(k);
    const plat = court(x.plat, 160);
    if (p === undefined || vus.has(k) || plat === "") continue;
    vus.add(k);
    const id = court(x.recette, 20);
    const recetteId = ids.has(id) ? id : null;
    repas.push({ jour: jour as Jour, moment: moment as Moment, personnes: p, plat, recetteId, nouvelle: recetteId ? null : lireNouvelle(x.nouvelleRecette, ustensilesMaison) });
  }
  repas.sort((a, b) => (a.jour === b.jour ? MOMENTS.indexOf(a.moment) - MOMENTS.indexOf(b.moment) : a.jour < b.jour ? -1 : 1));
  const courses: PropositionPlan["courses"] = [];
  const noms = new Set<string>();
  for (const c of Array.isArray(o.courses) ? o.courses : []) {
    const x = (c ?? {}) as Record<string, unknown>;
    const nom = court(x.nom, 120);
    const n = nom.toLowerCase();
    if (nom === "" || noms.has(n) || courses.length >= 150) continue;
    noms.add(n);
    const unites = typeof x.unites === "number" && Number.isFinite(x.unites) ? Math.min(50, Math.max(1, Math.round(x.unites))) : 1;
    const pu = typeof x.prixUnitaire === "number" && Number.isFinite(x.prixUnitaire) && x.prixUnitaire > 0 && x.prixUnitaire < 500 ? Math.round(x.prixUnitaire * 100) : null;
    courses.push({ nom, pour: court(x.pour, 200), unites, estimeCents: pu });
  }
  if (repas.length === 0) return "L'IA n'a proposé aucun des repas demandés : réessayez (ou simplifiez vos envies).";
  return { repas, courses, remarques: court(o.remarques, 1500), oublies: voulus.length - repas.length };
}

// ——— Liste de courses à partir de recettes choisies à la main ———

export interface Choix {
  recette: Recette;
  /** Pour combien de personnes on la cuisine. */
  personnes: number;
}

/** Consigne : transformer les ingrédients des recettes choisies (aux bonnes quantités) en lignes d'achat du commerce. */
export function construireConsigneListe(choix: readonly Choix[], prix: readonly PrixConnu[], budgetCents: Centimes | null): string {
  const recettes = choix
    .map((c) => `- ${c.recette.nom}, pour ${c.personnes} personne${c.personnes > 1 ? "s" : ""} (recette prévue pour ${c.recette.portions}) : ${c.recette.ingredients.map((i) => `${i.quantite} ${i.nom}`.trim()).join(", ")}`)
    .join("\n");
  const connus = prix
    .slice(0, 250)
    .map((p) => `- ${p.nom} : ${euros(p.prixCents)} chez ${p.magasin}`)
    .join("\n");
  return `Fais la liste de courses de ces recettes, en adaptant les quantités au nombre de personnes :
${recettes}

Écris chaque article en unité d'achat du commerce (« Farine 1 kg » × 1, « Lardons 2 × 75 g » × 2), regroupe les ingrédients communs, choisis les formats les moins chers au kilo qui suffisent, sans acheter beaucoup trop. N'achète pas sel, poivre, huile ni épices courantes.${budgetCents !== null ? ` Vise un total d'environ ${euros(budgetCents)} si c'est raisonnable.` : ""}

PRIX DÉJÀ VUS (sers-t'en pour estimer) :
${connus || "- (aucun : estime des prix de supermarché français)"}

Réponds avec "courses" (nom, pour, unites, prixUnitaire en euros pour une unité) et "remarques" (une phrase).`;
}

export const SCHEMA_LISTE = {
  type: "object",
  properties: { courses: SCHEMA_PLAN.properties.courses, remarques: { type: "string" } },
  required: ["courses", "remarques"],
};

/** Lit la liste proposée pour des recettes (mêmes règles de lecture que pour un plan). */
export function lireListeIa(texte: string): { courses: PropositionPlan["courses"]; remarques: string } | string {
  let brut: unknown;
  try {
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    brut = JSON.parse(debut >= 0 && fin > debut ? texte.slice(debut, fin + 1) : texte);
  } catch {
    return "La réponse de l'IA est illisible : réessayez.";
  }
  if (typeof brut !== "object" || brut === null) return "La réponse de l'IA est illisible : réessayez.";
  // on réutilise la lecture d'un plan avec un unique repas factice : les lignes de courses sont lues et bornées de la même façon
  const jour = "2000-01-01" as Jour;
  const q: Questionnaire = { debut: jour, jours: 1, foyer: 1, cases: { [jour]: { matin: 0, midi: 1, soir: 0 } }, economieCents: 0, envies: "", preferences: PREFERENCES_DEFAUT };
  const lu = lirePlanIa(JSON.stringify({ ...(brut as object), repas: [{ jour, moment: "midi", plat: "liste", recette: "" }] }), q, []);
  if (typeof lu === "string") return lu;
  if (lu.courses.length === 0) return "L'IA n'a proposé aucun article : réessayez.";
  return { courses: lu.courses, remarques: lu.remarques };
}

/** Les objectifs de Santé sans l'historique des pesées (seul le dernier poids compte pour l'IA). */
function santeCourte(s: Record<string, unknown>): Record<string, unknown> {
  const { pesees, ...reste } = s;
  const dernier = Array.isArray(pesees) ? (pesees[pesees.length - 1] as { dixiemesKg?: number } | undefined) : undefined;
  return dernier?.dixiemesKg ? { ...reste, poidsKg: dernier.dixiemesKg / 10 } : reste;
}
