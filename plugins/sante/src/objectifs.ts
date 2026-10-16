// Les objectifs de santé, publiés pour les autres plugins (contrat `sante@1`) : Repas et recettes s'en sert pour concocter les repas.
// Lecture défensive : une valeur absente, fausse ou hors bornes reprend la valeur par défaut ; on ne publie que ce qui est propre.

export const REGIMES = ["omnivore", "flexitarien", "végétarien", "végétalien", "sans porc", "halal", "casher"] as const;
export const BUTS = ["manger équilibré", "perdre du poids", "prendre du muscle", "garder mon poids", "plus d'énergie"] as const;

export const SEXES = ["homme", "femme"] as const;
export const ACTIVITES = ["sédentaire", "léger", "modéré", "actif", "très actif"] as const;
const FACTEURS: Record<(typeof ACTIVITES)[number], number> = { sédentaire: 1.2, léger: 1.375, modéré: 1.55, actif: 1.725, "très actif": 1.9 };

/** Une pesée : le jour (AAAA-MM-JJ) et le poids en dixièmes de kilo (entier, pour éviter les arrondis). */
export interface Pesee {
  jour: string;
  dixiemesKg: number;
}

export interface Objectifs {
  sexe: (typeof SEXES)[number];
  /** Âge en années, taille en cm, poids visé en dixièmes de kilo ; 0 = non précisé. */
  age: number;
  tailleCm: number;
  poidsViseDixiemes: number;
  activite: (typeof ACTIVITES)[number];
  /** Pesées, de la plus ancienne à la plus récente, une par jour. */
  pesees: Pesee[];
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

export const OBJECTIFS_DEFAUT: Objectifs = { sexe: "homme", age: 0, tailleCm: 0, poidsViseDixiemes: 0, activite: "modéré", pesees: [], caloriesJour: 0, proteinesJour: 0, but: "manger équilibré", regime: "omnivore", allergies: "", eviter: "", aime: "", notes: "" };

const entier = (v: unknown, max: number): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : 0);
const texte = (v: unknown, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max) : "");
const parmi = <T extends string>(v: unknown, liste: readonly T[], defaut: T): T => ((liste as readonly unknown[]).includes(v) ? (v as T) : defaut);

export function nettoyer(enregistre: unknown): Objectifs {
  const o = typeof enregistre === "object" && enregistre !== null ? (enregistre as Record<string, unknown>) : {};
  const pesees = new Map<string, number>();
  for (const p of Array.isArray(o.pesees) ? o.pesees.slice(-1000) : []) {
    const x = typeof p === "object" && p !== null ? (p as Record<string, unknown>) : {};
    const kg = entier(x.dixiemesKg, 5000);
    if (typeof x.jour === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.jour) && kg >= 200) pesees.set(x.jour, kg);
  }
  return {
    sexe: parmi(o.sexe, SEXES, OBJECTIFS_DEFAUT.sexe),
    age: entier(o.age, 120),
    tailleCm: entier(o.tailleCm, 250),
    poidsViseDixiemes: entier(o.poidsViseDixiemes, 5000),
    activite: parmi(o.activite, ACTIVITES, OBJECTIFS_DEFAUT.activite),
    pesees: [...pesees].sort(([a], [b]) => a.localeCompare(b)).map(([jour, dixiemesKg]) => ({ jour, dixiemesKg })),
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

/** Le dernier poids connu, en kg, ou null. */
export const poidsActuel = (o: Objectifs): number | null => (o.pesees.length ? o.pesees[o.pesees.length - 1]!.dixiemesKg / 10 : null);

/** IMC (poids / taille²), arrondi au dixième, ou null s'il manque la taille ou le poids. */
export function imc(o: Objectifs): number | null {
  const kg = poidsActuel(o);
  return kg && o.tailleCm ? Math.round((kg / (o.tailleCm / 100) ** 2) * 10) / 10 : null;
}

/** Besoin calorique du jour (Mifflin-St Jeor × activité), ajusté au but ; null s'il manque âge, taille ou poids. */
export function besoinCalories(o: Objectifs): number | null {
  const kg = poidsActuel(o);
  if (!kg || !o.tailleCm || !o.age) return null;
  const base = 10 * kg + 6.25 * o.tailleCm - 5 * o.age + (o.sexe === "homme" ? 5 : -161);
  const ajustement = o.but === "perdre du poids" ? -400 : o.but === "prendre du muscle" ? 300 : 0;
  return Math.round((base * FACTEURS[o.activite] + ajustement) / 50) * 50;
}

/** Protéines conseillées (g/jour) selon le but. */
export function besoinProteines(o: Objectifs): number | null {
  const kg = poidsActuel(o);
  return kg ? Math.round(kg * (o.but === "prendre du muscle" ? 1.8 : o.but === "perdre du poids" ? 1.4 : 1)) : null;
}

/** Ajoute (ou remplace) la pesée d'un jour. */
export const peser = (o: Objectifs, jour: string, kg: number): Objectifs => nettoyer({ ...o, pesees: [...o.pesees.filter((p) => p.jour !== jour), { jour, dixiemesKg: Math.round(kg * 10) }] });

/** Les paramètres du plugin (Paramètres → Santé), tels que le moteur les donne ; mêmes valeurs par défaut que le manifeste. */
export const PARAMS_DEFAUT = { sexe: "homme", age: 0, taille: 0, poidsVise: 0, activite: "modéré", but: "manger équilibré", calories: 0, proteines: 0, regime: "omnivore", allergies: "", aime: "", eviter: "", notes: "" };
export type Parametres = typeof PARAMS_DEFAUT;

/**
 * Le profil vient des Paramètres. Un paramètre resté à sa valeur par défaut ne remplace pas ce qui était déjà saisi dans l'ancien
 * onglet « Profil » : rien de ce qu'on avait rempli ne se perd au passage.
 */
export function appliquerParametres(o: Objectifs, p: Partial<Parametres>): Objectifs {
  const v = { ...PARAMS_DEFAUT, ...p };
  const si = <T>(cle: keyof Parametres, valeur: T, avant: T): T => (v[cle] !== PARAMS_DEFAUT[cle] ? valeur : avant);
  return nettoyer({
    ...o,
    sexe: si("sexe", v.sexe, o.sexe),
    age: si("age", Number(v.age), o.age),
    tailleCm: si("taille", Number(v.taille), o.tailleCm),
    poidsViseDixiemes: si("poidsVise", Math.round(Number(v.poidsVise) * 10), o.poidsViseDixiemes),
    activite: si("activite", v.activite, o.activite),
    but: si("but", v.but, o.but),
    caloriesJour: si("calories", Number(v.calories), o.caloriesJour),
    proteinesJour: si("proteines", Number(v.proteines), o.proteinesJour),
    regime: si("regime", v.regime, o.regime),
    allergies: si("allergies", v.allergies, o.allergies),
    aime: si("aime", v.aime, o.aime),
    eviter: si("eviter", v.eviter, o.eviter),
    notes: si("notes", v.notes, o.notes),
  });
}

/** IMC d'il y a environ 30 jours (la pesée la plus proche), pour dire si l'on va dans le bon sens ; null sans historique. */
export function imcIlYa30Jours(o: Objectifs): number | null {
  if (o.pesees.length < 2 || !o.tailleCm) return null;
  const dernier = o.pesees[o.pesees.length - 1]!;
  const limite = new Date(Date.parse(dernier.jour) - 30 * 86_400_000).toISOString().slice(0, 10);
  const ref = o.pesees.find((p) => p.jour >= limite) ?? o.pesees[0]!;
  return ref === dernier ? null : Math.round((ref.dixiemesKg / 10 / (o.tailleCm / 100) ** 2) * 10) / 10;
}

/** La zone d'un IMC (seuils de l'OMS). */
export const zoneImc = (v: number): "maigreur" | "normal" | "surpoids" | "obésité" => (v < 18.5 ? "maigreur" : v < 25 ? "normal" : v < 30 ? "surpoids" : "obésité");

/** Ce que l'on mange en moyenne par portion, publié par Repas (service `repas@1`), s'il est installé. */
export interface Mange {
  kcal: number;
  proteines: number;
  glucides: number;
  lipides: number;
}

/**
 * Deux ou trois conseils simples, d'après l'IMC, son sens sur 30 jours, le but, et ce que l'on mange (si Repas le dit). Rien de médical :
 * des pistes de bon sens.
 */
export function conseils(o: Objectifs, mange: Mange | null): string[] {
  const sortie: string[] = [];
  const v = imc(o);
  const avant = imcIlYa30Jours(o);
  if (v !== null) {
    const z = zoneImc(v);
    const sens = avant === null ? 0 : Math.round((v - avant) * 10) / 10;
    if (z === "normal") sortie.push(sens > 0.5 ? "Ton IMC est bon, mais il monte depuis un mois : surveille les portions." : "Ton IMC est dans la zone normale : continue comme ça.");
    else if (z === "maigreur") sortie.push("Ton IMC est un peu bas : ajoute des collations nourrissantes (féculents, oléagineux, laitages).");
    else if (sens < 0) sortie.push(`Ton IMC baisse (${sens.toLocaleString("fr-FR")} en 30 jours) : tu es sur la bonne voie, garde le rythme.`);
    else sortie.push(z === "surpoids" ? "Ton IMC est un peu haut : des portions plus petites, plus de légumes, moins de gras et de sucre." : "Ton IMC est élevé : réduis le gras et le sucre, bouge un peu chaque jour, et parles-en à ton médecin.");
  } else sortie.push("Renseigne ta taille et pèse-toi pour avoir ton IMC et des conseils.");
  if (mange && mange.kcal > 0) {
    const besoin = o.proteinesJour || besoinProteines(o);
    const parRepas = besoin ? Math.round(besoin / 3) : 0;
    const partGras = (mange.lipides * 9) / mange.kcal;
    const partSucres = (mange.glucides * 4) / mange.kcal;
    if (parRepas && mange.proteines < parRepas * 0.8) sortie.push(`Tes repas manquent de protéines (${mange.proteines} g par portion, vise ${parRepas} g) : œufs, poulet, poisson, légumineuses, fromage blanc.`);
    if (partGras > 0.38) sortie.push(`Tes plats sont assez gras (${Math.round(partGras * 100)} % des calories) : moins de crème, de fromage et de friture.`);
    else if (partSucres > 0.6) sortie.push(`Tes plats sont riches en féculents (${Math.round(partSucres * 100)} % des calories) : remplace une partie par des légumes.`);
  }
  return sortie.slice(0, 3);
}
